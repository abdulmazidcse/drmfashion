import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCategoryHomeCache } from "@/lib/redis"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Return only top-level categories with their children nested
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        children: {
          orderBy: { createdAt: "desc" },
          include: {
            children: {
              orderBy: { createdAt: "desc" },
            }
          }
        },
      },
    })
    return NextResponse.json(categories)
  } catch (error: any) {
    console.log("[CATEGORIES_GET]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, image, bannerImage, imageAlt, bannerImageAlt, imageCaption, bannerImageCaption, parentId, description, isTrending, howToMeasure, howToMeasureImage, metaTitle, metaDescription, metaKeywords } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name and Slug are required" },
        { status: 400 }
      )
    }

    const existingCategory = await prisma.category.findUnique({ where: { slug } })
    if (existingCategory) {
      return NextResponse.json({ message: "Slug already exists" }, { status: 400 })
    }

    // If parentId provided, verify the parent exists
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json({ message: "Parent category not found" }, { status: 400 })
      }
      // Check if it's already a 3rd level category (its parent has a parent)
      if (parent.parentId) {
        const grandParent = await prisma.category.findUnique({ where: { id: parent.parentId } })
        if (grandParent?.parentId) {
          return NextResponse.json(
            { message: "Cannot nest subcategories more than 2 levels deep (3 levels max)" },
            { status: 400 }
          )
        }
      }
    }

    const isTrendingBool = isTrending === true || String(isTrending).toLowerCase() === "true" || isTrending === "on"
    const category = await prisma.category.create({
      data: { name, slug, image: image || null, bannerImage: bannerImage || null, imageAlt: String(imageAlt || "").trim() || null, bannerImageAlt: String(bannerImageAlt || "").trim() || null, imageCaption: String(imageCaption || "").trim() || null, bannerImageCaption: String(bannerImageCaption || "").trim() || null, parentId: parentId || null, description: description || null, isTrending: isTrendingBool, howToMeasure: String(howToMeasure || "").trim() || null, howToMeasureImage: String(howToMeasureImage || "").trim() || null, metaTitle: String(metaTitle || "").trim() || null, metaDescription: String(metaDescription || "").trim() || null, metaKeywords: String(metaKeywords || "").trim() || null },
    })

    await invalidateCategoryHomeCache()

    revalidatePath("/")
    revalidatePath("/category/[slug]", "page")
    // The size chart a product shows can come from its category, so product
    // pages go stale when a category changes too.
    revalidatePath("/product/[slug]", "page")
    revalidatePath("/shop")
    revalidatePath("/api/categories")

    return NextResponse.json(category)
  } catch (error: any) {
    console.log("[CATEGORIES_POST]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}
