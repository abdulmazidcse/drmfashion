import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET single page
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) return NextResponse.json({ message: "Page not found" }, { status: 404 })
    return NextResponse.json(page)
  } catch (error) {
    return NextResponse.json({ message: "Failed to load page" }, { status: 500 })
  }
}

// PUT update page
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, slug, content, published } = await req.json()
    const page = await prisma.page.update({
      where: { id },
      data: { title, slug, content, published }
    })

    revalidatePath("/")
    revalidatePath("/pages/[slug]", "page")

    return NextResponse.json(page)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    return NextResponse.json({ message: "Failed to update page" }, { status: 500 })
  }
}

// DELETE page
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.page.delete({ where: { id } })

    revalidatePath("/")
    revalidatePath("/pages/[slug]", "page")

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete page" }, { status: 500 })
  }
}
