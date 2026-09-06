import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import {
  BANNER_PAGE_PATHS,
  invalidateBannerCache,
  isBannerPosition,
  optionalString,
  parseBannerDate,
} from "@/lib/banners"

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const position = searchParams.get("position")

    if (position && !isBannerPosition(position)) {
      return NextResponse.json({ message: "Unknown banner position" }, { status: 400 })
    }

    const banners = await prisma.banner.findMany({
      where: position ? { position } : undefined,
      orderBy: [{ position: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(banners)
  } catch (error) {
    console.error("[ADMIN_BANNERS_GET]", error)
    return NextResponse.json({ message: "Failed to load banners" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    const title = optionalString(body.title)
    const image = optionalString(body.image)
    const { position } = body

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }
    if (!image) {
      return NextResponse.json({ message: "Banner image is required" }, { status: 400 })
    }
    if (!isBannerPosition(position)) {
      return NextResponse.json({ message: "Unknown banner position" }, { status: 400 })
    }

    const startsAt = parseBannerDate(body.startsAt)
    const endsAt = parseBannerDate(body.endsAt)
    if (startsAt === "invalid" || endsAt === "invalid") {
      return NextResponse.json({ message: "Invalid schedule date" }, { status: 400 })
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json({ message: "Start date must be before end date" }, { status: 400 })
    }

    // Blank sort order = append to the end of that position.
    let sortOrder: number
    if (body.sortOrder === undefined || body.sortOrder === null || body.sortOrder === "") {
      const last = await prisma.banner.aggregate({ where: { position }, _max: { sortOrder: true } })
      sortOrder = (last._max.sortOrder ?? -1) + 1
    } else {
      sortOrder = Number(body.sortOrder)
      if (!Number.isInteger(sortOrder)) {
        return NextResponse.json({ message: "Sort order must be a whole number" }, { status: 400 })
      }
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: optionalString(body.subtitle),
        image,
        mobileImage: optionalString(body.mobileImage),
        link: optionalString(body.link),
        buttonText: optionalString(body.buttonText),
        position,
        sortOrder,
        active: typeof body.active === "boolean" ? body.active : true,
        startsAt,
        endsAt,
      },
    })

    await invalidateBannerCache()
    for (const path of BANNER_PAGE_PATHS) revalidatePath(path)

    return NextResponse.json(banner)
  } catch (error) {
    console.error("[ADMIN_BANNERS_POST]", error)
    return NextResponse.json({ message: "Failed to create banner" }, { status: 500 })
  }
}
