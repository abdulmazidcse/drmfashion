import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { parseSections, parseTheme, MAX_SECTIONS_BYTES } from "@/lib/landing/sections"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const landingPage = await prisma.landingPage.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          select: {
            sortOrder: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                basePrice: true,
                discountPrice: true,
                published: true,
                productCode: true,
              },
            },
          },
        },
      },
    })

    if (!landingPage) {
      return NextResponse.json({ message: "Landing page not found" }, { status: 404 })
    }

    return NextResponse.json(landingPage)
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_GET_ONE]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const current = await prisma.landingPage.findUnique({ where: { id }, select: { slug: true } })
    if (!current) {
      return NextResponse.json({ message: "Landing page not found" }, { status: 404 })
    }

    if (body.title !== undefined && !String(body.title).trim()) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }
    if (body.slug !== undefined && !String(body.slug).trim()) {
      return NextResponse.json({ message: "Slug is required" }, { status: 400 })
    }

    if (body.slug !== undefined && body.slug !== current.slug) {
      const clash = await prisma.landingPage.findFirst({
        where: { slug: body.slug, NOT: { id } },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json({ message: "Slug already exists" }, { status: 400 })
      }
    }

    // Partial update: only keys present in the body are written.
    const data: Prisma.LandingPageUpdateInput = {}
    if (body.title !== undefined) data.title = body.title
    if (body.slug !== undefined) data.slug = body.slug
    if (body.heading !== undefined) data.heading = body.heading || null
    if (body.subheading !== undefined) data.subheading = body.subheading || null
    if (body.bannerImage !== undefined) data.bannerImage = body.bannerImage || null
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle || null
    if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription || null

    // Never trust raw client JSON for the builder content — sanitise through
    // the same parsers the public renderer uses (lib/landing/sections.ts).
    if (body.sections !== undefined) {
      const sanitized = parseSections(body.sections)
      if (JSON.stringify(sanitized).length > MAX_SECTIONS_BYTES) {
        return NextResponse.json({ message: "Page content is too large" }, { status: 400 })
      }
      data.sections = sanitized as unknown as Prisma.InputJsonValue
    }
    if (body.theme !== undefined) {
      data.theme = parseTheme(body.theme) as unknown as Prisma.InputJsonValue
    }

    const landingPage = await prisma.landingPage.update({ where: { id }, data })

    return NextResponse.json(landingPage)
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_PATCH]", error)
    return NextResponse.json({ message: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.landingPage.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ message: "Landing page not found" }, { status: 404 })
    }

    // LandingPageProduct rows cascade with the landing page.
    await prisma.landingPage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_LANDING_PAGES_DELETE]", error)
    return NextResponse.json({ message: "Delete failed" }, { status: 500 })
  }
}
