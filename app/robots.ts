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
const ALLOW_INDEXING = false

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
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
