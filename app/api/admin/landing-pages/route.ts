import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { starterTemplate, DEFAULT_THEME } from "@/lib/landing/sections"

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get("search") || "").trim()

    const where: Prisma.LandingPageWhereInput = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const landingPages = await prisma.landingPage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json(landingPages)
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_GET]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, slug, heading, subheading, bannerImage, active, metaTitle, metaDescription } = body

    if (!title || !slug) {
      return NextResponse.json({ message: "Title and Slug are required" }, { status: 400 })
    }

    const existing = await prisma.landingPage.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ message: "Slug already exists" }, { status: 400 })
    }

    const landingPage = await prisma.landingPage.create({
      data: {
        title,
        slug,
        heading: heading || null,
        subheading: subheading || null,
        bannerImage: bannerImage || null,
        active: active ?? true,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        // Opens the builder pre-populated with a typical single-product COD
        // layout instead of a blank canvas — see lib/landing/sections.ts.
        sections: starterTemplate({ heading, image: bannerImage }) as unknown as Prisma.InputJsonValue,
        theme: DEFAULT_THEME as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(landingPage)
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_POST]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
