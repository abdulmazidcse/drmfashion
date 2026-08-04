import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { buildExcerpt, estimateReadTime, normalizeTags, slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

function revalidateJournal() {
  revalidatePath("/journal")
  revalidatePath("/journal/[slug]", "page")
}

// GET all journal posts (admin listing)
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const posts = await prisma.journalPost.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    })
    return NextResponse.json(posts)
  } catch (error: any) {
    console.error("[JOURNAL_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load journal posts" }, { status: 500 })
  }
}

// POST create a journal post
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
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

    const post = await prisma.journalPost.create({
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
        publishedAt: published ? new Date() : null,
        metaTitle: String(body.metaTitle || "").trim() || null,
        metaDescription: String(body.metaDescription || "").trim() || null,
        metaKeywords: String(body.metaKeywords || "").trim() || null,
        categoryId: body.categoryId || null,
      },
    })

    // Only one post can hold the hero slot on the listing page.
    if (post.featured) {
      await prisma.journalPost.updateMany({
        where: { id: { not: post.id }, featured: true },
        data: { featured: false },
      })
    }

    revalidateJournal()

    return NextResponse.json(post)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    console.error("[JOURNAL_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to create journal post" }, { status: 500 })
  }
}
