import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatProductUrls } from "@/lib/utils"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        variants: true,
        category: true,
        brand: true,
      },
    })

    if (!product) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 })
    }

    // Return public-safe product shape (omit internal-only fields) and format relative image paths
    const publicProduct = formatProductUrls({
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      thumbnail: product.thumbnail,
      basePrice: product.basePrice,
      featured: product.featured,
      images: product.images,
      variants: product.variants,
      category: product.category,
      brand: product.brand,
    })

    return NextResponse.json(publicProduct)
  } catch (error) {
    console.error('[PUBLIC_PRODUCT_GET]', error)
    return NextResponse.json({ message: 'Failed to fetch product' }, { status: 500 })
  }
}
