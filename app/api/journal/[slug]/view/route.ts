import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST — increment the view counter for a published journal post
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    const result = await prisma.journalPost.updateMany({
      where: { slug, published: true },
      data: { views: { increment: 1 } },
    })

    if (result.count === 0) {
      return NextResponse.json({ message: "Journal post not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[JOURNAL_VIEW_ERROR]", error)
    return NextResponse.json({ message: "Failed to record view" }, { status: 500 })
  }
}
