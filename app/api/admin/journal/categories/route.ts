import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

// GET all journal categories
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const categories = await prisma.journalCategory.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { posts: true } } },
    })
    return NextResponse.json(categories)
  } catch (error: any) {
    console.error("[JOURNAL_CATEGORIES_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load journal categories" }, { status: 500 })
  }
}

// POST create a journal category
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = String(body.name || "").trim()

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    const slug = slugify(body.slug || name)
    if (!slug) {
      return NextResponse.json({ message: "A valid slug is required" }, { status: 400 })
    }

    const category = await prisma.journalCategory.create({
      data: {
        name,
        slug,
        description: String(body.description || "").trim() || null,
        position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
      },
    })

    revalidatePath("/journal")

    return NextResponse.json(category)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    console.error("[JOURNAL_CATEGORIES_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to create journal category" }, { status: 500 })
  }
}
