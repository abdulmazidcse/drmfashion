import type { Prisma } from "@prisma/client"

/** Shortest sensible query. Below this the suggestion panel stays on its idle state. */
export const MIN_SEARCH_LENGTH = 2

/**
 * Split what the shopper typed into the words every match must contain.
 *
 * The phrase used to be matched whole, so "smart fit shirt" failed against
 * "Smart Fit Easy Care Dress Shirt". Requiring each word separately fixes that,
 * and lets a brand word and a garment word land in different fields.
 */
export function searchTokens(query: string | null | undefined): string[] {
  return (query || "")
    .trim()
    .split(/\s+/)
    // A word has to carry a letter or a digit to be worth requiring. Category
    // names like "Pants + Chinos" arrive here as suggestions, and the bare "+"
    // would otherwise be a third condition every match had to satisfy.
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
    .slice(0, 8) // a pasted paragraph should not become 200 ILIKEs
}

function allTokensMatch(
  tokens: string[],
  fieldsFor: (token: string) => Prisma.ProductWhereInput[]
): Prisma.ProductWhereInput {
  return { AND: tokens.map((token) => ({ OR: fieldsFor(token) })) }
}

/**
 * Does this product match what the shopper typed — the wide reading, including
 * the description.
 *
 * Postgres `contains` is case-sensitive unless told otherwise, so "dress shirt"
 * matched nothing while the catalogue was full of "Dress Shirt". The rest of
 * the codebase already passes `mode: "insensitive"`; the storefront search
 * paths were the outliers.
 *
 * Returns `undefined` for an empty query so callers can spread it into a
 * `where` unconditionally.
 */
export function productSearchFilter(
  query: string | null | undefined
): Prisma.ProductWhereInput | undefined {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return undefined

  return allTokensMatch(tokens, (token) => [
    { title: { contains: token, mode: "insensitive" } },
    { description: { contains: token, mode: "insensitive" } },
    { category: { name: { contains: token, mode: "insensitive" } } },
    { brand: { name: { contains: token, mode: "insensitive" } } },
    colorClause(token),
  ])
}

/**
 * The narrow reading: the words appear in what the garment is *called*, not
 * merely somewhere in its copy.
 *
 * This is the relevance tier. Searching "dress shirt" across descriptions
 * surfaces jeans whose copy happens to say "dress" and "shirt" in separate
 * sentences — true matches, but not what was asked for. Callers lead with this
 * set and fall back to {@link productSearchFilter} for the remainder.
 */
export function productNameSearchFilter(
  query: string | null | undefined
): Prisma.ProductWhereInput | undefined {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return undefined

  return allTokensMatch(tokens, (token) => [
    { title: { contains: token, mode: "insensitive" } },
    { category: { name: { contains: token, mode: "insensitive" } } },
    { brand: { name: { contains: token, mode: "insensitive" } } },
    colorClause(token),
  ])
}

/**
 * Does any colourway of this product go by that word.
 *
 * Colour lives on the variant, not the product, so "blue" used to match nothing
 * at all — the catalogue holds "Urban Blue", "Midnight Navy" and a dozen more,
 * and none of them appear in a title. Deleted variants are excluded: a colour
 * that was withdrawn should not keep pulling the product into results.
 */
function colorClause(token: string): Prisma.ProductWhereInput {
  return {
    variants: {
      some: { deletedAt: null, color: { contains: token, mode: "insensitive" } },
    },
  }
}

/** A colourway, as much of one as naming it in a result needs. */
export interface ColorwayCandidate {
  color: string
  image?: string | null
}

/**
 * The colourway a result should be labelled with, or null to leave the title
 * alone.
 *
 * Only a colour the shopper actually asked for earns a label. Naming one
 * regardless would mean picking whichever variant happened to be first — so a
 * garment sold in eight colours would be announced as "in Olive" to someone who
 * never mentioned olive, which reads as a stock restriction rather than a
 * detail. Preferring a candidate that carries an image keeps the card's picture
 * and its label describing the same thing.
 */
export function matchedColorway<T extends ColorwayCandidate>(
  query: string | null | undefined,
  candidates: T[]
): T | null {
  const tokens = searchTokens(query).map((t) => t.toLowerCase())
  if (tokens.length === 0) return null

  const matches = candidates.filter((c) => {
    const color = c.color?.toLowerCase()
    return color ? tokens.some((t) => color.includes(t)) : false
  })
  if (matches.length === 0) return null

  return matches.find((c) => c.image?.trim()) ?? matches[0]
}

/**
 * The colour a search result's title should be labelled with.
 *
 * The colourway the query named when it named one — someone who typed "chinos
 * blue" is answered in blue — and otherwise the product's first, because a
 * result list where only some cards carry a colour reads as inconsistent
 * rather than precise. Browsing listings pass no query and so never get here.
 */
export function searchResultColor(
  query: string | null | undefined,
  candidates: ColorwayCandidate[]
): string | null {
  const named = matchedColorway(query, candidates)?.color?.trim()
  if (named) return named

  return candidates.find((c) => c.color?.trim())?.color?.trim() ?? null
}
