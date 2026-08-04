import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const menus = await prisma.menuItem.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      include: {
        children: {
          orderBy: { position: "asc" },
          include: {
            children: {
              orderBy: { position: "asc" },
            }
          }
        },
      },
    })
    return NextResponse.json(menus)
  } catch (error: any) {
    console.log("[MENUS_GET]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, url, imageUrl, parentId } = body

    if (!title || !url) {
      return NextResponse.json(
        { message: "Title and URL are required" },
        { status: 400 }
      )
    }

    // Get the max position for the new item's level
    const maxPositionItem = await prisma.menuItem.findFirst({
      where: { parentId: parentId || null },
      orderBy: { position: "desc" }
    })
    const position = maxPositionItem ? maxPositionItem.position + 1 : 0

    const menuItem = await prisma.menuItem.create({
      data: { 
        title, 
        url, 
        imageUrl: imageUrl || null, 
        parentId: parentId || null,
        position
      },
    })

    const { invalidateCache } = await import("@/lib/redis")
    try {
      await invalidateCache("header:menus")
    } catch (e) {
      console.warn("Could not invalidate menus cache:", e)
    }

    revalidatePath("/")
    revalidatePath("/api/menus")

    return NextResponse.json(menuItem)
  } catch (error: any) {
    console.log("[MENUS_POST]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}
