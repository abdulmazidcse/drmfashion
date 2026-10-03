import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import {
  STEADFAST_CARRIER_NAME,
  SteadfastError,
  createConsignment,
  currentBalance,
  normalizeBdPhone,
  statusByTrackingCode,
  steadfastConfigured,
  steadfastTrackingUrl,
} from "@/lib/steadfast"

async function requireAdmin(req: NextRequest) {
  try {
    await getAdminPayload(req)
    return null
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

function failure(e: unknown, tag: string, fallback: string) {
  if (e instanceof SteadfastError) {
    return NextResponse.json({ message: e.message }, { status: 502 })
  }
  console.error(tag, e)
  return NextResponse.json({ message: fallback }, { status: 500 })
}

/**
 * GET /api/admin/deliveries/steadfast            → { configured, balance? }
 * GET /api/admin/deliveries/steadfast?orderId=…  → live Steadfast status for that order
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const orderId = req.nextUrl.searchParams.get("orderId")
  try {
    if (!orderId) {
      if (!steadfastConfigured()) return NextResponse.json({ configured: false })
      return NextResponse.json({ configured: true, balance: await currentBalance() })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shippingCarrier: true, trackingNumber: true },
    })
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 })
    if (order.shippingCarrier !== STEADFAST_CARRIER_NAME || !order.trackingNumber) {
      return NextResponse.json({ message: "This order has not been sent to Steadfast." }, { status: 400 })
    }
    const status = await statusByTrackingCode(order.trackingNumber)
    return NextResponse.json({ status, trackingCode: order.trackingNumber })
  } catch (e) {
    return failure(e, "[STEADFAST_STATUS_ERROR]", "Failed to read Steadfast status.")
  }
}

/**
 * POST /api/admin/deliveries/steadfast { orderId, note? }
 *
 * Books a Steadfast consignment for the order and stores the carrier, tracking
 * code and tracking link on it. The order's own status is left alone — the
 * admin still marks it shipped when the parcel is handed over — so booking a
 * pickup never sends the customer a "shipped" email early.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({}))
    const orderId = typeof body?.orderId === "string" ? body.orderId : ""
    if (!orderId) return NextResponse.json({ message: "orderId is required" }, { status: 400 })

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        shippingPhone: true,
        shippingAddress: true,
        shippingCarrier: true,
        trackingNumber: true,
        deliveryNote: true,
        user: { select: { name: true } },
      },
    })
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 })

    // One consignment per order: a second click must not book a second pickup.
    if (order.shippingCarrier === STEADFAST_CARRIER_NAME && order.trackingNumber) {
      return NextResponse.json(
        { message: `Already sent to Steadfast (tracking ${order.trackingNumber}).` },
        { status: 409 }
      )
    }
    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      return NextResponse.json({ message: `A ${order.status.toLowerCase()} order cannot be sent.` }, { status: 400 })
    }

    const phone = normalizeBdPhone(order.shippingPhone)
    if (!phone) {
      return NextResponse.json(
        { message: `"${order.shippingPhone}" is not a valid Bangladeshi mobile number. Fix it on the order first.` },
        { status: 400 }
      )
    }
    if (!order.shippingAddress?.trim()) {
      return NextResponse.json({ message: "The order has no shipping address." }, { status: 400 })
    }

    // Prepaid orders collect nothing at the door; everything else collects
    // the full order total (stored in Taka, the store's base currency).
    const codAmount = order.paymentStatus === "PAID" ? 0 : order.totalAmount
    const note =
      (typeof body?.note === "string" && body.note.trim()) || order.deliveryNote || undefined

    const consignment = await createConsignment({
      invoice: order.id,
      recipientName: order.user?.name || "Customer",
      recipientPhone: phone,
      recipientAddress: order.shippingAddress,
      codAmount,
      note,
    })

    const trackingUrl = steadfastTrackingUrl(consignment.tracking_code)
    await prisma.order.update({
      where: { id: order.id },
      data: {
        shippingCarrier: STEADFAST_CARRIER_NAME,
        trackingNumber: consignment.tracking_code,
        trackingUrl,
      },
    })

    return NextResponse.json({
      message: "Sent to Steadfast",
      consignmentId: consignment.consignment_id,
      trackingCode: consignment.tracking_code,
      trackingUrl,
      status: consignment.status,
      codAmount,
    })
  } catch (e) {
    return failure(e, "[STEADFAST_CREATE_ERROR]", "Failed to send the order to Steadfast.")
  }
}
