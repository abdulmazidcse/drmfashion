import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rateLimit"

/**
 * Public order tracking — no login required.
 *
 *   ?orderId=<full id | short order number from the email, e.g. #A1B2C3D4>
 *   ?phone=<shipping phone>            → list of that phone's recent orders
 *   ?orderId=…&phone=…                 → order detail, phone must match
 *
 * Guests only ever have the short number printed on their confirmation email
 * (`#${id.slice(-8).toUpperCase()}`), so that form is accepted everywhere.
 */

/** Digits only — stored phones vary ("+880 1821915515" vs "+880 01821915515"). */
function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "")
}

/** Last 9 digits: ignores country code and the optional national leading zero. */
function phoneKey(raw: string) {
  return normalizePhone(raw).slice(-9)
}

function shortNumber(id: string) {
  return id.slice(-8).toUpperCase()
}

function buildStages(status: string) {
  return [
    { key: "PENDING", label: "Order Placed", desc: "We have received your order details and are preparing to process it.", completed: true, active: status === "PENDING" },
    { key: "PROCESSING", label: "Processing", desc: "Your items are being packed, quality-checked, and loaded for shipping.", completed: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(status), active: status === "PROCESSING" },
    { key: "SHIPPED", label: "Shipped & In Transit", desc: "Your package has been dispatched and is currently on its way to your destination.", completed: ["SHIPPED", "DELIVERED"].includes(status), active: status === "SHIPPED" },
    { key: "DELIVERED", label: "Delivered", desc: "The package has been successfully delivered and signed for.", completed: status === "DELIVERED", active: status === "DELIVERED" },
  ]
}

/** Order ids whose shipping phone matches, newest first. Normalised in SQL so stored formatting doesn't matter. */
async function findOrderIdsByPhone(phone: string, limit: number): Promise<string[]> {
  const key = phoneKey(phone)
  if (key.length < 6) return []
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Order"
    WHERE RIGHT(REGEXP_REPLACE("shippingPhone", '\\D', '', 'g'), 9) = ${key}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `
  return rows.map(r => r.id)
}

export async function GET(req: NextRequest) {
  try {
    // The short order number is only 8 characters, so throttle guessing.
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").toString().split(",")[0].trim()
    const { success } = rateLimit(`track:${ip}`, 30, 10 * 60 * 1000)
    if (!success) {
      return NextResponse.json({ found: false, message: "Too many tracking attempts. Please try again in a few minutes." }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const rawOrderId = (searchParams.get("orderId") || "").trim().replace(/^#/, "")
    const rawPhone = (searchParams.get("phone") || "").trim()

    if (!rawOrderId && !rawPhone) {
      return NextResponse.json({ found: false, message: "Enter your order number or the phone number used on the order." }, { status: 400 })
    }

    // ─── Phone only → list that phone's orders (no address / items exposed) ───
    if (!rawOrderId) {
      if (phoneKey(rawPhone).length < 6) {
        return NextResponse.json({ found: false, message: "Please enter a complete phone number." })
      }

      const ids = await findOrderIdsByPhone(rawPhone, 10)
      if (ids.length === 0) {
        return NextResponse.json({ found: false, message: "No orders found for this phone number. Check the number, or try your order number instead." })
      }

      const orders = await prisma.order.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, totalAmount: true, createdAt: true,
          currencyCode: true, currencySymbol: true, exchangeRate: true,
          _count: { select: { items: true } },
        },
      })

      return NextResponse.json({
        found: true,
        matchedBy: "phone",
        orders: orders.map(o => ({
          id: o.id,
          number: shortNumber(o.id),
          status: o.status,
          totalAmount: o.totalAmount,
          currencyCode: o.currencyCode,
          currencySymbol: o.currencySymbol,
          exchangeRate: o.exchangeRate,
          createdAt: o.createdAt,
          itemCount: o._count.items,
        })),
      })
    }

    // ─── Order number (full id or the 8-char short number) ────────────────────
    let order = await prisma.order.findUnique({
      where: { id: rawOrderId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    })

    if (!order && /^[a-z0-9]{6,12}$/i.test(rawOrderId)) {
      const matches = await prisma.order.findMany({
        where: { id: { endsWith: rawOrderId.toLowerCase() } },
        include: { items: { include: { variant: { include: { product: true } } } } },
        take: 2,
      })
      // Ambiguous short numbers are effectively impossible, but never guess.
      if (matches.length === 1) order = matches[0]
    }

    if (!order) {
      return NextResponse.json({ found: false, message: "Order not found. Please double-check the order number from your confirmation email." })
    }

    // When a phone is supplied alongside the number, it has to match the order.
    if (rawPhone && phoneKey(rawPhone) !== phoneKey(order.shippingPhone)) {
      return NextResponse.json({ found: false, message: "That phone number doesn't match this order." })
    }

    return NextResponse.json({
      found: true,
      matchedBy: "orderId",
      order: {
        id: order.id,
        number: shortNumber(order.id),
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        shippingPhone: order.shippingPhone,
        shippingCarrier: order.shippingCarrier,
        shippingMethod: order.shippingMethod,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        currencyCode: order.currencyCode,
        currencySymbol: order.currencySymbol,
        exchangeRate: order.exchangeRate,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          productTitle: item.variant.product.title,
          thumbnail: item.variant.product.thumbnail,
          color: item.variant.color,
          size: item.variant.size,
          length: item.variant.length,
        })),
      },
      stages: buildStages(order.status),
    })

  } catch (error) {
    console.error("[ORDER_TRACKING_GET_ERROR]", error)
    return NextResponse.json({ error: "Server error querying order tracking details." }, { status: 500 })
  }
}
