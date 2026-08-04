import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check order exists and is PENDING
    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 })
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only PENDING orders can be cancelled." },
        { status: 400 }
      )
    }

    // Restore stock for each item
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: id },
      include: { variant: true }
    })

    await prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        const newStock = item.variant.stock + item.quantity
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock }
        })
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            previousStock: item.variant.stock,
            newStock,
            note: `Stock restored due to order #${id.slice(-8)} cancellation.`
          }
        })
      }

      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" }
      })
    })

    // Send cancellation email
    try {
      const { sendShippingUpdateEmail } = await import("@/lib/email")
      const user = await prisma.user.findUnique({ where: { id: order.userId } })
      if (user?.email) {
        await sendShippingUpdateEmail(user.email, {
          customerName: user.name,
          orderId: order.id,
          status: "CANCELLED",
        })
      }
    } catch (emailErr) {
      console.error("[CANCEL_EMAIL_ERROR]", emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[ORDER_CANCEL_ERROR]", error)
    return NextResponse.json({ message: error.message || "Failed to cancel" }, { status: 500 })
  }
}
