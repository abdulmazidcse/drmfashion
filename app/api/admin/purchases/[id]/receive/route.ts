import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Fetch the purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ message: "Purchase Order not found" }, { status: 404 })
    }

    if (purchaseOrder.status === 'RECEIVED') {
      return NextResponse.json({ message: "Purchase Order is already received" }, { status: 400 })
    }

    // Run in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update PO status
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' }
      })

      // 2. Increment stock and create inventory logs
      for (const item of purchaseOrder.items) {
        // Fetch current variant
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        })

        if (!variant) continue

        const previousStock = variant.stock
        const newStock = previousStock + item.quantity

        // Update variant stock
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock }
        })

        // Log the change
        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            previousStock,
            newStock,
            note: `Restock from PO: ${id}`
          }
        })
      }
    })

    return NextResponse.json({ success: true, message: "Purchase Order marked as received and stock updated" })
  } catch (error: any) {
    console.error("[PURCHASES_RECEIVE_POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
