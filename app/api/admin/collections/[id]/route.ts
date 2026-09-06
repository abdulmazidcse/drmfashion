import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateCollectionCaches } from "@/lib/collectionCache"

type Params = {
  params: Promise<{ id: string }>
}

/** Empty string becomes null; anything else is parsed as a date. */
function parseDate(value: unknown): Date | null {
  if (value === null || value === "") return null
  const d = new Date(String(value))
  return isNaN(d.getTime()) ? null : d
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const collection = await prisma.collection.findUnique({
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

    if (!collection) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_GET_ONE]", error)
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

    const current = await prisma.collection.findUnique({ where: { id }, select: { slug: true } })
    if (!current) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }
    if (body.slug !== undefined && !String(body.slug).trim()) {
      return NextResponse.json({ message: "Slug is required" }, { status: 400 })
    }

    if (body.slug !== undefined && body.slug !== current.slug) {
      const clash = await prisma.collection.findFirst({
        where: { slug: body.slug, NOT: { id } },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json({ message: "Slug already exists" }, { status: 400 })
      }
    }

    // Partial update: only keys present in the body are written.
    const data: Prisma.CollectionUpdateInput = {}
    if (body.name !== undefined) data.name = body.name
    if (body.slug !== undefined) data.slug = body.slug
    if (body.description !== undefined) data.description = body.description || null
    if (body.image !== undefined) data.image = body.image || null
    if (body.bannerImage !== undefined) data.bannerImage = body.bannerImage || null
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.featured !== undefined) data.featured = Boolean(body.featured)
    if (body.sortOrder !== undefined) {
      data.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    }
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle || null
    if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription || null
    if (body.startsAt !== undefined) data.startsAt = parseDate(body.startsAt)
    if (body.endsAt !== undefined) data.endsAt = parseDate(body.endsAt)

    const collection = await prisma.collection.update({ where: { id }, data })

    await invalidateCollectionCaches([current.slug, collection.slug])

    return NextResponse.json(collection)
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_PATCH]", error)
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

    const existing = await prisma.collection.findUnique({ where: { id }, select: { slug: true } })
    if (!existing) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    // CollectionProduct rows cascade with the collection.
    await prisma.collection.delete({ where: { id } })

    await invalidateCollectionCaches([existing.slug])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_COLLECTIONS_DELETE]", error)
    return NextResponse.json({ message: "Delete failed" }, { status: 500 })
  }
}
