import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"
import { formatImageUrl, formatProductUrls } from "@/lib/utils"
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect"
import { COLLECTIONS_CACHE_TTL, collectionCacheKey } from "@/lib/collectionCache"

type Params = {
  params: Promise<{ slug: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    const cacheKey = collectionCacheKey(slug)

    const cached = await getCache<Record<string, unknown>>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        bannerImage: true,
        active: true,
        featured: true,
        metaTitle: true,
        metaDescription: true,
        startsAt: true,
        endsAt: true,
        products: {
          where: { product: { published: true, deletedAt: null } },
          orderBy: { sortOrder: "asc" },
          select: { product: { select: PRODUCT_CARD_SELECT } },
        },
      },
    })

    const now = new Date()
    const live =
      collection &&
      collection.active &&
      (!collection.startsAt || collection.startsAt <= now) &&
      (!collection.endsAt || collection.endsAt >= now)

    if (!collection || !live) {
      return NextResponse.json({ message: "Collection not found" }, { status: 404 })
    }

    const { products, ...rest } = collection
    const payload = {
      ...rest,
      image: formatImageUrl(rest.image),
      bannerImage: formatImageUrl(rest.bannerImage),
      products: products.map((row) => formatProductUrls(row.product)),
    }

    await setCache(cacheKey, payload, COLLECTIONS_CACHE_TTL)

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[COLLECTIONS_GET_ONE]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
