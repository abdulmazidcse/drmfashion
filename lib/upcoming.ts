/**
 * "Upcoming" (coming soon) products.
 *
 * A product is upcoming while its `upcoming` flag is on and its launch date —
 * if it has one — is still in the future. Once the date passes it becomes an
 * ordinary product everywhere without anyone touching it, which is why every
 * check goes through here instead of reading `product.upcoming` directly.
 */

/** Prisma filter: products that are upcoming right now. */
export function upcomingWhere() {
  return {
    upcoming: true,
    OR: [{ launchDate: null }, { launchDate: { gt: new Date() } }],
  }
}

/**
 * Prisma filter for regular listings (shop, category, search, feeds…):
 * everything except products that are still upcoming. Spread it into a
 * `where` that has no `NOT` key of its own.
 */
export function notUpcomingWhere() {
  return { NOT: upcomingWhere() }
}

export function isUpcoming(p: { upcoming?: boolean | null; launchDate?: Date | string | null } | null | undefined): boolean {
  if (!p?.upcoming) return false
  if (!p.launchDate) return true
  return new Date(p.launchDate).getTime() > Date.now()
}

/** "Coming 25 Oct" / "Coming Soon" */
export function comingLabel(launchDate?: Date | string | null): string {
  if (!launchDate) return "Coming Soon"
  const d = new Date(launchDate)
  if (Number.isNaN(d.getTime())) return "Coming Soon"
  return `Coming ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" })}`
}

/** Admin form value ("2026-10-25", a Dhaka calendar day) → stored instant. */
export function parseLaunchDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? `${raw.trim()}T00:00:00+06:00` : raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Stored instant → admin form value (Dhaka calendar day). */
export function launchDateInputValue(d?: Date | string | null): string {
  if (!d) return ""
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })
}
