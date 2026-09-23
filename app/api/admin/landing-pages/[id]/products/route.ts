import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

type Params = {
  params: Promise<{ id: string }>
}

/**
 * Replace the landing page's featured products. The array order is the
 * display order, so each id's index becomes its `sortOrder`.
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

    const landingPage = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } })
    if (!landingPage) {
      return NextResponse.json({ message: "Landing page not found" }, { status: 404 })
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
      prisma.landingPageProduct.deleteMany({ where: { landingPageId: id } }),
      prisma.landingPageProduct.createMany({
        data: orderedIds.map((productId, index) => ({
          landingPageId: id,
          productId,
          sortOrder: index,
        })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({ success: true, count: orderedIds.length })
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_PRODUCTS_PUT]", error)
    return NextResponse.json({ message: "Failed to update landing page products" }, { status: 500 })
  }
}
