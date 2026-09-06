/**
 * Pulling images back out of editor HTML, with the copy attached to them.
 *
 * The rich-text editor already lets an author set alt text and a caption on an
 * image (`imageTextAlternative` / `toggleImageCaption` in RichTextEditor), and
 * stores a captioned image as:
 *
 *   <figure class="image"><img src="…" alt="…"><figcaption>…</figcaption></figure>
 *
 * Legacy pages re-lay that markup out into their own section grid rather than
 * printing the body verbatim, so they have to lift the image out of the HTML.
 * Matching on `src` alone — which is what they used to do — silently dropped
 * both the alt text and the caption on the way through, leaving every image on
 * a page labelled with the section heading no matter what the author wrote.
 *
 * There is no DOM here (this runs while rendering on the server), so these are
 * regexes rather than a parser. They are deliberately narrow: an image, and the
 * `<figure>` around it when one is present.
 */

export interface HtmlImage {
  /** The exact markup matched, so callers can strip precisely what they took. */
  match: string
  src: string
  /** "" when the author left the alternative text empty. */
  alt: string
  /** "" when the image has no caption. */
  caption: string
}

const IMG_TAG = /<img\b[^>]*>/i
const FIGURE_WITH_IMG = /<figure\b[^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/figure>/i

/** Reads one attribute off a single tag's source text. */
function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"))
  return decodeEntities(match?.[2] ?? match?.[3] ?? "")
}

/**
 * The five named entities an editor is obliged to escape, plus any numeric
 * reference. Accented and symbol characters are stored literally as UTF-8 by
 * the editor, so the long named table (`&eacute;` and friends) is not worth
 * carrying; anything outside this set survives as written.
 *
 * `&amp;` runs last so "&amp;lt;" does not collapse into a literal "<".
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

/** Visible text of a caption, with its inline markup removed. */
function captionText(figure: string): string {
  const match = figure.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)
  if (!match) return ""
  return decodeEntities(match[1].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim()
}

/**
 * The first image in `html`, as a figure when it is captioned and as a bare tag
 * otherwise. Returns null when there is no image at all.
 */
export function firstHtmlImage(html: string): HtmlImage | null {
  if (!html) return null

  const figure = html.match(FIGURE_WITH_IMG)
  const img = html.match(IMG_TAG)
  if (!img) return null

  // A figure only wins when it is the one wrapping this first image; an image
  // earlier in the body than any figure is its own match.
  const useFigure =
    figure != null && figure.index != null && img.index != null && figure.index <= img.index

  const match = useFigure ? figure![0] : img[0]
  const tag = useFigure ? (match.match(IMG_TAG)?.[0] ?? img[0]) : img[0]

  return {
    match,
    src: attr(tag, "src"),
    alt: attr(tag, "alt"),
    caption: useFigure ? captionText(match) : "",
  }
}

/** Removes every image from `html`, captions and their figures included. */
export function stripHtmlImages(html: string): string {
  return html
    .replace(new RegExp(FIGURE_WITH_IMG.source, "gi"), "")
    .replace(new RegExp(IMG_TAG.source, "gi"), "")
}
