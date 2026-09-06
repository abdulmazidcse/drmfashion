import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCategoryHomeCache } from "@/lib/redis"

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
    const { name, slug, image, bannerImage, imageAlt, bannerImageAlt, imageCaption, bannerImageCaption, parentId, description, isTrending, howToMeasure, howToMeasureImage, metaTitle, metaDescription, metaKeywords } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name and Slug are required" },
        { status: 400 }
      )
    }

    // Check slug uniqueness (exclude current record)
    const existing = await prisma.category.findFirst({
      where: { slug, NOT: { id } },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Slug already exists" },
        { status: 400 }
      )
    }

    // Prevent circular reference
    if (parentId === id) {
      return NextResponse.json(
        { message: "A category cannot be its own parent" },
        { status: 400 }
      )
    }

    // Get existing category to check if parentId changed
    const currentCategory = await prisma.category.findUnique({ where: { id } })
    if (!currentCategory) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 })
    }

    // Verify parent only if it's being changed
    if (parentId && parentId !== currentCategory.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json({ message: "Parent category not found" }, { status: 400 })
      }
      
      // Allow up to 3 levels: check if parent has a parent that also has a parent
      if (parent.parentId) {
        const grandParent = await prisma.category.findUnique({ where: { id: parent.parentId } })
        if (grandParent?.parentId) {
          return NextResponse.json(
            { message: "Cannot nest subcategories more than 2 levels deep (3 levels max)" },
            { status: 400 }
          )
        }
      }

      // Check if this category has children. If so, it cannot become a 3rd level subcategory
      // Actually, if it has children, moving it under a subcategory would create a 4th level.
      // Let's just do a simple check: if it has children, don't allow it to be moved under a subcategory
      if (parent.parentId) {
        const hasChildren = await prisma.category.findFirst({ where: { parentId: id } })
        if (hasChildren) {
          return NextResponse.json(
            { message: "Cannot move a category with subcategories under another subcategory (exceeds 3 levels)" },
            { status: 400 }
          )
        }
      }
    }

    const isTrendingBool = isTrending === true || String(isTrending).toLowerCase() === "true" || isTrending === "on"
    const category = await prisma.category.update({
      where: { id },
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
  } catch (error) {
    console.log("[CATEGORY_PATCH]", error)
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

    // Check if category has products linked
    const productCount = await prisma.product.count({
      where: { categoryId: id },
    })

    if (productCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete: ${productCount} product(s) are linked to this category. Reassign them first.`,
        },
        { status: 409 }
      )
    }

    // Check if category has subcategories
    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    })

    if (childrenCount > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete: This category has ${childrenCount} subcategory(ies). Delete or reassign them first.`,
        },
        { status: 409 }
      )
    }

    await prisma.category.delete({
      where: { id },
    })

    await invalidateCategoryHomeCache()

    revalidatePath("/")
    revalidatePath("/category/[slug]", "page")
    // The size chart a product shows can come from its category, so product
    // pages go stale when a category changes too.
    revalidatePath("/product/[slug]", "page")
    revalidatePath("/shop")
    revalidatePath("/api/categories")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[CATEGORY_DELETE]", error)
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    )
  }
}
