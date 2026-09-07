import { Prisma } from "@prisma/client"
import { readVariantImages, writeVariantImage } from "@/lib/imageMeta"

/**
 * Variant rows arrive from the admin form as free-form JSON, and a blank number
 * input is the shape that hurts: `parseInt("")` is NaN, Prisma rejects NaN for
 * an Int column with a `PrismaClientValidationError` — which carries no error
 * code — and the route's `P2002` check misses it, so a save that is one empty
 * box away from working used to fail as a flat "Something went wrong".
 *
 * Everything a variant row needs is coerced and checked here instead, once, so
 * both the create and the update route report the offending row by SKU.
 */

export type NormalizedVariant = {
  sku: string
  size: string
  color: string
  length: string | null
  stock: number
  price: number | null
  image: string | null
  images: Prisma.InputJsonValue
}

export type VariantInputResult =
  | { ok: true; variants: NormalizedVariant[] }
  | { ok: false; message: string }

const text = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim())

/** Row label for error messages: the SKU when there is one, else its position. */
function rowLabel(raw: { sku?: unknown }, index: number): string {
  const sku = text(raw.sku)
  return sku ? `"${sku}"` : `row ${index + 1}`
}

/**
 * Blank means "none": an untouched stock box is zero, not a failed save. Only a
 * value that is present and genuinely not a number is an error.
 */
function toStock(value: unknown, label: string): number | { error: string } {
  const raw = text(value)
  if (raw === "") return 0

  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: `Stock for ${label} is "${raw}", which is not a number.` }
  if (n < 0) return { error: `Stock for ${label} cannot be negative.` }
  return Math.floor(n)
}

function toPrice(value: unknown, label: string): number | null | { error: string } {
  const raw = text(value)
  if (raw === "") return null

  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: `Price for ${label} is "${raw}", which is not a number.` }
  if (n < 0) return { error: `Price for ${label} cannot be negative.` }
  return n
}

/**
 * Coerces the posted rows and reports the first thing wrong with them. A
 * duplicate SKU inside one payload is checked here too: the rows are written in
 * a loop, so the second one would otherwise reach Postgres as a unique
 * violation and blame the catalogue rather than the form the merchant is
 * looking at.
 */
export function normalizeVariantInput(variants: unknown): VariantInputResult {
  if (!Array.isArray(variants)) return { ok: true, variants: [] }

  const normalized: NormalizedVariant[] = []
  const seenSkus = new Map<string, number>()

  for (const [index, raw] of variants.entries()) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, message: `Variant row ${index + 1} is empty. Remove it and save again.` }
    }

    const row = raw as Record<string, unknown>
    const label = rowLabel(row, index)

    const size = text(row.size)
    if (!size) return { ok: false, message: `Pick a size for ${label}.` }

    const color = text(row.color)
    if (!color) return { ok: false, message: `Pick a colour for ${label}.` }

    // A blank SKU keeps its old behaviour — a generated placeholder — rather
    // than blocking a save that used to go through. Only genuinely unusable
    // values are refused here.
    const sku = text(row.sku) || `SKU-${Date.now().toString(36).toUpperCase()}-${index + 1}`

    const clash = seenSkus.get(sku.toUpperCase())
    if (clash !== undefined) {
      return {
        ok: false,
        message: `SKU "${sku}" is on two rows of this product (rows ${clash + 1} and ${index + 1}). Every SKU must be unique.`,
      }
    }
    seenSkus.set(sku.toUpperCase(), index)

    const stock = toStock(row.stock, label)
    if (typeof stock === "object") return { ok: false, message: stock.error }

    const price = toPrice(row.price, label)
    if (price !== null && typeof price === "object") return { ok: false, message: price.error }

    normalized.push({
      sku,
      size,
      color,
      length: text(row.length) || null,
      stock,
      price,
      image: text(row.image) || null,
      // Cast because the column is Json: an entry is a string or an object
      // depending on whether copy was written, which Prisma's input type
      // cannot express as a union.
      images: readVariantImages(row.images).map(writeVariantImage) as Prisma.InputJsonValue,
    })
  }

  return { ok: true, variants: normalized }
}

/**
 * What actually went wrong, for the admin looking at the dialog.
 *
 * `PrismaClientValidationError` has no `code`, so a route that only inspects
 * `P2002` falls through to its catch-all and the real reason never leaves the
 * server log. Every branch here is deliberate: the message is read by a
 * merchant, not a crawler, and the route is behind the admin guard.
 */
export function describeWriteError(error: unknown): { message: string; status: number } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta as { target?: string[] } | undefined)?.target
      const field = Array.isArray(target) ? target.join(", ") : "SKU"
      return {
        message: `That ${field} is already used by another row. Make every ${field} unique and save again.`,
        status: 400,
      }
    }
    if (error.code === "P2003") {
      return {
        message: "This product points at a category, brand or size chart that no longer exists. Re-pick it and save again.",
        status: 400,
      }
    }
    if (error.code === "P2025") {
      return { message: "The record was changed or removed by someone else. Reload the page and try again.", status: 409 }
    }
    return { message: `Database error ${error.code}. ${error.message.split("\n").pop()?.trim() || ""}`.trim(), status: 400 }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // Prisma prints the offending argument on the last line of a long block.
    const detail = error.message.split("\n").map((l) => l.trim()).filter(Boolean).pop()
    return {
      message: `A field was sent in the wrong shape${detail ? `: ${detail}` : ""}. Check the stock and price boxes on the variant rows.`,
      status: 400,
    }
  }

  return { message: error instanceof Error ? error.message : "Something went wrong during update", status: 500 }
}
