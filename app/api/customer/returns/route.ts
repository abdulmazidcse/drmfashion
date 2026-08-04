import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST — Customer submits a return request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, userId, reason } = body

    if (!orderId || !userId || !reason) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Verify order belongs to user and is DELIVERED
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, status: "DELIVERED" },
      include: { items: { select: { isCustom: true } } }
    })

    if (!order) {
      return NextResponse.json({ message: "Order not found or not eligible for return. Only delivered orders can be returned." }, { status: 400 })
    }

    // Made-to-measure garments are cut to the customer's own measurements and
    // cannot be resold, so they are excluded from returns.
    const customCount = order.items.filter((i) => i.isCustom).length
    if (customCount > 0 && customCount === order.items.length) {
      return NextResponse.json(
        { message: "Made-to-measure items are cut to your measurements and cannot be returned or exchanged." },
        { status: 400 }
      )
    }

    // Check if a return request already exists for this order
    const existing = await prisma.returnRequest.findFirst({
      where: { orderId }
    })
    if (existing) {
      return NextResponse.json({ message: "A return request for this order already exists." }, { status: 400 })
    }

    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId,
        userId,
        // Mixed order: flag for the admin that the custom lines aren't refundable.
        reason: customCount > 0
          ? `${reason}\n\n[Note: ${customCount} made-to-measure item(s) in this order are not returnable.]`
          : reason,
      }
    })

    return NextResponse.json({ success: true, id: returnReq.id }, { status: 201 })
  } catch (error: any) {
    console.error("[CUSTOMER_RETURNS_POST_ERROR]", error)
    return NextResponse.json({ message: error.message || "Failed to submit return" }, { status: 500 })
  }
}

// GET — Customer views their return requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) return NextResponse.json({ message: "userId required" }, { status: 400 })

    const returns = await prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: { select: { id: true, totalAmount: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(returns)
  } catch (error) {
    return NextResponse.json({ message: "Failed to load returns" }, { status: 500 })
  }
}
