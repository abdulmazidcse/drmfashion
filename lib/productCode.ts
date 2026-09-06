/**
 * The merchant-facing product code.
 *
 * Titles are not unique — two products may legitimately share one — so the code
 * is what tells them apart for staff, and the storefront slug is built from it.
 *
 * Stored as typed (minus surrounding whitespace) but compared case-insensitively:
 * "TP-1001" and "tp-1001" are the same code to a human reading a packing slip,
 * and Postgres' unique index alone would happily accept both.
 */

/** Trims a submitted code; blank becomes null, which the column allows. */
export function normalizeProductCode(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  const code = String(raw).trim().replace(/\s+/g, " ")
  return code === "" ? null : code
}

/** URL-safe form of a code, for building slugs. */
export function productCodeSlugPart(code: string): string {
  return code
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
