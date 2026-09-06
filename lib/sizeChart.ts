/**
 * Which size chart a product shows, and how it is converted between units.
 *
 * Charts are named entities written once in Admin → Size Charts and pointed at
 * by a product. There is no inheritance: a product either names a chart or
 * offers none, which is the whole reason the category-level table was dropped —
 * an inherited chart was silently attaching the wrong measurements to products
 * that merely happened to sit under the same category.
 *
 * The "how to measure" copy still inherits up the category chain, because a
 * measuring guide genuinely is a per-category thing: how you measure a chest
 * does not change between two shirts.
 */

export type ChartUnit = "in" | "cm"

/**
 * Values live in ONE unit (`unit`) and are converted for display, so the admin
 * never types the same table twice. The first column is the size label and is
 * never converted.
 */
export type SizeChartTable = {
  title: string
  unit: ChartUnit
  columns: string[]
  rows: string[][]
}

export type CategoryChartNode = {
  name?: string
  howToMeasure?: string | null
  howToMeasureImage?: string | null
  parent?: CategoryChartNode | null
} | null

/**
 * First non-empty value going up the category chain.
 *
 * Guarded against a cycle in the parent links — bad data must not hang render.
 */
function findUpChain<T>(
  start: CategoryChartNode,
  pick: (node: NonNullable<CategoryChartNode>) => T | null
): { value: T; categoryName: string | null } | null {
  const seen = new Set<CategoryChartNode>()
  let node = start

  while (node && !seen.has(node)) {
    seen.add(node)

    const value = pick(node)
    if (value !== null) return { value, categoryName: node.name ?? null }

    node = node.parent ?? null
  }

  return null
}

export type ResolvedSizeChart = {
  /** The chart the product names, or null when it names none. */
  table: SizeChartTable | null
  /** The chart's admin-facing name, for the caption. */
  chartName: string | null
}

/** The shape `resolveSizeChart` needs off a product — its related SizeChart. */
export type ProductChartNode = {
  sizeChart?: { name?: string | null; table?: unknown } | null
} | null

const CM_PER_INCH = 2.54

/** Rounds to the nearest half — how the hand-written cm table was built. */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * Converts every number inside a cell, leaving the text around them alone, so
 * "35-37" becomes "89-94" and "14.5 / 15" becomes "37 / 38".
 */
export function convertCell(cell: string, from: ChartUnit, to: ChartUnit): string {
  if (from === to) return cell

  const factor = to === "cm" ? CM_PER_INCH : 1 / CM_PER_INCH

  return cell.replace(/\d+(\.\d+)?/g, (match) => String(roundHalf(Number(match) * factor)))
}

/** The table's rows in the requested unit. The label column is passed through. */
export function tableInUnit(table: SizeChartTable, unit: ChartUnit): string[][] {
  if (table.unit === unit) return table.rows

  return table.rows.map((row) => row.map((cell, i) => (i === 0 ? cell : convertCell(cell, table.unit, unit))))
}

/**
 * Accepts whatever came out of the Json column (or an admin request body) and
 * returns a usable table, or null when there is nothing worth rendering. Rows
 * are padded/trimmed to the column count so a half-filled table still renders.
 */
export function normalizeSizeChartTable(raw: unknown): SizeChartTable | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const input = raw as Record<string, unknown>

  const columns = Array.isArray(input.columns)
    ? input.columns.map((c) => String(c ?? "").trim()).filter((c) => c !== "")
    : []
  if (columns.length === 0) return null

  const rawRows = Array.isArray(input.rows) ? input.rows : []
  const rows = rawRows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => columns.map((_, i) => String(row[i] ?? "").trim()))
    // A row with nothing in it is an empty "add another" line, not data.
    .filter((row) => row.some((cell) => cell !== ""))

  if (rows.length === 0) return null

  return {
    title: String(input.title ?? "").trim() || "Size Chart",
    unit: input.unit === "cm" ? "cm" : "in",
    columns,
    rows,
  }
}

export function resolveSizeChart(product: ProductChartNode): ResolvedSizeChart {
  const chart = product?.sizeChart
  if (!chart) return { table: null, chartName: null }

  const table = normalizeSizeChartTable(chart.table)
  if (!table) return { table: null, chartName: null }

  return { table, chartName: chart.name?.trim() || null }
}

export type ResolvedHowToMeasure = {
  /** Admin-authored HTML, or null to fall back to the built-in guide. */
  html: string | null
  categoryName: string | null
}

/** The measuring guide for a product, inherited up its category chain. */
export function resolveHowToMeasure(
  product: { category?: CategoryChartNode } | null | undefined
): ResolvedHowToMeasure {
  const found = findUpChain(product?.category ?? null, (node) => {
    const html = node.howToMeasure?.trim()
    // The rich-text editor emits "<p></p>" for an empty document.
    if (!html || !stripTags(html)) return null
    return html
  })

  return found ? { html: found.value, categoryName: found.categoryName } : { html: null, categoryName: null }
}

/**
 * The figure illustration for a product's measuring guide, inherited up the
 * category chain independently of the copy — a parent can supply the picture
 * while a child overrides only the words.
 */
export function resolveHowToMeasureImage(
  product: { category?: CategoryChartNode } | null | undefined
): string | null {
  const found = findUpChain(product?.category ?? null, (node) => node.howToMeasureImage?.trim() || null)
  return found ? found.value : null
}

/** Text content of an HTML string — used only to tell empty copy from real copy. */
function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()
}

/** The body points the size-guide figure can annotate. */
export type MeasurePoint =
  | "neck"
  | "shoulder"
  | "chest"
  | "sleeve"
  | "bicep"
  | "wrist"
  | "waist"
  | "hips"
  | "shirtLength"
  | "thigh"
  | "knee"
  | "calf"
  | "inseam"
  | "outseam"
  | "ankle"

/**
 * Which body point a step is about, matched on the measurement's name.
 *
 * Order matters: the first pattern to hit wins, so anything that contains a
 * shorter name must come first — "inseam"/"outseam" before "seam", "shoulder"
 * before "sleeve", "upper arm" before plain "arm".
 *
 * Spellings are deliberately loose. The store's own template fields are typed
 * as "sholder", "thai" and "hep", and a shopper-facing guide is written by hand,
 * so common misspellings resolve to the same point rather than silently
 * dropping the dot.
 */
export const POINT_PATTERNS: [MeasurePoint, RegExp][] = [
  ["outseam", /\b(out-?seams?|outter\s*seams?|side\s*seams?|outside\s*leg)\b/i],
  ["inseam", /\b(in-?seams?|inseem|inside\s*leg|inner\s*leg)\b/i],
  ["shirtLength", /\b(shirt\s*len\w*|body\s*len\w*|back\s*len\w*|garment\s*len\w*|nape|hem)\b/i],
  ["shoulder", /\b(shoulders?|sholders?|sholuders?|shouder|shoulder\s*width)\b/i],
  ["sleeve", /\b(sleeves?|sleve|sleeves?\s*len\w*|arm\s*len\w*)\b/i],
  ["bicep", /\b(bicep|biceps|bicep\s*round|upper\s*arm|arm\s*hole|armhole|arm)\b/i],
  ["wrist", /\b(wrist|wirst|cuff|cuffs)\b/i],
  ["neck", /\b(neck|nek|nack|collar|coller)\b/i],
  ["chest", /\b(chest|chset|ches|bust|burst)\b/i],
  ["waist", /\b(waists?|waist\s*line|waistline|wiast|wist|waste)\b/i],
  ["hips", /\b(hips?|hep|hip\s*round|seat|him)\b/i],
  ["thigh", /\b(thighs?|thai|thig|thight)\b/i],
  ["knee", /\b(knees?|kne)\b/i],
  ["calf", /\b(calf|calves|caf)\b/i],
  ["ankle", /\b(ankles?|ancle|bottom\s*opening|leg\s*opening|bottom)\b/i],
]

/**
 * The step labels in a guide, in the order written. A label is the bit before
 * the first colon ("1. Sleeve Length: measure from…"), or the whole line when
 * there is no colon — matching against the label only, never the description,
 * so "measure down to your wrist" inside the chest step cannot pull in a
 * sleeve point.
 */
function guideLabels(html: string): string[] {
  const text = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":")
      const label = colon > -1 && colon <= 40 ? line.slice(0, colon) : line
      // Drop any "1." / "2)" the admin typed in front of the name.
      return label.replace(/^\s*\d{1,2}\s*[.)]\s*/, "").trim()
    })
    .filter(Boolean)
}

/**
 * Which points the figure should annotate, in the order the guide names them.
 *
 * Driven by the measurement names the admin actually wrote, so a guide covering
 * only neck and waist lights up those two spots rather than the first two dots
 * on the body. A name we don't recognise simply gets no dot, and a guide that
 * names nothing gets none at all.
 */
/** The body point a size-chart column is asking for, or null if it is not one. */
export function columnPoint(column: string): MeasurePoint | null {
  const hit = POINT_PATTERNS.find(([, pattern]) => pattern.test(column))
  return hit ? hit[0] : null
}

export function guidePoints(html: string): MeasurePoint[] {
  const found: MeasurePoint[] = []

  for (const label of guideLabels(html)) {
    const hit = POINT_PATTERNS.find(([, pattern]) => pattern.test(label))
    if (hit && !found.includes(hit[0])) found.push(hit[0])
  }

  return found
}
