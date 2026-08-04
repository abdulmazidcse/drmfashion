import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = {
  params: Promise<{ id: string }>
}

// Public invoice API — returns order data for the customer invoice page.
// No auth check: the order ID is unguessable (cuid), which is sufficient
// as a read-only invoice token for the customer.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        payment: { select: { provider: true, transactionId: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { title: true, thumbnail: true } },
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[CUSTOMER_INVOICE_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to fetch invoice." }, { status: 500 })
  }
}
