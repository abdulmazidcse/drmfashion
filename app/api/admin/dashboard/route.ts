import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminPayload } from "@/lib/auth";
import { getLowStockThreshold } from "@/lib/inventory";

export const dynamic = "force-dynamic";

/**
 * Admin dashboard numbers for one period, compared with the period of the same
 * length right before it.
 *
 * Definitions (the old version mixed all-time totals with 7-day percentages,
 * divided paid revenue by all orders for AOV, and showed a hard-coded category
 * pie — every card was off in some way):
 *
 *   sales            Σ totalAmount of orders PLACED in the period, cancelled
 *                    ones left out. What came in — this is a COD shop, so most
 *                    of it is not money in hand yet.
 *   deliveredSales   Σ totalAmount of orders DELIVERED in the period (by
 *                    deliveredAt; createdAt for old rows that never got one).
 *                    The money that is actually earned. Refunded ones excluded.
 *   orders           orders placed in the period, cancelled ones left out.
 *   aov              sales ÷ orders.
 *   cancelRate       cancelled ÷ all orders placed in the period.
 *   customers        distinct buyers in the period; `newCustomers` are the ones
 *                    whose first-ever order falls inside it.
 *
 * Days are Bangladesh days (UTC+6, no DST) — the server runs in UTC, and
 * bucketing on UTC put every order between 00:00 and 06:00 on the wrong day.
 */

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const RANGES = ["today", "7d", "30d", "month", "year"] as const;
type Range = (typeof RANGES)[number];

/** Midnight (Bangladesh time) of the day `t` falls on, as a UTC instant. */
function bdDayStart(t: number) {
  return Math.floor((t + BD_OFFSET_MS) / DAY_MS) * DAY_MS - BD_OFFSET_MS;
}

/** Calendar fields of `t` as seen in Bangladesh. */
function bdParts(t: number) {
  const d = new Date(t + BD_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() };
}

/** UTC instant of Bangladesh midnight on y-m-d (month may overflow). */
function bdDate(y: number, m: number, day: number) {
  return Date.UTC(y, m, day) - BD_OFFSET_MS;
}

function periodFor(range: Range, now: number) {
  const todayStart = bdDayStart(now);
  const end = now;
  let start: number;
  switch (range) {
    case "today":
      start = todayStart;
      break;
    case "7d":
      start = todayStart - 6 * DAY_MS;
      break;
    case "30d":
      start = todayStart - 29 * DAY_MS;
      break;
    case "month": {
      const { y, m } = bdParts(now);
      start = bdDate(y, m, 1);
      break;
    }
    case "year": {
      const { y, m } = bdParts(now);
      start = bdDate(y, m - 11, 1);
      break;
    }
  }
  // The previous period is the same length, immediately before.
  const length = end - start;
  return { start, end, prevStart: start - length, prevEnd: start };
}

const notCancelled = { status: { not: "CANCELLED" as const } };
const deliveredWhere = (from: number, to: number): Prisma.OrderWhereInput => ({
  status: "DELIVERED",
  paymentStatus: { not: "REFUNDED" },
  OR: [
    { deliveredAt: { gte: new Date(from), lt: new Date(to) } },
    { deliveredAt: null, createdAt: { gte: new Date(from), lt: new Date(to) } },
  ],
});

async function periodMetrics(from: number, to: number) {
  const placed = { createdAt: { gte: new Date(from), lt: new Date(to) } };
  const [salesAgg, allCount, cancelledCount, deliveredAgg, buyers] = await Promise.all([
    prisma.order.aggregate({ where: { ...placed, ...notCancelled }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.count({ where: placed }),
    prisma.order.count({ where: { ...placed, status: "CANCELLED" } }),
    prisma.order.aggregate({ where: deliveredWhere(from, to), _sum: { totalAmount: true }, _count: true }),
    prisma.order.findMany({ where: { ...placed, ...notCancelled }, select: { userId: true }, distinct: ["userId"] }),
  ]);

  // A buyer is new if they have no order (of any status) before this period.
  const buyerIds = buyers.map((b) => b.userId);
  const returning = buyerIds.length
    ? await prisma.order.findMany({
        where: { userId: { in: buyerIds }, createdAt: { lt: new Date(from) } },
        select: { userId: true },
        distinct: ["userId"],
      })
    : [];

  const sales = salesAgg._sum.totalAmount || 0;
  const orders = salesAgg._count;
  return {
    sales,
    orders,
    aov: orders > 0 ? sales / orders : 0,
    deliveredSales: deliveredAgg._sum.totalAmount || 0,
    deliveredOrders: deliveredAgg._count,
    cancelledOrders: cancelledCount,
    cancelRate: allCount > 0 ? (cancelledCount / allCount) * 100 : 0,
    customers: buyerIds.length,
    newCustomers: buyerIds.length - returning.length,
  };
}

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const param = req.nextUrl.searchParams.get("range") as Range | null;
    const range: Range = param && RANGES.includes(param) ? param : "30d";
    const now = Date.now();
    const { start, end, prevStart, prevEnd } = periodFor(range, now);

    // Chart: daily buckets for the period ("today" alone would be one dot, so it
    // shows the last 7 days), monthly buckets for the 12-month view.
    const monthly = range === "year";
    const chartStart = range === "today" ? bdDayStart(now) - 6 * DAY_MS : start;

    const threshold = await getLowStockThreshold();
    // Same notion of "a sellable variant" as the inventory and low-stock pages.
    const liveVariant: Prisma.ProductVariantWhereInput = {
      deletedAt: null,
      product: { deletedAt: null, upcoming: false, category: { slug: { not: "gift-cards" } } },
    };

    const [current, previous, chartRows, periodItems, todo, recentOrders] = await Promise.all([
      periodMetrics(start, end),
      periodMetrics(prevStart, prevEnd),

      prisma.order.findMany({
        where: {
          OR: [
            { createdAt: { gte: new Date(chartStart), lt: new Date(end) } },
            deliveredWhere(chartStart, end),
          ],
        },
        select: { createdAt: true, deliveredAt: true, totalAmount: true, status: true, paymentStatus: true },
      }),

      prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: new Date(start), lt: new Date(end) }, ...notCancelled } },
        select: {
          quantity: true,
          price: true,
          customFee: true,
          variant: {
            select: { product: { select: { id: true, title: true, thumbnail: true, slug: true, categoryId: true } } },
          },
        },
      }),

      Promise.all([
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "PROCESSING" } }),
        prisma.order.count({ where: { status: "SHIPPED" } }),
        prisma.returnRequest.count({ where: { status: "PENDING" } }),
        // Products, not variants: one blazer in eight sizes would otherwise
        // count eight times, and the number stops meaning anything.
        prisma.productVariant
          .findMany({ where: { ...liveVariant, stock: { gt: 0, lte: threshold } }, select: { productId: true }, distinct: ["productId"] })
          .then((rows) => rows.length),
        prisma.productVariant
          .findMany({ where: { ...liveVariant, stock: { lte: 0 } }, select: { productId: true }, distinct: ["productId"] })
          .then((rows) => rows.length),
      ]),

      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          totalAmount: true,
          status: true,
          paymentStatus: true,
          source: true,
          user: { select: { name: true, phone: true } },
          shippingPhone: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

    // ── Chart buckets ────────────────────────────────────────────────────────
    const buckets: { key: string; label: string; sales: number; orders: number; delivered: number }[] = [];
    const keyOf = (t: number) => {
      const { y, m, day } = bdParts(t);
      return monthly ? `${y}-${m}` : `${y}-${m}-${day}`;
    };
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthly) {
      const { y, m } = bdParts(now);
      for (let i = 11; i >= 0; i--) {
        const t = bdDate(y, m - i, 1);
        const p = bdParts(t);
        buckets.push({ key: keyOf(t), label: `${MONTHS[p.m]} ${String(p.y).slice(2)}`, sales: 0, orders: 0, delivered: 0 });
      }
    } else {
      for (let t = bdDayStart(chartStart); t < end; t += DAY_MS) {
        const p = bdParts(t);
        buckets.push({ key: keyOf(t), label: `${p.day} ${MONTHS[p.m]}`, sales: 0, orders: 0, delivered: 0 });
      }
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const o of chartRows) {
      const placedAt = o.createdAt.getTime();
      if (placedAt >= chartStart && o.status !== "CANCELLED") {
        const b = byKey.get(keyOf(placedAt));
        if (b) {
          b.sales += o.totalAmount;
          b.orders += 1;
        }
      }
      if (o.status === "DELIVERED" && o.paymentStatus !== "REFUNDED") {
        const at = (o.deliveredAt ?? o.createdAt).getTime();
        if (at >= chartStart) {
          const b = byKey.get(keyOf(at));
          if (b) b.delivered += o.totalAmount;
        }
      }
    }

    // ── Sales by category and top products ───────────────────────────────────
    // By the product's own category (Blazer, Panjabi, Face Wash…), not the
    // top-level parent: nearly everything sits under "Men", so rolling up to
    // the root gave a one-slice pie.
    const categories = await prisma.category.findMany({ select: { id: true, name: true } });
    const catName = new Map(categories.map((c) => [c.id, c.name]));

    const catTotals = new Map<string, number>();
    const productTotals = new Map<string, { id: string; title: string; thumbnail: string; slug: string; qty: number; sales: number }>();
    for (const item of periodItems) {
      const product = item.variant?.product;
      if (!product) continue;
      const lineTotal = (item.price + (item.customFee || 0)) * item.quantity;
      const name = catName.get(product.categoryId) ?? "Uncategorized";
      catTotals.set(name, (catTotals.get(name) || 0) + lineTotal);

      const p = productTotals.get(product.id) ?? { id: product.id, title: product.title, thumbnail: product.thumbnail, slug: product.slug, qty: 0, sales: 0 };
      p.qty += item.quantity;
      p.sales += lineTotal;
      productTotals.set(product.id, p);
    }
    const categorySales = [...catTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const topProducts = [...productTotals.values()].sort((a, b) => b.qty - a.qty || b.sales - a.sales).slice(0, 5);

    const [pending, processing, shipped, pendingReturns, lowStock, outOfStock] = todo;

    return NextResponse.json({
      range,
      period: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
      current,
      previous,
      chart: { monthly, points: buckets.map(({ key: _key, ...rest }) => rest) },
      categorySales,
      topProducts,
      todo: { pending, processing, shipped, pendingReturns, lowStock, outOfStock, lowStockThreshold: threshold },
      recentOrders,
    });
  } catch (err) {
    console.error("Failed to load dashboard statistics:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
