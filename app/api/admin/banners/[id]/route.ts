import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import {
  BANNER_PAGE_PATHS,
  invalidateBannerCache,
  isBannerPosition,
  optionalString,
  parseBannerDate,
} from "@/lib/banners"

type Params = {
  params: Promise<{
    id: string
  }>
}

async function afterWrite() {
  await invalidateBannerCache()
  for (const path of BANNER_PAGE_PATHS) revalidatePath(path)
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const banner = await prisma.banner.findUnique({ where: { id } })
    if (!banner) {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 })
    }
    return NextResponse.json(banner)
  } catch (error) {
    console.error("[ADMIN_BANNERS_ID_GET]", error)
    return NextResponse.json({ message: "Failed to load banner" }, { status: 500 })
  }
}

/**
 * Partial update: only keys present in the body are touched, so the inline
 * active toggle can send `{ active }` alone and the edit form the full record.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.banner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 })
    }

    const data: Prisma.BannerUpdateInput = {}

    if ("title" in body) {
      const title = optionalString(body.title)
      if (!title) return NextResponse.json({ message: "Title is required" }, { status: 400 })
      data.title = title
    }
    if ("image" in body) {
      const image = optionalString(body.image)
      if (!image) return NextResponse.json({ message: "Banner image is required" }, { status: 400 })
      data.image = image
    }
    if ("subtitle" in body) data.subtitle = optionalString(body.subtitle)
    if ("mobileImage" in body) data.mobileImage = optionalString(body.mobileImage)
    if ("link" in body) data.link = optionalString(body.link)
    if ("buttonText" in body) data.buttonText = optionalString(body.buttonText)

    if ("position" in body) {
      if (!isBannerPosition(body.position)) {
        return NextResponse.json({ message: "Unknown banner position" }, { status: 400 })
      }
      data.position = body.position
    }
    if ("sortOrder" in body) {
      const sortOrder = Number(body.sortOrder)
      if (!Number.isInteger(sortOrder)) {
        return NextResponse.json({ message: "Sort order must be a whole number" }, { status: 400 })
      }
      data.sortOrder = sortOrder
    }
    if ("active" in body) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json({ message: "Active must be true or false" }, { status: 400 })
      }
      data.active = body.active
    }

    let startsAt = existing.startsAt
    let endsAt = existing.endsAt
    if ("startsAt" in body) {
      const parsed = parseBannerDate(body.startsAt)
      if (parsed === "invalid") return NextResponse.json({ message: "Invalid start date" }, { status: 400 })
      startsAt = parsed
      data.startsAt = parsed
    }
    if ("endsAt" in body) {
      const parsed = parseBannerDate(body.endsAt)
      if (parsed === "invalid") return NextResponse.json({ message: "Invalid end date" }, { status: 400 })
      endsAt = parsed
      data.endsAt = parsed
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json({ message: "Start date must be before end date" }, { status: 400 })
    }

    const banner = await prisma.banner.update({ where: { id }, data })

    await afterWrite()

    return NextResponse.json(banner)
  } catch (error) {
    console.error("[ADMIN_BANNERS_PATCH]", error)
    return NextResponse.json({ message: "Failed to update banner" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_BANNERS]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 })
    }

    await prisma.banner.delete({ where: { id } })

    await afterWrite()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_BANNERS_DELETE]", error)
    return NextResponse.json({ message: "Failed to delete banner" }, { status: 500 })
  }
}
