import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { toCsv, csvResponse } from "@/lib/csv"

export const dynamic = "force-dynamic"

/**
 * Sales report: everything is derived from orders whose `status` is not
 * CANCELLED and whose `createdAt` falls inside the requested window. The
 * window is inclusive on both ends and expressed in UTC calendar days — the
 * same clock Postgres uses for `date_trunc` on the (timezone-less) column, so
 * the timeline buckets and the totals agree with each other.
 *
 * Amounts are in the store's base currency (the value `Order.totalAmount` is
 * stored in), so the UI renders them with `formatBasePrice`.
 */

type GroupBy = "day" | "week" | "month"
type Section = "summary" | "timeline" | "products" | "categories" | "brands" | "payments" | "status"

const GROUP_BY: GroupBy[] = ["day", "week", "month"]
const SECTIONS: Section[] = ["summary", "timeline", "products", "categories", "brands", "payments", "status"]
const DAY_MS = 86_400_000
const YMD = /^\d{4}-\d{2}-\d{2}$/

const ymd = (d: Date) => d.toISOString().slice(0, 10)

function parseYmd(raw: string | null): Date | null {
  if (!raw || !YMD.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) || ymd(d) !== raw ? null : d
}

/** Start of the bucket containing `d`, matching Postgres `date_trunc` (ISO weeks start Monday). */
function truncate(d: Date, groupBy: GroupBy): Date {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  if (groupBy === "month") t.setUTCDate(1)
  else if (groupBy === "week") t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7))
  return t
}

function nextPeriod(d: Date, groupBy: GroupBy): Date {
  const n = new Date(d)
  if (groupBy === "month") n.setUTCMonth(n.getUTCMonth() + 1)
  else n.setUTCDate(n.getUTCDate() + (groupBy === "week" ? 7 : 1))
  return n
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function periodLabel(d: Date, groupBy: GroupBy): string {
  const month = MONTHS[d.getUTCMonth()]
  if (groupBy === "month") return `${month} ${d.getUTCFullYear()}`
  const day = `${month} ${d.getUTCDate()}`
  return groupBy === "week" ? `Wk of ${day}` : day
}

const round2 = (n: number) => Math.round(n * 100) / 100

type Bucket = { qty: number; revenue: number; orderIds: Set<string> }
const bucket = (): Bucket => ({ qty: 0, revenue: 0, orderIds: new Set() })

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)

    const todayUtc = new Date(`${ymd(new Date())}T00:00:00.000Z`)
    const toParam = searchParams.get("to")
    const fromParam = searchParams.get("from")
    const to = toParam ? parseYmd(toParam) : todayUtc
    const from = fromParam ? parseYmd(fromParam) : new Date(todayUtc.getTime() - 29 * DAY_MS)
    if (!from || !to) {
      return NextResponse.json({ message: "Dates must be in YYYY-MM-DD format" }, { status: 400 })
    }
    if (from > to) {
      return NextResponse.json({ message: "'from' must not be after 'to'" }, { status: 400 })
    }
    if (to.getTime() - from.getTime() > 366 * 2 * DAY_MS) {
      return NextResponse.json({ message: "Date range may not exceed two years" }, { status: 400 })
    }

    const groupByParam = searchParams.get("groupBy") || "day"
    if (!GROUP_BY.includes(groupByParam as GroupBy)) {
      return NextResponse.json({ message: "groupBy must be day, week or month" }, { status: 400 })
    }
    const groupBy = groupByParam as GroupBy

    const format = searchParams.get("format") === "csv" ? "csv" : "json"
    const sectionParam = searchParams.get("section") || "summary"
    if (format === "csv" && !SECTIONS.includes(sectionParam as Section)) {
      return NextResponse.json({ message: `section must be one of ${SECTIONS.join(", ")}` }, { status: 400 })
    }
    const section = sectionParam as Section

    // End of the last day, inclusive.
    const rangeEnd = new Date(to.getTime() + DAY_MS - 1)
    const fromStr = ymd(from)
    const toStr = ymd(to)

    const [orders, refundAgg, timelineRows] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { not: "CANCELLED" },
          createdAt: { gte: from, lte: rangeEnd },
        },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          shippingFee: true,
          taxAmount: true,
          payment: { select: { provider: true } },
          items: {
            select: {
              variantId: true,
              quantity: true,
              price: true,
              variant: {
                select: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      thumbnail: true,
                      costPrice: true,
                      category: { select: { name: true } },
                      brand: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.returnRequest.aggregate({
        _sum: { refundAmount: true },
        where: { refundedAt: { gte: from, lte: rangeEnd } },
      }),

      // Bucketed in the database so a year of daily rows is one round trip.
      prisma.$queryRaw<{ period: Date; orders: number; revenue: number; items: number }[]>`
        SELECT
          date_trunc(${groupBy}, o."createdAt") AS period,
          COUNT(*)::int AS orders,
          COALESCE(SUM(o."totalAmount"), 0)::float8 AS revenue,
          COALESCE(SUM(i.qty), 0)::int AS items
        FROM "Order" o
        LEFT JOIN (
          SELECT "orderId", SUM("quantity") AS qty
          FROM "OrderItem"
          GROUP BY "orderId"
        ) i ON i."orderId" = o."id"
        WHERE o."status" <> 'CANCELLED'
          AND o."createdAt" >= ${from}
          AND o."createdAt" <= ${rangeEnd}
        GROUP BY 1
        ORDER BY 1
      `,
    ])

    // ─── Summary + breakdowns (one pass over the orders) ─────────────────────
    let revenue = 0
    let itemsSold = 0
    let tax = 0
    let shipping = 0
    let grossProfit = 0
    let unitsWithCost = 0

    type ProductAgg = Bucket & { productId: string; title: string; thumbnail: string; skus: Set<string> }
    const products = new Map<string, ProductAgg>()
    const categories = new Map<string, Bucket>()
    const brands = new Map<string, Bucket>()
    const payments = new Map<string, { orders: number; revenue: number }>()
    const statuses = new Map<string, { orders: number; revenue: number }>()

    const add = (map: Map<string, Bucket>, key: string, orderId: string, qty: number, amount: number) => {
      const b = map.get(key) ?? bucket()
      b.qty += qty
      b.revenue += amount
      b.orderIds.add(orderId)
      map.set(key, b)
    }

    for (const order of orders) {
      revenue += order.totalAmount
      tax += order.taxAmount
      shipping += order.shippingFee

      const method = order.payment?.provider || "cod"
      const pay = payments.get(method) ?? { orders: 0, revenue: 0 }
      pay.orders += 1
      pay.revenue += order.totalAmount
      payments.set(method, pay)

      const st = statuses.get(order.status) ?? { orders: 0, revenue: 0 }
      st.orders += 1
      st.revenue += order.totalAmount
      statuses.set(order.status, st)

      for (const item of order.items) {
        const product = item.variant.product
        const lineRevenue = item.price * item.quantity
        itemsSold += item.quantity

        if (product.costPrice !== null) unitsWithCost += item.quantity
        grossProfit += (item.price - (product.costPrice ?? 0)) * item.quantity

        const p =
          products.get(product.id) ??
          { ...bucket(), productId: product.id, title: product.title, thumbnail: product.thumbnail, skus: new Set<string>() }
        p.qty += item.quantity
        p.revenue += lineRevenue
        p.orderIds.add(order.id)
        p.skus.add(item.variantId)
        products.set(product.id, p)

        add(categories, product.category?.name || "Uncategorized", order.id, item.quantity, lineRevenue)
        add(brands, product.brand?.name || "No brand", order.id, item.quantity, lineRevenue)
      }
    }

    const refunds = refundAgg._sum.refundAmount || 0
    const orderCount = orders.length

    const summary = {
      from: fromStr,
      to: toStr,
      orders: orderCount,
      revenue: round2(revenue),
      itemsSold,
      averageOrderValue: orderCount > 0 ? round2(revenue / orderCount) : 0,
      tax: round2(tax),
      shipping: round2(shipping),
      refunds: round2(refunds),
      netRevenue: round2(revenue - refunds),
      grossProfit: round2(grossProfit),
      // Share of units sold whose product has a cost price — a gross profit
      // figure with low coverage is mostly revenue, not margin.
      costCoverage: itemsSold > 0 ? round2(unitsWithCost / itemsSold) : 0,
    }

    // ─── Timeline, with empty buckets filled in ──────────────────────────────
    const byPeriod = new Map(timelineRows.map((r) => [ymd(r.period), r]))
    const timeline: { period: string; label: string; orders: number; revenue: number; items: number }[] = []
    for (let cursor = truncate(from, groupBy); cursor <= rangeEnd; cursor = nextPeriod(cursor, groupBy)) {
      const key = ymd(cursor)
      const row = byPeriod.get(key)
      timeline.push({
        period: key,
        label: periodLabel(cursor, groupBy),
        orders: row?.orders ?? 0,
        revenue: round2(row?.revenue ?? 0),
        items: row?.items ?? 0,
      })
    }

    const byRevenue = <T extends { revenue: number }>(a: T, b: T) => b.revenue - a.revenue

    const topProducts = Array.from(products.values())
      .map((p) => ({
        productId: p.productId,
        title: p.title,
        thumbnail: p.thumbnail,
        skuCount: p.skus.size,
        orders: p.orderIds.size,
        qty: p.qty,
        revenue: round2(p.revenue),
      }))
      .sort(byRevenue)
      .slice(0, 20)

    const flatten = (map: Map<string, Bucket>, key: "category" | "brand") =>
      Array.from(map.entries())
        .map(([name, b]) => ({ [key]: name, orders: b.orderIds.size, qty: b.qty, revenue: round2(b.revenue) }))
        .sort(byRevenue)

    const byCategory = flatten(categories, "category")
    const byBrand = flatten(brands, "brand")
    const byPaymentMethod = Array.from(payments.entries())
      .map(([method, v]) => ({ method, orders: v.orders, revenue: round2(v.revenue) }))
      .sort(byRevenue)
    const byStatus = Array.from(statuses.entries())
      .map(([status, v]) => ({ status, orders: v.orders, revenue: round2(v.revenue) }))
      .sort(byRevenue)

    if (format === "csv") {
      let rows: Record<string, unknown>[]
      let columns: string[] | undefined
      switch (section) {
        case "timeline":
          rows = timeline
          columns = ["period", "label", "orders", "revenue", "items"]
          break
        case "products":
          rows = topProducts
          columns = ["productId", "title", "skuCount", "orders", "qty", "revenue"]
          break
        case "categories":
          rows = byCategory
          break
        case "brands":
          rows = byBrand
          break
        case "payments":
          rows = byPaymentMethod
          break
        case "status":
          rows = byStatus
          break
        default:
          rows = Object.entries(summary).map(([metric, value]) => ({ metric, value }))
      }
      return csvResponse(toCsv(rows, columns), `sales-${section}-${fromStr}-${toStr}.csv`)
    }

    return NextResponse.json({
      range: { from: fromStr, to: toStr, groupBy },
      summary,
      timeline,
      topProducts,
      byCategory,
      byBrand,
      byPaymentMethod,
      byStatus,
    })
  } catch (e) {
    console.error("[ADMIN_REPORTS_SALES]", e)
    return NextResponse.json({ message: "Failed to build sales report" }, { status: 500 })
  }
}
