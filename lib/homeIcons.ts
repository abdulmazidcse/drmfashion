/**
 * The "Featured Icons" grid — a curated wall of photography behind a Men/Women
 * toggle, the way American Tall runs their "10 Iconic Styles" block.
 *
 * Deliberately not another <ProductShowcase> row, and deliberately not bound to
 * Product rows either. A showcase row is a strip of product *cards*: price,
 * swatches, quick-buy. This is the editorial cut — each tile is its own
 * photograph, caption and link, so it can point at a category, a lookbook page
 * or a single product, and can use a styled shot that is nothing like the
 * product's own thumbnail.
 */

export const HOME_ICONS_SETTING_KEY = "home_icons"

export interface HomeIconTile {
  /** Required. A tile with no image is dropped when the setting is read. */
  image: string
  /** Shown on hover, and used as the image's alt text. */
  title: string
  /** Where the tile links to. Empty means the tile is not clickable. */
  href: string
}

export interface HomeIconsConfig {
  active: boolean
  title: string
  /** A word inside `title` rendered in grey — same contract as SectionHeading. */
  highlight: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  men: HomeIconTile[]
  women: HomeIconTile[]
}

/** Per tab. Beyond this the grid stops being a curation. */
export const MAX_HOME_ICONS = 18

export const EMPTY_HOME_ICON_TILE: HomeIconTile = { image: "", title: "", href: "" }

export const DEFAULT_HOME_ICONS: HomeIconsConfig = {
  active: true,
  title: "The Icons",
  highlight: "Icons",
  subtitle: "The pieces our tall community keeps coming back to.",
  ctaLabel: "",
  ctaHref: "",
  men: [],
  women: [],
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function toTile(raw: unknown): HomeIconTile {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    image: str(f.image, ""),
    title: str(f.title, ""),
    href: str(f.href, ""),
  }
}

function toTiles(raw: unknown): HomeIconTile[] {
  // Entries that are bare strings are ignored rather than coerced: an earlier
  // draft of this setting stored product ids, and a lone id carries no image.
  return (Array.isArray(raw) ? raw : [])
    .filter((entry) => entry && typeof entry === "object")
    .map(toTile)
    .slice(0, MAX_HOME_ICONS)
}

/**
 * `keepEmpty` separates the two callers: the admin editor needs the blank tile
 * it just added to survive a reload, the storefront must not render a hole in
 * the grid.
 */
export function parseHomeIcons(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): HomeIconsConfig {
  if (!raw) return DEFAULT_HOME_ICONS

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_HOME_ICONS
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const keep = (tiles: HomeIconTile[]) => (keepEmpty ? tiles : tiles.filter((t) => t.image))

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_HOME_ICONS.active,
    title: str(f.title, DEFAULT_HOME_ICONS.title),
    highlight: str(f.highlight, DEFAULT_HOME_ICONS.highlight),
    subtitle: str(f.subtitle, DEFAULT_HOME_ICONS.subtitle),
    ctaLabel: str(f.ctaLabel, ""),
    ctaHref: str(f.ctaHref, ""),
    men: keep(toTiles(f.men)),
    women: keep(toTiles(f.women)),
  }
}
