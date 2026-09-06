/**
 * The listing toolbar's vocabulary — grid density, sort, and the size/length
 * facets — kept in one place because the page reads these to build its query
 * and the toolbar reads them to build its links, and the two disagreeing is how
 * a filter ends up highlighted while returning unfiltered results.
 *
 * Everything lives in the URL rather than component state: a filtered listing
 * is a thing people paste to each other and reload, and a client-side-only
 * filter loses on both.
 */

export const COLLECTION_VIEWS = [
  { value: "large", label: "Large", cols: 2 },
  { value: "default", label: "Default", cols: 4 },
  { value: "compact", label: "Compact", cols: 6 },
] as const

export type CollectionView = (typeof COLLECTION_VIEWS)[number]["value"]

export const DEFAULT_VIEW: CollectionView = "default"

/**
 * Tailwind cannot see a class it has to build at runtime, so the grid classes
 * are written out per density rather than interpolated from `cols`.
 */
export const VIEW_GRID_CLASS: Record<CollectionView, string> = {
  large: "grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6",
  default: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
  compact: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3",
}

/** `sizes` for the card image, which changes with how many fit across. */
export const VIEW_IMAGE_SIZES: Record<CollectionView, string> = {
  large: "(max-width: 640px) 100vw, 45vw",
  default: "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw",
  compact: "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 16vw",
}

export function parseView(raw: unknown): CollectionView {
  return COLLECTION_VIEWS.some((v) => v.value === raw) ? (raw as CollectionView) : DEFAULT_VIEW
}

export const COLLECTION_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "bestselling", label: "Best Selling" },
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
] as const

export type CollectionSort = (typeof COLLECTION_SORTS)[number]["value"]

export function parseSort(raw: unknown): CollectionSort {
  return COLLECTION_SORTS.some((s) => s.value === raw) ? (raw as CollectionSort) : "newest"
}

/**
 * A facet arrives as `?size=M&size=L` or `?size=M,L` depending on how the link
 * was built; both are read, trimmed and de-duplicated so the two forms cannot
 * behave differently.
 */
export function parseFacet(raw: string | string[] | undefined): string[] {
  const parts = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","))
  return Array.from(new Set(parts.map((v) => v.trim()).filter(Boolean)))
}

/** The facets the drawer offers, in the order it lists them. */
export const FACET_SECTIONS = [
  { key: "categories", label: "Category" },
  { key: "colors", label: "Color" },
  { key: "sizes", label: "Size" },
  { key: "lengths", label: "Length" },
] as const

export type FacetKey = (typeof FACET_SECTIONS)[number]["key"]

/**
 * One row in a facet list.
 *
 * `children` turns the row into a group: Category is two levels deep, and a
 * flat list of every leaf runs to twenty rows on a top-level page. A group is
 * an expander, not a checkbox — ticking "Tops" and ticking "Button Shirts"
 * would otherwise be two ways to say overlapping things.
 */
export interface FacetOption {
  value: string
  label: string
  count: number
  children?: FacetOption[]
}

/** Every tickable row, groups flattened away — for looking a label up by id. */
export function flattenFacetOptions(options: FacetOption[]): FacetOption[] {
  return options.flatMap((option) =>
    option.children?.length ? flattenFacetOptions(option.children) : [option]
  )
}

export type FacetOptions = Record<FacetKey, FacetOption[]>

export interface CollectionQuery {
  sub?: string
  sort: CollectionSort
  view: CollectionView
  categories: string[]
  colors: string[]
  sizes: string[]
  lengths: string[]
}

/**
 * Rebuilds the listing URL with one thing changed. Defaults are left out so the
 * plain listing keeps a clean address, which is also what makes the canonical
 * in `generateMetadata` honest.
 */
export function buildCollectionHref(
  basePath: string,
  current: CollectionQuery,
  patch: Partial<CollectionQuery>
): string {
  const next = { ...current, ...patch }
  const params = new URLSearchParams()

  if (next.sub) params.set("sub", next.sub)
  if (next.sort !== "newest") params.set("sort", next.sort)
  if (next.view !== DEFAULT_VIEW) params.set("view", next.view)
  if (next.categories.length) params.set("cat", next.categories.join(","))
  if (next.colors.length) params.set("color", next.colors.join(","))
  if (next.sizes.length) params.set("size", next.sizes.join(","))
  if (next.lengths.length) params.set("length", next.lengths.join(","))

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

/** How many boxes are ticked, across every facet. */
export function countActiveFacets(query: CollectionQuery): number {
  return query.categories.length + query.colors.length + query.sizes.length + query.lengths.length
}

/** The same list with one value flipped in or out — what a facet click does. */
export function toggleFacetValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}
