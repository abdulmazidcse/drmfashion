import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items } = body 
    // items should be an array of { id: string, position: number, parentId: string | null }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 })
    }

    // Process updates in a transaction
    await prisma.$transaction(
      items.map((item: any) => 
        prisma.menuItem.update({
          where: { id: item.id },
          data: { 
            position: item.position,
            parentId: item.parentId || null
          }
        })
      )
    )

    const { invalidateCache } = await import("@/lib/redis")
    try {
      await invalidateCache("header:menus")
    } catch (e) {
      console.warn("Could not invalidate menus cache:", e)
    }

    revalidatePath("/")
    revalidatePath("/api/menus")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.log("[MENUS_REORDER]", error)
    return NextResponse.json({ message: "Something went wrong", error: error.message || String(error) }, { status: 500 })
  }
}
