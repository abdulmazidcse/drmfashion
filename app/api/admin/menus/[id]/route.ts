import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { title, url, imageUrl, parentId } = body

    if (!title || !url) {
      return NextResponse.json(
        { message: "Title and URL are required" },
        { status: 400 }
      )
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        title,
        url,
        imageUrl: imageUrl || null,
        parentId: parentId || null
      }
    })

    try {
      // The header reads "header:menus:v2" (components/Header.tsx); the bare key
      // this cleared before matched nothing, so edits waited out the 10-min TTL.
      await Promise.all([invalidateCache("header:menus:v2"), invalidateCache("menu:category-links:v1")])
    } catch (e) {
      console.warn("Could not invalidate menus cache:", e)
    }

    revalidatePath("/")
    revalidatePath("/api/menus")

    return NextResponse.json(menuItem)
  } catch (error: any) {
    console.log("[MENU_PATCH]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Cascade delete is enabled in schema, so children will be deleted automatically
    const menuItem = await prisma.menuItem.delete({
      where: { id },
    })

    try {
      // The header reads "header:menus:v2" (components/Header.tsx); the bare key
      // this cleared before matched nothing, so edits waited out the 10-min TTL.
      await Promise.all([invalidateCache("header:menus:v2"), invalidateCache("menu:category-links:v1")])
    } catch (e) {
      console.warn("Could not invalidate menus cache:", e)
    }

    revalidatePath("/")
    revalidatePath("/api/menus")

    return NextResponse.json(menuItem)
  } catch (error: any) {
    console.log("[MENU_DELETE]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message }, { status: 500 })
  }
}
