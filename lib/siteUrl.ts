import { headers } from "next/headers"

/**
 * The public origin this store is being served from.
 *
 * Two functions, because there are two situations:
 *
 *   requestSiteUrl()  — anything rendered per request (the product feed,
 *                       robots.txt, the sitemap). Reads the host off the actual
 *                       request, so the same build deployed on a second domain
 *                       describes itself as that domain with no configuration
 *                       at all. This is the one to reach for.
 *
 *   siteUrl()         — static and build-time contexts, where no request exists
 *                       to ask. `metadataBase` in the root layout is the main
 *                       one: making it request-aware would force every page in
 *                       the app to render dynamically, which is far too high a
 *                       price for a canonical URL.
 *
 * There is deliberately no hardcoded production domain here any more. A build
 * that runs without NEXT_PUBLIC_APP_URL now falls back to localhost and says so
 * loudly, rather than silently claiming a domain belonging to whichever store
 * this codebase was first written for — a wrong URL you notice beats a wrong
 * URL that looks plausible.
 */

const LOCAL_FALLBACK = "http://localhost:3000"

/** No trailing slash: every caller appends its own path. */
function normalise(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return normalise(configured)

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[SITE_URL] NEXT_PUBLIC_APP_URL is not set — canonical URLs, the sitemap " +
        "and the product feed will point at " + LOCAL_FALLBACK
    )
  }

  return LOCAL_FALLBACK
}

/**
 * Origin taken from the request being served, falling back to `siteUrl()`.
 *
 * `x-forwarded-*` come first because in production the app sits behind a proxy,
 * where the bare `host` header is the internal address rather than the domain
 * the visitor typed. An explicit NEXT_PUBLIC_APP_URL still wins over both: a
 * store that must pin one canonical host — www vs bare, say — sets it and gets
 * that answer regardless of which alias the request arrived on.
 */
export async function requestSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return normalise(configured)

  try {
    const h = await headers()
    // A comma-separated list when it has passed through several proxies; the
    // first entry is the origin the client actually asked for.
    const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim()
    if (host) {
      const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim()
      // Local development is the only place that is legitimately not HTTPS.
      const scheme = proto || (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) ? "http" : "https")
      return normalise(`${scheme}://${host}`)
    }
  } catch {
    // headers() throws outside a request scope — during prerender, for one.
    // Nothing to recover; fall through to the static answer below.
  }

  return siteUrl()
}
