import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendShippingUpdateEmail } from "@/lib/email"

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

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, paymentStatus } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existingOrder) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

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

    // Send shipping/status update email (non-blocking)
    if (status && ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status)) {
      try {
        const fullOrder = await prisma.order.findUnique({
          where: { id },
          include: { user: { select: { name: true, email: true } } },
        })
        if (fullOrder?.user?.email) {
          await sendShippingUpdateEmail(fullOrder.user.email, {
            customerName: fullOrder.user.name,
            orderId: fullOrder.id,
            status,
          })
        }
      } catch (emailErr) {
        console.error("[ORDER_STATUS_EMAIL_ERROR]", emailErr)
      }
    }

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
