import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import {
  STEADFAST_CARRIER_NAME,
  SteadfastError,
  createConsignment,
  currentBalance,
  normalizeBdPhone,
  statusByInvoice,
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
 * GET /api/admin/deliveries/steadfast?orderId=…  → { sent, status } straight from Steadfast
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

    if (!steadfastConfigured()) return NextResponse.json({ sent: false, configured: false })
    // Asked of Steadfast itself (the order id is the invoice), so a carrier
    // and tracking number typed in by hand never count as "sent".
    const status = await statusByInvoice(orderId)
    return NextResponse.json({ sent: status !== null, status })
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
        deliveryNote: true,
        user: { select: { name: true } },
      },
    })
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 })

    // One consignment per order: a second click must not book a second
    // pickup. Checked with Steadfast by invoice — the order's own carrier /
    // tracking fields can be typed by hand and prove nothing.
    const existing = await statusByInvoice(order.id)
    if (existing !== null) {
      return NextResponse.json(
        { message: `Already sent to Steadfast (status: ${existing.replace(/_/g, " ")}).` },
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
