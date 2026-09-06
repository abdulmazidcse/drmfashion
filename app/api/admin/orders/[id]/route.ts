import { NextRequest, NextResponse } from "next/server"
import type { PaymentStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { isOrderStatus, type OrderStatusValue } from "@/lib/delivery"
import { deliveryStatusData, notifyOrderStatus, resolveTrackingUrl } from "@/lib/deliveryUpdate"
import { postOrderPaymentEntry } from "@/lib/accounting"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[ADMIN_ORDER_GET_ERROR]", error)
    return NextResponse.json(
      { message: "Failed to fetch order details." },
      { status: 500 }
    )
  }
}

/** Trimmed string from a body value; empty for anything that isn't one. */
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { paymentStatus } = body

    if (body.status && !isOrderStatus(body.status)) {
      return NextResponse.json({ message: "Invalid order status." }, { status: 400 })
    }
    const status = body.status as OrderStatusValue | undefined

    const updateData: Prisma.OrderUncheckedUpdateInput = {}
    if (paymentStatus) updateData.paymentStatus = paymentStatus as PaymentStatus

    // Delivery fields are only touched when the key is present, so the
    // status-only callers (the orders table dropdown) leave them alone.
    if ("shippingCarrier" in body) updateData.shippingCarrier = text(body.shippingCarrier) || null
    if ("trackingNumber" in body) updateData.trackingNumber = text(body.trackingNumber) || null
    if ("trackingUrl" in body) updateData.trackingUrl = text(body.trackingUrl) || null
    if ("deliveryNote" in body) updateData.deliveryNote = text(body.deliveryNote) || null
    if ("estimatedDeliveryAt" in body) {
      if (body.estimatedDeliveryAt === null || body.estimatedDeliveryAt === "") {
        updateData.estimatedDeliveryAt = null
      } else {
        const parsed = new Date(body.estimatedDeliveryAt)
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ message: "Invalid estimated delivery date." }, { status: 400 })
        }
        updateData.estimatedDeliveryAt = parsed
      }
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    // Tracking link: when a number is supplied without an explicit URL, build
    // one from the carrier's template in settings.
    const trackingTouched = "trackingNumber" in body || "shippingCarrier" in body
    if (trackingTouched && !updateData.trackingUrl) {
      const carrierName = "shippingCarrier" in body ? text(body.shippingCarrier) : existingOrder.shippingCarrier
      const trackingNumber = "trackingNumber" in body ? text(body.trackingNumber) : existingOrder.trackingNumber
      if (trackingNumber) {
        const resolved = await resolveTrackingUrl(carrierName, trackingNumber)
        if (resolved) updateData.trackingUrl = resolved
      }
    }

    // Stamp shippedAt / deliveredAt on the matching transitions.
    if (status) Object.assign(updateData, deliveryStatusData(status, existingOrder))

    const order = await prisma.$transaction(async (tx) => {
      // Restore stock if transitioning to CANCELLED from a non-cancelled state
      if (status === "CANCELLED" && existingOrder.status !== "CANCELLED") {
        for (const item of existingOrder.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })

          await tx.inventoryLog.create({
             data: {
                variantId: item.variantId,
                previousStock: 0, // Not keeping strict track of before in this quick log, just tracking the action
                newStock: item.quantity,
                note: `Restocked ${item.quantity} units from cancelled Order ${id}`
             }
          })
        }
      }

      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: {
          payment: true,
        },
      })

      return updated
    })

    // Sync Payment record if Payment status changed to PAID and payment model exists
    if (paymentStatus && order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: paymentStatus },
      })
    }

    // Settle the receivable in the ledger when the order becomes paid (non-blocking)
    if (paymentStatus === "PAID" && existingOrder.paymentStatus !== "PAID") {
      try {
        await postOrderPaymentEntry(id)
      } catch (e) {
        console.error("[ACCOUNTING_POST_ERROR]", e)
      }
    }

    // Send shipping/status update email (non-blocking; never throws)
    if (status) await notifyOrderStatus(id, status)

    return NextResponse.json(order)
  } catch (error) {
    console.error("[ADMIN_ORDER_PATCH_ERROR]", error)
    return NextResponse.json(
      { message: "Failed to update order status details." },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated payment details
      await tx.payment.deleteMany({
        where: { orderId: id },
      })

      // 2. Delete order items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      })

      // 3. Delete order
      await tx.order.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_ORDER_DELETE_ERROR]", error)
    return NextResponse.json(
      { message: "Failed to delete order. Active db constraints exist." },
      { status: 500 }
    )
  }
}
