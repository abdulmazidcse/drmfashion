import { prisma } from "@/lib/prisma"
import { getCache, setCache, invalidateCache } from "@/lib/redis"
import { formatImageUrl } from "@/lib/utils"
import { BANNER_POSITIONS, type BannerPosition } from "@/lib/bannerPositions"

export { BANNER_POSITIONS, isBannerPosition, bannerPositionLabel } from "@/lib/bannerPositions"
export type { BannerPosition } from "@/lib/bannerPositions"

/** Storefront pages that render <PromoBanners>; every admin write revalidates all of them. */
export const BANNER_PAGE_PATHS = ["/", "/men", "/women", "/shop"] as const

/**
 * Five minutes. A scheduled banner can therefore appear or disappear up to
 * five minutes late — the trade-off for not hitting Postgres on every visit.
 * Admin edits do not wait: they call invalidateBannerCache() directly.
 */
export const BANNER_CACHE_TTL = 300

const cacheKey = (position: BannerPosition) => `banners:${position}:v1`

export interface ActiveBanner {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  link: string | null
  buttonText: string | null
  position: string
  sortOrder: number
}

/**
 * Live banners for one slot: active, inside their schedule window, in display
 * order. Image URLs are already run through formatImageUrl().
 */
export async function getActiveBanners(position: BannerPosition): Promise<ActiveBanner[]> {
  const key = cacheKey(position)
  const cached = await getCache<ActiveBanner[]>(key)
  if (cached !== null) return cached

  const now = new Date()
  const rows = await prisma.banner.findMany({
    where: {
      active: true,
      position,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      subtitle: true,
      image: true,
      mobileImage: true,
      link: true,
      buttonText: true,
      position: true,
      sortOrder: true,
    },
  })

  const banners: ActiveBanner[] = rows.map((b) => ({
    ...b,
    image: formatImageUrl(b.image),
    mobileImage: b.mobileImage ? formatImageUrl(b.mobileImage) : null,
  }))

  await setCache(key, banners, BANNER_CACHE_TTL)
  return banners
}

/** Drop every position's cached list. Cheap — six keys — so writes just clear them all. */
export async function invalidateBannerCache(): Promise<void> {
  await Promise.all(BANNER_POSITIONS.map((p) => invalidateCache(cacheKey(p.key))))
}

// ─── Admin input helpers ─────────────────────────────────────────────────────

/** Trimmed string, or null when empty / not a string. */
export function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Parse a schedule bound from the admin form.
 * null / "" → null (no bound), ISO string → Date, anything else → "invalid".
 */
export function parseBannerDate(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "string" && !(value instanceof Date)) return "invalid"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "invalid" : d
}
