import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { HOME_BRANDS_CACHE_KEY } from "@/lib/brands"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, slug, image, description } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name and Slug are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.brand.findFirst({
      where: { slug, NOT: { id } },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Slug already exists" },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: { name, slug, image: image || null, description: description || null },
    })

    await invalidateCache(HOME_BRANDS_CACHE_KEY)
    return NextResponse.json(brand)
  } catch (error) {
    console.log("[BRAND_PATCH]", error)
    return NextResponse.json(
      { message: "Update failed" },
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

    const productCount = await prisma.product.count({
      where: { brandId: id },
    })

    if (productCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete: ${productCount} product(s) are linked to this brand. Reassign them first.`,
        },
        { status: 409 }
      )
    }

    await prisma.brand.delete({ where: { id } })
    await invalidateCache(HOME_BRANDS_CACHE_KEY)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[BRAND_DELETE]", error)
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    )
  }
}
