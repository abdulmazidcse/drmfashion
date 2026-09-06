/**
 * Compact page list for a numbered pager: `1 2 3 … 30`.
 *
 * Always keeps the first page, the last page and the current page's immediate
 * neighbours, collapsing everything else into a single ellipsis, so the row
 * stays the same width whether there are eight pages or eight hundred.
 */
export function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current])
  if (current - 1 > 1) pages.add(current - 1)
  if (current + 1 < total) pages.add(current + 1)
  if (current <= 3) [2, 3].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 1, total - 2].forEach((p) => pages.add(p))

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const out: (number | "…")[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…")
    out.push(p)
    prev = p
  }
  return out
}
