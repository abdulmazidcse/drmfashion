/**
 * Which blocks the homepage is made of, in what order, and which are switched
 * off — the thing a Shopify theme editor gives you and a hardcoded JSX tree
 * does not.
 *
 * The order lives in one `home_sections` Setting. Two rules make it safe to
 * store an order in the database while the sections themselves live in code:
 *
 *  - A stored key that no longer exists is dropped. Deleting a section from
 *    app/page.tsx must not leave a dead row the admin can still toggle.
 *  - A section that exists but is not in the stored order is *inserted at its
 *    default position*, not appended. Otherwise every section added after a
 *    store first saved its order would silently land at the bottom of the page.
 *
 * A section renders nothing when it has no content (no reels uploaded, no
 * reviews written). Turning it on here is permission to appear, not a promise
 * that it will.
 */

export const HOME_SECTIONS_SETTING_KEY = "home_sections"

export const HOME_SECTIONS = [
  { key: "hero", label: "Hero slider", hint: "The banner at the top of the page." },
  { key: "pillars", label: "Pillars carousel", hint: "Our Heights / Fit / Purpose / Product." },
  { key: "flash-sale", label: "Flash sale", hint: "Countdown strip. Has its own on/off in the Flash Sale tab." },
  { key: "style", label: "Seasonal styles", hint: "Summer category tiles." },
  { key: "showcase", label: "Product showcase rows", hint: "The editorial strips you set up below." },
  { key: "bestsellers", label: "This month's best sellers", hint: "Computed from orders this month." },
  { key: "trending", label: "Trending tall categories", hint: "Men/Women category tiles." },
  { key: "reels", label: "Reels strip", hint: "Vertical clips." },
  { key: "icons", label: "Featured icons grid", hint: "Curated wall of product photography, Men/Women tabs." },
  { key: "brands", label: "Brand showcase", hint: "The dark panel listing brand logos." },
  { key: "new-arrivals", label: "New arrivals", hint: "Newest published products." },
  { key: "social-proof", label: "Social proof stats", hint: "Rating, reviews and customer counts. Hidden until there is a review." },
  { key: "reviews", label: "Customer reviews", hint: "Quote carousel. Hidden until there is a review." },
  { key: "recently-viewed", label: "Recently viewed", hint: "Per-visitor, from their browser." },
  { key: "value-props", label: "Value proposition banner", hint: "Shipping / returns / secure checkout icons." },
  { key: "journal", label: "From the journal", hint: "Three most recent posts." },
  { key: "description", label: "Store description", hint: "The rich text block above the footer." },
] as const

export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["key"]

export interface HomeSectionState {
  key: HomeSectionKey
  active: boolean
}

const DEFAULT_ORDER = HOME_SECTIONS.map((s) => s.key)
const KNOWN = new Set<string>(DEFAULT_ORDER)

export const DEFAULT_HOME_SECTIONS: HomeSectionState[] = DEFAULT_ORDER.map((key) => ({
  key,
  active: true,
}))

export function homeSectionLabel(key: HomeSectionKey): string {
  return HOME_SECTIONS.find((s) => s.key === key)?.label ?? key
}

export function parseHomeSections(raw: string | null | undefined): HomeSectionState[] {
  if (!raw) return DEFAULT_HOME_SECTIONS

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_HOME_SECTIONS
  }
  if (!Array.isArray(parsed)) return DEFAULT_HOME_SECTIONS

  const seen = new Set<string>()
  const result: HomeSectionState[] = []

  for (const entry of parsed) {
    const f = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}
    const key = typeof f.key === "string" ? f.key : null
    // Unknown key = a section that was removed from the code since this was
    // saved. Dropped rather than kept, so it cannot resurface as a dead toggle.
    if (!key || !KNOWN.has(key) || seen.has(key)) continue
    seen.add(key)
    result.push({
      key: key as HomeSectionKey,
      active: typeof f.active === "boolean" ? f.active : true,
    })
  }

  // Anything the stored order has never heard of is a section added to the code
  // since. Slot it back where it was designed to go — behind the nearest
  // earlier default that the admin has kept — instead of dumping it at the end.
  for (let i = 0; i < DEFAULT_ORDER.length; i++) {
    const key = DEFAULT_ORDER[i]
    if (seen.has(key)) continue

    let insertAt = 0
    for (let back = i - 1; back >= 0; back--) {
      const at = result.findIndex((r) => r.key === DEFAULT_ORDER[back])
      if (at !== -1) {
        insertAt = at + 1
        break
      }
    }
    result.splice(insertAt, 0, { key, active: true })
    seen.add(key)
  }

  return result
}
