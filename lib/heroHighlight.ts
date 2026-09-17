/**
 * The product card floating over the hero image.
 *
 * It used to be entirely automatic: whichever product topped this month's
 * best-seller list, captioned "Best seller this month", with no way to point it
 * somewhere else or take it down. That is still the behaviour when nothing is
 * filled in here — leaving the picker empty is how you ask for it back — but a
 * store running a launch can now name the product and write the caption.
 *
 * Stored inside the `home_hero_slides` setting rather than beside it, because
 * the card belongs to the hero and there is exactly one of it, whichever slide
 * is showing.
 */

export interface HeroHighlightConfig {
  /** Off hides the card outright. */
  active: boolean
  /** Empty means "whatever the homepage would have picked on its own". */
  productId: string
  /** Empty means the automatic caption below. */
  note: string
}

/** What the card said before any of this was configurable. */
export const HERO_HIGHLIGHT_BEST_SELLER_NOTE = "Best seller this month"
export const HERO_HIGHLIGHT_NEWEST_NOTE = "New this week"

export const DEFAULT_HERO_HIGHLIGHT: HeroHighlightConfig = {
  active: true,
  productId: "",
  note: "",
}

/**
 * Reads the `highlight` block out of an already-parsed `home_hero_slides`.
 *
 * Takes the block rather than the raw JSON string: the hero setting is parsed
 * once by its own caller, which also rewrites the image paths, and re-parsing
 * it here would mean doing that work twice and keeping the two in step.
 */
export function parseHeroHighlight(raw: unknown): HeroHighlightConfig {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_HERO_HIGHLIGHT.active,
    productId: typeof f.productId === "string" ? f.productId : "",
    note: typeof f.note === "string" ? f.note : "",
  }
}
