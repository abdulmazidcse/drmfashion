import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { buildExcerpt, estimateReadTime, normalizeTags, slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

function revalidateJournal() {
  revalidatePath("/journal")
  revalidatePath("/journal/[slug]", "page")
}

// GET a single post (admin editor)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const post = await prisma.journalPost.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ message: "Journal post not found" }, { status: 404 })
    }
    return NextResponse.json(post)
  } catch (error: any) {
    console.error("[JOURNAL_ID_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load journal post" }, { status: 500 })
  }
}

// PUT update a post
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.journalPost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: "Journal post not found" }, { status: 404 })
    }

    const title = String(body.title || "").trim()
    const content = String(body.content || "")

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }

    const slug = slugify(body.slug || title)
    if (!slug) {
      return NextResponse.json({ message: "A valid slug is required" }, { status: 400 })
    }

    const published = Boolean(body.published)

    const post = await prisma.journalPost.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt: String(body.excerpt || "").trim() || buildExcerpt(content),
        coverImage: body.coverImage || null,
        authorName: String(body.authorName || "").trim() || null,
        readTime: estimateReadTime(content),
        tags: normalizeTags(body.tags),
        featured: Boolean(body.featured),
        published,
        // Keep the original publish date once it has been set.
        publishedAt: published ? existing.publishedAt ?? new Date() : null,
        metaTitle: String(body.metaTitle || "").trim() || null,
        metaDescription: String(body.metaDescription || "").trim() || null,
        metaKeywords: String(body.metaKeywords || "").trim() || null,
        categoryId: body.categoryId || null,
      },
    })

    if (post.featured) {
      await prisma.journalPost.updateMany({
        where: { id: { not: post.id }, featured: true },
        data: { featured: false },
      })
    }

    revalidateJournal()
    revalidatePath(`/journal/${existing.slug}`)

    return NextResponse.json(post)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    console.error("[JOURNAL_ID_PUT_ERROR]", error)
    return NextResponse.json({ message: "Failed to update journal post" }, { status: 500 })
  }
}

// DELETE a post
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    await prisma.journalPost.delete({ where: { id } })

    revalidateJournal()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Journal post not found" }, { status: 404 })
    }
    console.error("[JOURNAL_ID_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Failed to delete journal post" }, { status: 500 })
  }
}
