/**
 * Shared helpers for the Journal (blog) module.
 * Used by both the admin API routes and the storefront pages.
 */

/** Convert an arbitrary string into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/** Strip HTML tags and decode the few entities the editor produces. */
export function stripHtml(html: string): string {
  return (html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** Rough reading time in minutes (200 wpm), never below 1. */
export function estimateReadTime(html: string): number {
  const words = stripHtml(html).split(" ").filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Build an excerpt from post content when the author didn't write one. */
export function buildExcerpt(html: string, maxLength = 180): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  const clipped = text.slice(0, maxLength)
  const lastSpace = clipped.lastIndexOf(" ")
  return `${(lastSpace > 60 ? clipped.slice(0, lastSpace) : clipped).trim()}…`
}

/** "Apr 03, 2026" — matches the date format used across the storefront journal. */
export function formatJournalDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

/** Normalise a comma separated / array tag input into a clean string array. */
export function normalizeTags(input: unknown): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : []

  const seen = new Set<string>()
  const tags: string[] = []
  for (const item of raw) {
    const tag = String(item).trim()
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    tags.push(tag)
  }
  return tags.slice(0, 20)
}

/** Number of posts shown per page on the storefront listing. */
export const JOURNAL_PAGE_SIZE = 9

// ─── Article content pipeline ────────────────────────────────────────────────
// Article bodies are HTML from the editor plus optional product shortcodes:
//   [products slug-a, slug-b, slug-c | Optional caption]
// The storefront splits the body on those shortcodes and renders real product
// cards in their place, so a story can interleave copy and shoppable grids.

export type JournalBlock =
  | { type: "html"; html: string }
  | { type: "products"; slugs: string[]; caption: string | null }

export type JournalHeading = { id: string; text: string; level: 2 | 3 }

/** Matches `[products …]`, swallowing the <p> wrapper the editor puts around it. */
const PRODUCT_SHORTCODE = /(?:<p>\s*)?\[products?\s+([^\]]+)\](?:\s*<\/p>)?/gi

/**
 * Adds stable ids to h2/h3 headings and returns them as a table of contents.
 * Ids already present in the markup are preserved.
 */
export function extractHeadings(html: string): { html: string; headings: JournalHeading[] } {
  const headings: JournalHeading[] = []
  const used = new Set<string>()

  const withIds = (html || "").replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, levelRaw, attrs: string, inner: string) => {
      const text = stripHtml(inner)
      if (!text) return match

      const existing = /\sid=["']([^"']+)["']/i.exec(attrs)
      let id = existing?.[1] || slugify(text) || `section-${headings.length + 1}`

      let suffix = 2
      while (used.has(id)) id = `${id}-${suffix++}`
      used.add(id)

      headings.push({ id, text, level: Number(levelRaw) === 3 ? 3 : 2 })

      const cleanAttrs = attrs.replace(/\sid=["'][^"']*["']/i, "")
      return `<h${levelRaw}${cleanAttrs} id="${id}">${inner}</h${levelRaw}>`
    }
  )

  return { html: withIds, headings }
}

/** Splits an article body into renderable html / product-grid blocks. */
export function splitJournalBlocks(html: string): JournalBlock[] {
  const blocks: JournalBlock[] = []
  let lastIndex = 0

  PRODUCT_SHORTCODE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PRODUCT_SHORTCODE.exec(html || "")) !== null) {
    const before = html.slice(lastIndex, match.index)
    if (before.trim()) blocks.push({ type: "html", html: before })

    const [slugPart, captionPart] = match[1].split("|")
    const slugs = slugPart
      .split(",")
      .map((s) => stripHtml(s).trim())
      .filter(Boolean)

    if (slugs.length > 0) {
      blocks.push({ type: "products", slugs, caption: captionPart ? stripHtml(captionPart).trim() : null })
    }

    lastIndex = match.index + match[0].length
  }

  const rest = (html || "").slice(lastIndex)
  if (rest.trim()) blocks.push({ type: "html", html: rest })

  return blocks
}

/** One-shot prep used by the article page: heading anchors + content blocks. */
export function prepareJournalContent(html: string): { blocks: JournalBlock[]; headings: JournalHeading[] } {
  const { html: withIds, headings } = extractHeadings(html)
  return { blocks: splitJournalBlocks(withIds), headings }
}

/**
 * Peels the lead-in copy (everything before the first h2) off the first block so
 * the table of contents can sit between the intro and the numbered sections.
 */
export function splitIntro(blocks: JournalBlock[]): { intro: string | null; rest: JournalBlock[] } {
  const first = blocks[0]
  if (!first || first.type !== "html") return { intro: null, rest: blocks }

  const headingIndex = first.html.search(/<h2[\s>]/i)
  if (headingIndex <= 0) return { intro: null, rest: blocks }

  const intro = first.html.slice(0, headingIndex)
  const remainder = first.html.slice(headingIndex)

  return {
    intro: intro.trim() ? intro : null,
    rest: [{ type: "html", html: remainder } as JournalBlock, ...blocks.slice(1)],
  }
}

/**
 * True when the intro copy already carries a working author-written contents
 * list — a `ul`/`ol` holding three or more *same-page* jump links.
 *
 * Posts pasted in from another CMS often bring their own "In this article"
 * block along, and rendering the generated table of contents underneath one
 * stacks two near-identical lists. Only same-page `href="#…"` links count: an
 * imported list whose links still point at the original domain navigates the
 * reader off the site, so it is not a substitute for the generated one.
 */
export function hasAuthoredToc(intro: string | null): boolean {
  if (!intro) return false

  for (const match of intro.matchAll(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const anchors = match[2].match(/<a\b[^>]*href\s*=\s*["']#[^"']+["']/gi)
    if (anchors && anchors.length >= 3) return true
  }
  return false
}

/** Every product slug referenced by an article body, de-duplicated. */
export function collectProductSlugs(blocks: JournalBlock[]): string[] {
  const slugs = new Set<string>()
  for (const block of blocks) {
    if (block.type === "products") block.slugs.forEach((s) => slugs.add(s))
  }
  return Array.from(slugs)
}
