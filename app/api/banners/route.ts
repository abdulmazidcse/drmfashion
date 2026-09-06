import { NextRequest, NextResponse } from "next/server"
import { getActiveBanners, isBannerPosition } from "@/lib/banners"

/** Public: live banners for one position. Served from the same Redis cache the pages use. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const position = searchParams.get("position")

    if (!isBannerPosition(position)) {
      return NextResponse.json({ message: "Unknown banner position" }, { status: 400 })
    }

    const banners = await getActiveBanners(position)
    return NextResponse.json(banners)
  } catch (error) {
    console.error("[BANNERS_GET]", error)
    return NextResponse.json({ message: "Failed to load banners" }, { status: 500 })
  }
}
