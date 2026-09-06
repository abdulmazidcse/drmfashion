import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { BANNER_PAGE_PATHS, invalidateBannerCache } from "@/lib/banners"

/**
 * Body: `{ items: [{ id, sortOrder }] }`. The admin page sends the whole list
 * for one position re-numbered 0..n after a move, so ties never stall a swap.
 */
export async function PATCH(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const items: unknown = body?.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "items must be a non-empty array" }, { status: 400 })
    }

    const updates: { id: string; sortOrder: number }[] = []
    for (const item of items) {
      const id = typeof item?.id === "string" ? item.id : ""
      const sortOrder = Number(item?.sortOrder)
      if (!id || !Number.isInteger(sortOrder)) {
        return NextResponse.json({ message: "Each item needs an id and a whole-number sortOrder" }, { status: 400 })
      }
      updates.push({ id, sortOrder })
    }

    await prisma.$transaction(
      updates.map((u) => prisma.banner.update({ where: { id: u.id }, data: { sortOrder: u.sortOrder } }))
    )

    await invalidateBannerCache()
    for (const path of BANNER_PAGE_PATHS) revalidatePath(path)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_BANNERS_REORDER]", error)
    return NextResponse.json({ message: "Failed to reorder banners" }, { status: 500 })
  }
}
