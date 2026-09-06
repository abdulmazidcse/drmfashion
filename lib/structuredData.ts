import { siteUrl } from "@/lib/siteUrl"
import { absoluteImageUrl } from "@/lib/imageMeta"
import { formatImageUrl } from "@/lib/utils"

/**
 * JSON-LD builders.
 *
 * Metadata tags tell a crawler what a page is called; structured data tells it
 * what the page *is*. For a shop that is the difference between a plain blue
 * link and a result carrying price, stock state and stars — so this is the
 * highest-leverage SEO work after being crawlable at all.
 *
 * Every builder returns a plain object for <script type="application/ld+json">.
 * Fields that would be guesswork are omitted rather than filled with
 * placeholders: Google penalises structured data that disagrees with the page.
 */

/** Strips HTML and collapses whitespace — descriptions are stored as rich text. */
function plainText(html: string | null | undefined, max = 5000): string {
  if (!html) return ""
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export interface ProductSchemaInput {
  title: string
  slug: string
  description?: string | null
  productCode?: string | null
  basePrice: number
  discountPrice?: number | null
  thumbnail?: string | null
  images?: Array<{ url: string }>
  brand?: { name: string } | null
  category?: { name: string } | null
  variants?: Array<{ sku: string; stock: number }>
  currency: string
  /** Only passed when the product actually has reviews — see below. */
  rating?: { value: number; count: number } | null
}

export function productSchema(product: ProductSchemaInput) {
  const base = siteUrl()
  const url = `${base}/product/${product.slug}`

  const images = [
    product.thumbnail,
    ...(product.images ?? []).map((i) => i.url),
  ]
    .filter(Boolean)
    .map((u) => absoluteImageUrl(formatImageUrl(u as string), base))
    .filter((u): u is string => Boolean(u))

  // In stock when any variant has stock. A product whose every variant is at
  // zero is still a valid page, so it is advertised as OutOfStock rather than
  // dropped — Google keeps the listing and marks it unavailable.
  const inStock = (product.variants ?? []).some((v) => v.stock > 0)
  const price = product.discountPrice && product.discountPrice < product.basePrice
    ? product.discountPrice
    : product.basePrice

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    url,
    ...(images.length ? { image: images.slice(0, 10) } : {}),
    ...(product.description ? { description: plainText(product.description, 500) } : {}),
    ...(product.productCode ? { sku: product.productCode } : {}),
    ...(product.brand?.name ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.category?.name ? { category: product.category.name } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: product.currency,
      price: price.toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    // Omitted entirely when there are no reviews. Inventing a rating is a
    // structured-data violation and risks a manual action.
    ...(product.rating && product.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.value.toFixed(1),
            reviewCount: product.rating.count,
          },
        }
      : {}),
  }
}

/**
 * The trail shown under a search result. Positions are 1-based and must match
 * what the page actually renders, so callers pass the same crumbs they display.
 */
export function breadcrumbSchema(crumbs: Array<{ name: string; path: string }>) {
  const base = siteUrl()
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${base}${crumb.path}`,
    })),
  }
}

/** Site-wide identity, emitted once from the root layout. */
export function organizationSchema(storeName: string, logoUrl?: string | null) {
  const base = siteUrl()
  const logo = logoUrl ? absoluteImageUrl(formatImageUrl(logoUrl), base) : null

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}#organization`,
    name: storeName,
    url: base,
    ...(logo ? { logo } : {}),
  }
}

/**
 * Declares the site's own search endpoint. Google may then show a search box
 * directly under the result — but only if the template resolves to a real
 * results page, so this mirrors what the header actually navigates to
 * (`/shop?query=`). There is no /search route; pointing at one would advertise
 * a 404 to crawlers.
 */
export function webSiteSchema(storeName: string) {
  const base = siteUrl()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}#website`,
    name: storeName,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/shop?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}
