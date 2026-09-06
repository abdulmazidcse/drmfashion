// ─── Variant availability ────────────────────────────────────────────────────
// A product's colour, size and length lists are each the set of values used
// *somewhere* in its variants — which is what the selectors should render, but
// not what they should let a shopper pick. A shirt stocked in Semi Tall S and
// Tall M..2XL uses both "S" and "Tall", yet Tall + S is not a thing that
// exists.
//
// Everything here answers one question: does a row exist for this combination?
// ─────────────────────────────────────────────────────────────────────────────

export interface VariantLike {
  color?: string | null
  size?: string | null
  length?: string | null
  stock?: number | null
}

const eq = (a?: string | null, b?: string | null) =>
  (a || "").toLowerCase() === (b || "").toLowerCase()

/**
 * True when the product is actually made in this combination.
 *
 * Length is ignored for variants that carry none, so products without a length
 * axis keep matching on colour and size alone.
 */
export function hasVariant(
  variants: VariantLike[],
  color: string,
  size: string,
  length: string
): boolean {
  return variants.some(
    (v) => eq(v.color, color) && eq(v.size, size) && (v.length ? eq(v.length, length) : true)
  )
}

/** Sizes that exist for the chosen colour and length. */
export function availableSizes(
  variants: VariantLike[],
  sizes: string[],
  color: string,
  length: string
): string[] {
  return sizes.filter((size) => hasVariant(variants, color, size, length))
}

/** Lengths that exist for the chosen colour and size. */
export function availableLengths(
  variants: VariantLike[],
  lengths: string[],
  color: string,
  size: string
): string[] {
  return lengths.filter((len) => hasVariant(variants, color, size, len))
}

/**
 * A size to fall back to when the current one stops existing.
 *
 * Returns null when nothing in `sizes` fits, which the caller should treat as
 * "leave the selection alone" rather than clearing it — an empty selector is
 * worse than a stale one.
 */
export function firstAvailableSize(
  variants: VariantLike[],
  sizes: string[],
  color: string,
  length: string
): string | null {
  return sizes.find((size) => hasVariant(variants, color, size, length)) ?? null
}


/**
 * Does any variant match the axes given? An omitted or empty axis matches
 * anything.
 *
 * This is what the quick-add card needs, where the shopper has picked one axis
 * and the other must show what is still reachable: before a length is chosen,
 * every size that exists in *some* length is fair game.
 */
export function existsWith(
  variants: VariantLike[],
  want: { color?: string; size?: string; length?: string; inStockOnly?: boolean }
): boolean {
  return variants.some((v) => {
    if (want.color && !eq(v.color, want.color)) return false
    if (want.size && !eq(v.size, want.size)) return false
    // A variant with no length of its own satisfies any length asked for.
    if (want.length && v.length && !eq(v.length, want.length)) return false
    if (want.inStockOnly && !((v.stock ?? 0) > 0)) return false
    return true
  })
}

/** The exact variant for a combination, or null when the product has none. */
export function findVariant<T extends VariantLike>(
  variants: T[],
  color: string,
  size: string,
  length: string
): T | null {
  return (
    variants.find(
      (v) => eq(v.color, color) && eq(v.size, size) && (v.length ? eq(v.length, length) : true)
    ) ?? null
  )
}

// ─── Display ordering ────────────────────────────────────────────────────────
// The Size table stores no sort order, so a variant list left in insertion
// order reads as noise: L, XL, S, M, L, XL… Ordering is reconstructed from the
// label instead — the standard alpha ladder, then numeric sizes on their own
// value, then anything unrecognised alphabetically.
// ─────────────────────────────────────────────────────────────────────────────

const ALPHA_SCALE = ["xxxs", "xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl", "xxxxl"]

const WORD_SIZES: Record<string, string> = {
  extrasmall: "xs",
  small: "s",
  medium: "m",
  large: "l",
  extralarge: "xl",
}

function normalizeSize(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s._-]/g, "")
  if (WORD_SIZES[s]) return WORD_SIZES[s]

  // "2XL" and "XXL" are the same rung of the ladder; spell the shorthand out.
  const multiplier = s.match(/^(\d+)x(s|l)$/)
  if (multiplier) return "x".repeat(Number(multiplier[1])) + multiplier[2]

  return s
}

/** Order two size labels the way a size chart runs, smallest first. */
export function compareSizes(a?: string | null, b?: string | null): number {
  const na = normalizeSize(a || "")
  const nb = normalizeSize(b || "")
  if (na === nb) return 0

  const ia = ALPHA_SCALE.indexOf(na)
  const ib = ALPHA_SCALE.indexOf(nb)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1

  // Numeric scales (waist 30/32/34, kids 6/8/10) sort as numbers, not strings,
  // so 10 lands after 8 rather than between 1 and 2.
  const fa = parseFloat(na)
  const fb = parseFloat(nb)
  const numericA = /^\d/.test(na) && !Number.isNaN(fa)
  const numericB = /^\d/.test(nb) && !Number.isNaN(fb)
  if (numericA && numericB) return fa - fb
  if (numericA) return -1
  if (numericB) return 1

  return na.localeCompare(nb)
}

/** A size list put in scale order, smallest first. */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort(compareSizes)
}

// ─── Length ordering ─────────────────────────────────────────────────────────
// Lengths are either inseam numbers (30, 32, 34…) or a named ladder (Short,
// Regular, Semi Tall, Tall, Extra Tall). Numbers sort by value, names by the
// ladder, and anything unrecognised alphabetically after both.
// ─────────────────────────────────────────────────────────────────────────────

const LENGTH_SCALE = ["petite", "short", "regular", "semitall", "tall", "extratall", "xxtall", "long", "extralong"]

// Short forms the size chips use: ST = Semi Tall, T = Tall, XT = Extra Tall.
const LENGTH_ALIASES: Record<string, string> = {
  p: "petite",
  s: "short",
  r: "regular",
  reg: "regular",
  st: "semitall",
  t: "tall",
  xt: "extratall",
  xtall: "extratall",
  xxt: "xxtall",
  l: "long",
  xl: "extralong",
}

function normalizeLength(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/[\s._-]/g, "")
  return LENGTH_ALIASES[s] || s
}

/** Order two length labels shortest first. */
export function compareLengths(a?: string | null, b?: string | null): number {
  const na = normalizeLength(a || "")
  const nb = normalizeLength(b || "")
  if (na === nb) return 0

  const fa = parseFloat(na)
  const fb = parseFloat(nb)
  const numericA = /^\d/.test(na) && !Number.isNaN(fa)
  const numericB = /^\d/.test(nb) && !Number.isNaN(fb)
  if (numericA && numericB) return fa - fb
  if (numericA) return -1
  if (numericB) return 1

  const ia = LENGTH_SCALE.indexOf(na)
  const ib = LENGTH_SCALE.indexOf(nb)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1

  return na.localeCompare(nb)
}

/** A length list in ascending order. */
export function sortLengths(lengths: string[]): string[] {
  return [...lengths].sort(compareLengths)
}

/**
 * Row order for the admin variant table: colour A→Z, then up the size scale,
 * with length as a final tiebreaker so the order is stable across renders.
 */
export function compareVariantsForDisplay(a: VariantLike, b: VariantLike): number {
  const byColor = (a.color || "").localeCompare(b.color || "", undefined, { sensitivity: "base" })
  if (byColor !== 0) return byColor

  const bySize = compareSizes(a.size, b.size)
  if (bySize !== 0) return bySize

  return compareLengths(a.length, b.length)
}
