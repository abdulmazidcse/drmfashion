import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateCollectionCaches } from "@/lib/collectionCache"

/** Empty string or undefined becomes null; anything else is parsed as a date. */
function parseDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? null : d
}

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get("search") || "").trim()

    const where: Prisma.CollectionWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const collections = await prisma.collection.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json(collections)
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_GET]", error)
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
    const {
      name,
      slug,
      description,
      image,
      bannerImage,
      active,
      featured,
      sortOrder,
      metaTitle,
      metaDescription,
      startsAt,
      endsAt,
    } = body

    if (!name || !slug) {
      return NextResponse.json({ message: "Name and Slug are required" }, { status: 400 })
    }

    const existing = await prisma.collection.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ message: "Slug already exists" }, { status: 400 })
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        bannerImage: bannerImage || null,
        active: active ?? true,
        featured: featured ?? false,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        startsAt: parseDate(startsAt),
        endsAt: parseDate(endsAt),
      },
    })

    await invalidateCollectionCaches([collection.slug])

    return NextResponse.json(collection)
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_POST]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
