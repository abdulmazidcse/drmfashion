/**
 * Homepage product showcase rows — "Our Bestselling Jeans" and friends.
 *
 * A row is a titled, horizontally scrolling strip of product cards. Unlike
 * <BestSellers>, which computes its own list out of the order table, the rows
 * here are editorial: the admin decides what the strip is called and where its
 * products come from, in Settings → Homepage → Product Showcase.
 *
 * Four sources are offered so a row can be either hand-picked or self-updating:
 *   manual   — an explicit, ordered list of products
 *   category — the newest published products in one category (children included)
 *   featured — products flagged `featured`
 *   newest   — the newest published products in the catalogue
 *
 * The whole thing lives in one `home_product_showcase` Setting. The default is
 * a single inactive row, so a store that never opens the tab shows nothing.
 */

export const HOME_SHOWCASE_SETTING_KEY = "home_product_showcase"

export type HomeShowcaseSource = "manual" | "category" | "featured" | "newest"

export const HOME_SHOWCASE_SOURCES: { value: HomeShowcaseSource; label: string; hint: string }[] = [
  { value: "manual", label: "Hand-picked", hint: "Exactly the products you tick, in the order you tick them." },
  { value: "category", label: "Category", hint: "Newest published products in one category, its sub-categories included." },
  { value: "featured", label: "Featured", hint: "Products flagged as Featured in Admin → Products." },
  { value: "newest", label: "Newest", hint: "The most recently added products in the catalogue." },
]

export interface HomeShowcaseRow {
  active: boolean
  title: string
  /** A word inside `title` rendered in grey — same contract as SectionHeading. */
  highlight: string
  subtitle: string
  /** Right-hand link above the strip. Both fields are needed for it to render. */
  ctaLabel: string
  ctaHref: string
  source: HomeShowcaseSource
  /** `manual` only. Order matters — the strip follows it. */
  productIds: string[]
  /** `category` only. */
  categoryId: string
  /** How many cards the strip holds, for every source but `manual`. */
  limit: number
}

export interface HomeShowcaseConfig {
  /** Master switch for every row. */
  active: boolean
  rows: HomeShowcaseRow[]
}

/** Admin UI cap. Four full-width strips is already a long homepage. */
export const MAX_HOME_SHOWCASE_ROWS = 4
/** Per row. The strip scrolls, but past this it is just a slow page. */
export const MAX_HOME_SHOWCASE_PRODUCTS = 24
export const MIN_HOME_SHOWCASE_LIMIT = 4
export const DEFAULT_HOME_SHOWCASE_LIMIT = 12

export const EMPTY_HOME_SHOWCASE_ROW: HomeShowcaseRow = {
  active: true,
  title: "Our Bestselling Jeans",
  highlight: "Jeans",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  source: "manual",
  productIds: [],
  categoryId: "",
  limit: DEFAULT_HOME_SHOWCASE_LIMIT,
}

export const DEFAULT_HOME_SHOWCASE: HomeShowcaseConfig = {
  active: true,
  rows: [],
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function isSource(raw: unknown): raw is HomeShowcaseSource {
  return HOME_SHOWCASE_SOURCES.some(s => s.value === raw)
}

function toRow(raw: unknown): HomeShowcaseRow {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  const limitRaw = Number(f.limit)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_HOME_SHOWCASE_PRODUCTS, Math.max(MIN_HOME_SHOWCASE_LIMIT, Math.round(limitRaw)))
    : DEFAULT_HOME_SHOWCASE_LIMIT

  return {
    active: typeof f.active === "boolean" ? f.active : true,
    title: str(f.title, EMPTY_HOME_SHOWCASE_ROW.title),
    highlight: str(f.highlight, ""),
    subtitle: str(f.subtitle, ""),
    ctaLabel: str(f.ctaLabel, ""),
    ctaHref: str(f.ctaHref, ""),
    source: isSource(f.source) ? f.source : "manual",
    productIds: (Array.isArray(f.productIds) ? f.productIds : [])
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .slice(0, MAX_HOME_SHOWCASE_PRODUCTS),
    categoryId: str(f.categoryId, ""),
    limit,
  }
}

/** A row the storefront can actually fill — the admin editor keeps the rest. */
export function isRenderableShowcaseRow(row: HomeShowcaseRow): boolean {
  if (!row.active) return false
  if (row.source === "manual") return row.productIds.length > 0
  if (row.source === "category") return Boolean(row.categoryId)
  return true
}

/**
 * The stored JSON is hand-editable in the DB, so every field is checked rather
 * than spread blindly. `keepEmpty` is what separates the two callers: the admin
 * editor needs the half-configured row it just added to survive a reload, the
 * storefront does not want to render a strip with nothing in it.
 */
export function parseHomeShowcase(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): HomeShowcaseConfig {
  if (!raw) return DEFAULT_HOME_SHOWCASE

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_HOME_SHOWCASE
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const rows = (Array.isArray(f.rows) ? f.rows : [])
    .map(toRow)
    .slice(0, MAX_HOME_SHOWCASE_ROWS)

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_HOME_SHOWCASE.active,
    rows: keepEmpty ? rows : rows.filter(isRenderableShowcaseRow),
  }
}
