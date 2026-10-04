import { prisma } from "@/lib/prisma"
import { fetchWithCache } from "@/lib/redis"

/**
 * Where the site's own menu sends a category. Breadcrumbs used to hard-code
 * "/men" and "/women" for the gender roots while the header menu (Admin →
 * Menus) pointed "Men" at "/category/men", so the same word went to two
 * different pages depending on where it was clicked. Links are resolved from
 * the menu instead, and only categories the menu does not mention fall back
 * to /category/<slug>.
 */

/** Menu urls are typed by hand: "/category/men" and "/shop?category=men" both occur. */
export function slugFromMenuUrl(url?: string | null): string | null {
  if (!url) return null
  const [pathname, query] = url.split("#")[0].split("?")
  const direct = pathname.match(/\/category\/([^/]+)\/?$/)
  if (direct) return decodeURIComponent(direct[1])
  return new URLSearchParams(query || "").get("category")
}

export async function getCategoryMenuLinks() {
  const items: { title: string; url: string | null }[] = await fetchWithCache(
    "menu:category-links:v1",
    () => prisma.menuItem.findMany({ select: { title: true, url: true }, orderBy: { position: "asc" } }),
    600
  )
  const bySlug = new Map<string, string>()
  const byTitle = new Map<string, string>()
  for (const item of items) {
    if (!item.url) continue
    const slug = slugFromMenuUrl(item.url)
    // Only a plain category link stands in for the category itself — a
    // filtered shop link ("/shop?category=men&sale=true") is a different page.
    if (slug && !bySlug.has(slug) && !item.url.includes("&")) bySlug.set(slug, item.url)
    const title = item.title.trim().toLowerCase()
    if (title && !byTitle.has(title)) byTitle.set(title, item.url)
  }

  return (category: { slug: string; name: string }) =>
    bySlug.get(category.slug) ?? byTitle.get(category.name.trim().toLowerCase()) ?? `/category/${category.slug}`
}
