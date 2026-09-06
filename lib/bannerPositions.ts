/**
 * Where a promo banner can appear on the storefront.
 *
 * Kept apart from lib/banners.ts on purpose: that module pulls in Prisma and
 * Redis, and the admin Banners page (a client component) needs this list too.
 */
export const BANNER_POSITIONS = [
  { key: "home_top", label: "Home – below hero", hint: "Full-width strip directly under the hero slider." },
  { key: "home_middle", label: "Home – mid page", hint: "After this month's best sellers." },
  { key: "home_bottom", label: "Home – above footer", hint: "The last block before the footer." },
  { key: "men_top", label: "Men – below hero", hint: "Top of the Men landing page." },
  { key: "women_top", label: "Women – below hero", hint: "Top of the Women landing page." },
  { key: "shop_top", label: "Shop – below hero", hint: "Top of the Shop listing page." },
] as const

export type BannerPosition = (typeof BANNER_POSITIONS)[number]["key"]

const KNOWN = new Set<string>(BANNER_POSITIONS.map((p) => p.key))

export function isBannerPosition(value: unknown): value is BannerPosition {
  return typeof value === "string" && KNOWN.has(value)
}

export function bannerPositionLabel(key: string): string {
  return BANNER_POSITIONS.find((p) => p.key === key)?.label ?? key
}
