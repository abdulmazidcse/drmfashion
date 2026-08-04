import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

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
    const { name, slug, image, parentId, description, isTrending } = body

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
      data: { name, slug, image: image || null, parentId: parentId || null, description: description || null, isTrending: isTrendingBool },
    })

    revalidatePath("/")
    revalidatePath("/category/[slug]", "page")
    revalidatePath("/shop")
    revalidatePath("/api/categories")

    return NextResponse.json(category)
  } catch (error: any) {
    console.log("[CATEGORIES_POST]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}
