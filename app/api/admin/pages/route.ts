import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET all pages
export async function GET() {
  try {
    // Deliberately no `content`: the two callers (the pages list and the menu
    // builder) only render metadata, and shipping every page body made this
    // list response ~116 KB. The editor loads a single page by id instead.
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(pages)
  } catch (error) {
    return NextResponse.json({ message: "Failed to load pages" }, { status: 500 })
  }
}

// POST create a new page
export async function POST(req: NextRequest) {
  try {
    const { title, slug, content, published } = await req.json()
    const page = await prisma.page.create({
      data: { title, slug, content, published }
    })

    revalidatePath("/")
    revalidatePath("/pages/[slug]", "page")

    return NextResponse.json(page)
  } catch (error: any) {
    // Handle unique constraint error on slug
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    return NextResponse.json({ message: "Failed to create page" }, { status: 500 })
  }
}
