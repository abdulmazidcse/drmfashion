import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

// PUT update a journal category
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const name = String(body.name || "").trim()

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    const slug = slugify(body.slug || name)
    if (!slug) {
      return NextResponse.json({ message: "A valid slug is required" }, { status: 400 })
    }

    const category = await prisma.journalCategory.update({
      where: { id },
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
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Journal category not found" }, { status: 404 })
    }
    console.error("[JOURNAL_CATEGORY_PUT_ERROR]", error)
    return NextResponse.json({ message: "Failed to update journal category" }, { status: 500 })
  }
}

// DELETE a journal category (posts are detached, not deleted)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    await prisma.journalCategory.delete({ where: { id } })

    revalidatePath("/journal")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Journal category not found" }, { status: 404 })
    }
    console.error("[JOURNAL_CATEGORY_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Failed to delete journal category" }, { status: 500 })
  }
}
