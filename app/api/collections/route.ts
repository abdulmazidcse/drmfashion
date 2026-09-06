import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"
import { formatImageUrl } from "@/lib/utils"
import { COLLECTIONS_CACHE_TTL, COLLECTIONS_LIST_KEY } from "@/lib/collectionCache"

/**
 * Public list of live collections: active, and inside their schedule window
 * (no start or start in the past, no end or end in the future).
 */
export async function GET() {
  try {
    const cached = await getCache<unknown[]>(COLLECTIONS_LIST_KEY)
    if (cached) return NextResponse.json(cached)

    const now = new Date()
    const raw = await prisma.collection.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        bannerImage: true,
        featured: true,
        sortOrder: true,
        startsAt: true,
        endsAt: true,
        _count: {
          select: { products: { where: { product: { published: true, deletedAt: null } } } },
        },
      },
    })

    const collections = raw.map((c) => ({
      ...c,
      image: formatImageUrl(c.image),
      bannerImage: formatImageUrl(c.bannerImage),
      productCount: c._count.products,
    }))

    await setCache(COLLECTIONS_LIST_KEY, collections, COLLECTIONS_CACHE_TTL)

    return NextResponse.json(collections)
  } catch (error) {
    console.error("[COLLECTIONS_GET]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
