import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

type Params = {
  params: Promise<{
    id: string
  }>
}

// DELETE /api/admin/skus/[id] — permanently remove one variant row.
// Order and purchase lines pin the row for history, so those block the delete
// and the message says exactly where the SKU is still used. Live shopper state
// (carts, wishlists, stock alerts) and inventory logs are cleaned up silently,
// matching the product delete flow.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn("[ADMIN_GUARD_SKU_DELETE]", err.message)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      select: { id: true, sku: true },
    })
    if (!variant) {
      return NextResponse.json({ message: "SKU not found" }, { status: 404 })
    }

    const [orderLines, purchaseLines] = await Promise.all([
      prisma.orderItem.count({ where: { variantId: id } }),
      prisma.purchaseOrderItem.count({ where: { variantId: id } }),
    ])

    if (orderLines > 0 || purchaseLines > 0) {
      const usedIn = [
        orderLines > 0 ? `${orderLines} order line(s)` : null,
        purchaseLines > 0 ? `${purchaseLines} purchase line(s)` : null,
      ].filter(Boolean).join(" and ")
      return NextResponse.json(
        { message: `Cannot delete "${variant.sku}": it is used in ${usedIn}. Those records must stay for history.` },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { variantId: id } })
      await tx.wishlistItem.deleteMany({ where: { variantId: id } })
      await tx.stockAlert.deleteMany({ where: { variantId: id } })
      await tx.inventoryLog.deleteMany({ where: { variantId: id } })
      await tx.productVariant.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, message: `"${variant.sku}" permanently deleted.` })
  } catch (error) {
    console.error("[SKU_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Failed to delete SKU" }, { status: 500 })
  }
}
