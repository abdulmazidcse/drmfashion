import { columnPoint, tableInUnit, type MeasurePoint, type SizeChartTable } from "@/lib/sizeChart"

/**
 * Size recommendation from the category's own size chart.
 *
 * The wizard used to answer from hardcoded weight brackets — the same S/M/L
 * thresholds for a shirt and a pair of trousers, with no regard for what the
 * product actually stocks. This matches the shopper's measurements against the
 * chart the admin entered, so the answer moves with the data.
 *
 * Which measurements matter is not fixed either: a shirt chart has Chest and
 * Sleeve columns, trousers have Waist and Inseam, a bra has Bust and Underbust.
 * `chartPoints` reads them off the chart so the form can ask for exactly those.
 */

/** Shopper's measurements, in inches, keyed by body point. */
export type BodyMeasurements = Partial<Record<MeasurePoint, number>>

/**
 * Body points this chart can actually compare against, in column order.
 *
 * Anything unrecognised (a "Fit" or "Notes" column) is skipped, and a point
 * appearing twice is only asked for once.
 */
export function chartPoints(table: SizeChartTable): MeasurePoint[] {
  const points: MeasurePoint[] = []

  table.columns.forEach((column, index) => {
    if (index === 0) return // size label
    const point = columnPoint(column)
    if (point && !points.includes(point)) points.push(point)
  })

  return points
}

/**
 * Cells hold a single number ("38"), a range ("38-40", "38 – 40") or a number
 * with a unit ("38 in"). Returns the span the cell covers; a single number is a
 * zero-width span.
 */
function parseCell(cell: string): { min: number; max: number } | null {
  const numbers = String(cell)
    .replace(/[–—]/g, "-")
    .match(/\d+(?:\.\d+)?/g)

  if (!numbers || numbers.length === 0) return null

  const values = numbers.map(Number).filter((n) => Number.isFinite(n))
  if (values.length === 0) return null

  return { min: Math.min(...values), max: Math.max(...values) }
}

/** 0 when the measurement falls inside the row's span, else the distance to it. */
function distanceTo(span: { min: number; max: number }, value: number): number {
  if (value < span.min) return span.min - value
  if (value > span.max) return value - span.max
  return 0
}

export type SizeMatch = {
  /** Size label exactly as it appears in the chart's first column. */
  size: string
  /** Lower is better; 0 means every measurement landed inside the row. */
  distance: number
  /** Which measurements were actually compared. */
  matchedOn: MeasurePoint[]
  /** True when the chart's best row is not one the product stocks. */
  substituted: boolean
}

/**
 * Pick the chart row closest to the shopper.
 *
 * `availableSizes` is the product's own in-stock sizes: recommending a size
 * that cannot be bought is worse than recommending the nearest one that can, so
 * unavailable rows are dropped and `substituted` records that it happened.
 *
 * Returns null when nothing could be compared — no recognised column, or the
 * shopper left every relevant field blank — so the caller falls back rather
 * than inventing an answer.
 */
export function recommendSize(
  table: SizeChartTable,
  body: BodyMeasurements,
  availableSizes: string[] = []
): SizeMatch | null {
  const rows = tableInUnit(table, "in")
  if (rows.length === 0) return null

  // Column 0 is the size label and is never a measurement.
  const comparable: Array<{ index: number; point: MeasurePoint }> = []
  table.columns.forEach((column, index) => {
    if (index === 0) return
    const point = columnPoint(column)
    if (point && body[point] !== undefined) comparable.push({ index, point })
  })

  if (comparable.length === 0) return null

  const normalise = (s: string) => s.trim().toLowerCase()
  const available = availableSizes.map(normalise)

  const scored = rows
    .map((row) => {
      let total = 0
      const matchedOn: MeasurePoint[] = []

      for (const { index, point } of comparable) {
        const span = parseCell(row[index] ?? "")
        const value = body[point]
        if (!span || value === undefined) continue
        // Averaged, not summed: a chart with five columns would otherwise score
        // as five times worse than a two-column one for the same quality of fit.
        total += distanceTo(span, value)
        matchedOn.push(point)
      }

      return {
        size: (row[0] ?? "").trim(),
        distance: matchedOn.length ? total / matchedOn.length : Infinity,
        matchedOn,
      }
    })
    .filter((r) => r.size !== "" && r.matchedOn.length > 0)

  if (scored.length === 0) return null

  const best = scored.reduce((a, b) => (b.distance < a.distance ? b : a))

  if (available.length === 0) {
    return { ...best, substituted: false }
  }

  const inStock = scored.filter((r) => available.includes(normalise(r.size)))
  if (inStock.length === 0) {
    return { ...best, substituted: false }
  }

  const bestInStock = inStock.reduce((a, b) => (b.distance < a.distance ? b : a))
  return {
    ...bestInStock,
    substituted: normalise(bestInStock.size) !== normalise(best.size),
  }
}

/**
 * Length band from height, kept from the original wizard because no size chart
 * carries it. Narrowed to the lengths the product actually offers.
 */
export function recommendLength(heightInches: number, availableLengths: string[] = []): string | null {
  const band = heightInches >= 80 ? "Extra Tall" : heightInches < 75 ? "Semi-Tall" : "Tall"

  if (availableLengths.length === 0) return band

  const hit = availableLengths.find((l) => l.trim().toLowerCase() === band.toLowerCase())
  return hit ?? availableLengths[0]
}

/** Shopper-facing label and hint for each body point the form may ask for. */
export const POINT_LABELS: Record<MeasurePoint, { label: string; hint: string }> = {
  neck: { label: "Neck", hint: "Around the base of the neck" },
  shoulder: { label: "Shoulder", hint: "Seam to seam across the back" },
  chest: { label: "Chest", hint: "Around the fullest part" },
  sleeve: { label: "Sleeve", hint: "Shoulder to wrist" },
  bicep: { label: "Bicep", hint: "Around the fullest part of the upper arm" },
  wrist: { label: "Wrist", hint: "Around the wrist bone" },
  waist: { label: "Waist", hint: "Around the natural waistline" },
  hips: { label: "Hips", hint: "Around the fullest part" },
  shirtLength: { label: "Body length", hint: "Base of neck to hem" },
  thigh: { label: "Thigh", hint: "Around the fullest part" },
  knee: { label: "Knee", hint: "Around the knee" },
  calf: { label: "Calf", hint: "Around the fullest part" },
  inseam: { label: "Inseam", hint: "Crotch to ankle" },
  outseam: { label: "Outseam", hint: "Waist to ankle" },
  ankle: { label: "Ankle", hint: "Around the ankle" },
}
