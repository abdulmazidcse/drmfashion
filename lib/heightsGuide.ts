/**
 * The "Our Heights & Fit" panel of the product size-chart modal.
 *
 * It is brand-level copy — the same on every product — so it lives in one
 * `product_heights_guide` Setting rather than on the Product or Category. The
 * storefront reads it through the settings provider; the admin edits it in
 * Settings → Branding.
 *
 * DEFAULT_HEIGHTS_GUIDE reproduces exactly what the modal used to hard-code, so
 * a store that never opens the new panel sees no change at all.
 */

export interface HeightsGuideModel {
  /** The only field: tiles are photos alone, with no caption beneath them.
   *  A model with no image is skipped, and the strip hides when none are set. */
  image: string
}

export interface HeightsGuide {
  heading: string
  subtitle: string
  /** Header labels. Length defines the table width; rows are kept in step. */
  columns: string[]
  /** One entry per row, each holding exactly `columns.length` cells. */
  rows: string[][]
  models: HeightsGuideModel[]
}

export const HEIGHTS_GUIDE_SETTING_KEY = "product_heights_guide"

export const DEFAULT_HEIGHTS_GUIDE: HeightsGuide = {
  heading: "Our Heights",
  subtitle: "Most of our customers use their height as a starting point when selecting a length.",
  columns: ["Your Height", "Recommended Length", "Equivalent Inseam"],
  rows: [
    [`6'0" - 6'3"`, "Semi-Tall", `34"`],
    [`6'3" - 6'7"`, "Tall", `36"`],
    [`6'8" - 7'1"`, "Extra Tall", `38" - 40"`],
  ],
  models: [{ image: "" }, { image: "" }, { image: "" }],
}

/** Reads a string field, falling back when it is missing or not a string. */
function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

/** Narrows an unknown array entry so its fields can be read without casting. */
function fields(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
}

// ─── Legacy shape ────────────────────────────────────────────────────────────
// The first version of this setting had a fixed three-column table: the headers
// lived in `columnHeight` / `columnLength` / `columnInseam`, and each row was an
// object keyed by those same three names. Both are read here and converted, so
// a store that saved before columns became editable keeps its content.

const LEGACY_HEADER_KEYS = ["columnHeight", "columnLength", "columnInseam"] as const
const LEGACY_CELL_KEYS = ["height", "length", "inseam"] as const

function parseColumns(parsed: Record<string, unknown>): string[] {
  if (Array.isArray(parsed.columns)) {
    return parsed.columns.map(column => str(column, ""))
  }

  const legacy = LEGACY_HEADER_KEYS.map(key => parsed[key])
  if (legacy.some(value => typeof value === "string")) {
    return legacy.map((value, i) => str(value, DEFAULT_HEIGHTS_GUIDE.columns[i]))
  }

  return DEFAULT_HEIGHTS_GUIDE.columns
}

/** Rows are squared off to `width` so no row can render short or overflow. */
function parseRows(parsed: Record<string, unknown>, width: number): string[][] {
  const source = Array.isArray(parsed.rows) ? parsed.rows : DEFAULT_HEIGHTS_GUIDE.rows

  return source.map((row: unknown) => {
    const cells = Array.isArray(row)
      ? row.map(cell => str(cell, ""))
      : LEGACY_CELL_KEYS.map(key => str(fields(row)[key], ""))

    return Array.from({ length: width }, (_, i) => cells[i] ?? "")
  })
}

/**
 * Parses the stored JSON into a guaranteed-complete guide.
 *
 * The value is hand-editable in the DB and one written by an older admin build
 * may lack newer fields, so every field is checked rather than spread blindly —
 * a malformed `rows` would otherwise crash the modal on a live product page.
 *
 * An explicitly empty `rows`/`columns`/`models` array is honoured (that is how
 * an admin hides the table or the photo strip); only a missing or non-array
 * value falls back to the defaults.
 */
export function parseHeightsGuide(raw?: string | null): HeightsGuide {
  if (!raw?.trim()) return DEFAULT_HEIGHTS_GUIDE

  let parsed: Record<string, unknown>
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_HEIGHTS_GUIDE
    parsed = value as Record<string, unknown>
  } catch {
    return DEFAULT_HEIGHTS_GUIDE
  }

  const columns = parseColumns(parsed)

  return {
    heading: str(parsed.heading, DEFAULT_HEIGHTS_GUIDE.heading),
    subtitle: str(parsed.subtitle, DEFAULT_HEIGHTS_GUIDE.subtitle),
    columns,
    rows: parseRows(parsed, columns.length),
    // Values written before the captions were dropped still carry `label` and
    // `range`; both are ignored here and fall away on the next save.
    models: Array.isArray(parsed.models)
      ? parsed.models.map((model: unknown) => ({ image: str(fields(model).image, "") }))
      : DEFAULT_HEIGHTS_GUIDE.models,
  }
}
