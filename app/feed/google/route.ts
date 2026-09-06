import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings, getStoreName, baseCurrencyCode } from "@/lib/settings"
import { requestSiteUrl } from "@/lib/siteUrl"
import { buildGoogleFeed } from "@/lib/googleFeed"

/**
 * Google Merchant Center product feed.
 *
 *   XML     GET /feed/google
 *   Report  GET /feed/google?report=1
 *
 * Point Merchant Center at the first URL on a daily fetch schedule. The second
 * returns the same run as JSON — how many items qualified and what was dropped —
 * which is the thing to check before wondering why the catalogue looks short.
 *
 * ►► Note on robots.txt ◄◄
 * Merchant Center crawls each item's landing page to confirm its price and
 * availability. While `ALLOW_INDEXING` is false in app/robots.ts the whole site
 * answers `Disallow: /`, and every item in this feed will be disapproved no
 * matter how correct the XML is. The feed is safe to build and test now; it
 * cannot be *submitted* successfully until that flag is flipped.
 */

// Prices and stock move constantly, and a feed served from cache is a feed that
// disagrees with the landing page — which is itself a disapproval.
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const origin = await requestSiteUrl()

    const [products, settings, storeName] = await Promise.all([
      prisma.product.findMany({
        where: {
          published: true,
          deletedAt: null,
          // A product with no sellable variant has nothing to put in the feed.
          variants: { some: { deletedAt: null } },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          basePrice: true,
          discountPrice: true,
          brand: { select: { name: true } },
          category: {
            select: {
              name: true,
              parent: { select: { name: true, parent: { select: { name: true } } } },
            },
          },
          images: { select: { url: true } },
          variants: {
            where: { deletedAt: null },
            select: {
              id: true,
              sku: true,
              size: true,
              color: true,
              length: true,
              stock: true,
              price: true,
              image: true,
              images: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getSettings(),
      getStoreName(),
    ])

    const result = buildGoogleFeed(
      products,
      { siteUrl: origin, currency: baseCurrencyCode(settings) },
      storeName
    )

    if (req.nextUrl.searchParams.get("report")) {
      const totalVariants = products.reduce((n, p) => n + p.variants.length, 0)
      return NextResponse.json({
        products: products.length,
        variants: totalVariants,
        included: result.included,
        excluded: totalVariants - result.included,
        skippedBy: result.skipped,
        idFallbacks: result.idFallbacks,
        examples: result.examples,
        currency: baseCurrencyCode(settings),
        siteUrl: origin,
        // Surfaced on every run because it is the one thing that invalidates the
        // whole submission regardless of feed quality.
        note: "Merchant Center crawls each landing page. Set ALLOW_INDEXING = true in app/robots.ts before submitting, or every item is disapproved.",
      })
    }

    return new NextResponse(result.xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.log("[GOOGLE_FEED]", error)
    return NextResponse.json(
      { message: "Failed to build feed", error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
