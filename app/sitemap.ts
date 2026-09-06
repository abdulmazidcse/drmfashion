import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { requestSiteUrl } from "@/lib/siteUrl"
import { formatImageUrl } from "@/lib/utils"
import { absoluteImageUrl, productImageUrls } from "@/lib/imageMeta"

// Per request rather than on a timer: the URLs it lists have to carry the
// domain being served, and a sitemap is fetched by crawlers a handful of times
// a day — far too rarely for the extra query to matter.
export const dynamic = "force-dynamic"

/**
 * Only routes that are actually indexable belong here. Deliberately excluded:
 * /buy/[slug] (noindex — a duplicate of the product page for ad traffic),
 * /cart and /checkout (disallowed in robots.ts), and the signed-in area
 * (/account, /wishlist, /orders), which has nothing to crawl.
 */
const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/men", priority: 0.9, changeFrequency: "daily" },
  { path: "/women", priority: 0.9, changeFrequency: "daily" },
  { path: "/category", priority: 0.7, changeFrequency: "weekly" },
  { path: "/collection", priority: 0.7, changeFrequency: "weekly" },
  { path: "/journal", priority: 0.6, changeFrequency: "weekly" },
  { path: "/reviews", priority: 0.6, changeFrequency: "weekly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/gift-cards", priority: 0.5, changeFrequency: "monthly" },
  { path: "/pages/contact-support", priority: 0.4, changeFrequency: "monthly" },
  { path: "/track-order", priority: 0.3, changeFrequency: "yearly" },
]

async function loadDynamicEntries() {
  const now = new Date()

  const [products, categories, collections, posts, pages] = await Promise.all([
    prisma.product.findMany({
      where: { published: true, deletedAt: null },
      // The photography comes along so each product entry can carry <image:image>
      // blocks. Google will not crawl a picture it never found a link to, and
      // every shot past the lead one is lazy-loaded. Variants are included
      // because most of the catalogue's images live on them rather than in
      // `ProductImage` — leaving them out advertised a small fraction.
      select: {
        slug: true,
        updatedAt: true,
        thumbnail: true,
        images: { select: { url: true } },
        variants: {
          where: { deletedAt: null },
          select: { image: true, images: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      select: { slug: true },
    }),
    // Same liveness test as /collection/[slug]: a collection outside its
    // schedule window renders a 404, so it must not be advertised.
    prisma.collection.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.journalPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ])

  return { products, categories, collections, posts, pages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await requestSiteUrl()

  // Prerendered at build time, so an unreachable database would fail the whole
  // build over a file that can be regenerated an hour later. Ship the static
  // routes instead — an incomplete sitemap beats no deploy.
  const dynamicEntries = await loadDynamicEntries().catch((e) => {
    console.warn("[SITEMAP] database unavailable, listing static routes only", e)
    return { products: [], categories: [], collections: [], posts: [], pages: [] }
  })

  const { products, categories, collections, posts, pages } = dynamicEntries

  const now = new Date()

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collections.map((c) => ({
      url: `${base}/collection/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      // `productImageUrls` walks the gallery and the variants and dedupes by
      // file name — the same photograph is stored in more than one form, so
      // comparing whole URLs let it through twice. `formatImageUrl` returns a
      // site-relative path in local development, so each is then made absolute:
      // a sitemap has no base URL to resolve against.
      images: productImageUrls(p)
        .map((url) => absoluteImageUrl(formatImageUrl(url), base))
        .filter((url): url is string => Boolean(url)),
    })),
    ...posts.map((p) => ({
      url: `${base}/journal/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // `contact-support` is a real route of its own and already listed above.
    ...pages
      .filter((p) => p.slug !== "contact-support")
      .map((p) => ({
        url: `${base}/pages/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ]
}
