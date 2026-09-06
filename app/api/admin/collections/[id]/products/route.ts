import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateCollectionCaches } from "@/lib/collectionCache"

type Params = {
  params: Promise<{ id: string }>
}

/**
 * Replace the collection's membership. The array order is the display order,
 * so each id's index becomes its `sortOrder`.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const rawIds = body?.productIds

    if (!Array.isArray(rawIds) || rawIds.some((p) => typeof p !== "string")) {
      return NextResponse.json({ message: "productIds must be an array of ids" }, { status: 400 })
    }

    // Duplicates would violate the composite primary key; keep first occurrence.
    const productIds: string[] = Array.from(new Set<string>(rawIds))

    const collection = await prisma.collection.findUnique({ where: { id }, select: { slug: true } })
    if (!collection) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    // Only attach products that actually exist (and are not soft-deleted) so a
    // stale id from the picker cannot fail the whole save.
    const existing = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
      select: { id: true },
    })
    const validIds = new Set(existing.map((p) => p.id))
    const orderedIds = productIds.filter((pid) => validIds.has(pid))

    await prisma.$transaction([
      prisma.collectionProduct.deleteMany({ where: { collectionId: id } }),
      prisma.collectionProduct.createMany({
        data: orderedIds.map((productId, index) => ({
          collectionId: id,
          productId,
          sortOrder: index,
        })),
        skipDuplicates: true,
      }),
    ])

    await invalidateCollectionCaches([collection.slug])

    return NextResponse.json({ success: true, count: orderedIds.length })
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_PRODUCTS_PUT]", error)
    return NextResponse.json({ message: "Failed to update collection products" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const productId = body?.productId

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ message: "productId is required" }, { status: 400 })
    }

    const collection = await prisma.collection.findUnique({ where: { id }, select: { slug: true } })
    if (!collection) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    await prisma.collectionProduct.deleteMany({
      where: { collectionId: id, productId },
    })

    await invalidateCollectionCaches([collection.slug])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_PRODUCTS_DELETE]", error)
    return NextResponse.json({ message: "Failed to remove product" }, { status: 500 })
  }
}
