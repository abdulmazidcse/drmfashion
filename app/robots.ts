import { MetadataRoute } from 'next'
import { requestSiteUrl } from '@/lib/siteUrl'

/**
 * ►► FLIP THIS AT LAUNCH ◄◄
 *
 * false — the whole site is closed to crawlers (pre-launch).
 * true  — normal rules: everything crawlable except admin, the signed-in area,
 *         the cart/checkout flow and /buy (a noindex duplicate of the product
 *         page used for ad traffic), plus the sitemap is advertised.
 */
const ALLOW_INDEXING = true

// Rendered per request so the sitemap it advertises always carries the domain
// this deployment is actually being served from.
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await requestSiteUrl()

  if (!ALLOW_INDEXING) {
    return {
      rules: { userAgent: '*', disallow: '/' },
      // No sitemap while closed — pointing crawlers at a list of URLs they are
      // told not to fetch only invites them to try.
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin-login',
        '/api',
        '/dashboard',
        '/cart',
        '/checkout',
        '/account',
        '/wishlist',
        '/orders',
        '/buy',
        // Facet, sort, layout and search variants of the listing pages. They
        // carry a canonical to the plain page, but Googlebot still fetched
        // thousands of combinations (Search Console: ~3k "alternate page with
        // canonical", ~1.2k "crawled, not indexed") — load the single-vCPU box
        // could not take, which in turn produced 5xx answers. Only the plain
        // category/brand/shop URLs need crawling; the sitemap lists them.
        '/*?*size=',
        '/*?*color=',
        '/*?*length=',
        '/*?*sort=',
        '/*?*view=',
        '/*?*query=',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
