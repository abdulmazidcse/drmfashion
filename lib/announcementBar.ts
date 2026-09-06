/**
 * The strip above the header — "Tall Men's & Tall Women's Clothing up to 7'1"",
 * free-shipping thresholds, promo codes.
 *
 * It sits in the document above the sticky header, so it scrolls away on the
 * first swipe and never eats viewport for the rest of the session.
 */

export const ANNOUNCEMENT_BAR_SETTING_KEY = "announcement_bar"

export interface AnnouncementSlide {
  text: string
  /** Optional. With a link the whole slide becomes clickable. */
  href: string
}

export interface AnnouncementBarConfig {
  active: boolean
  /** Seconds each slide is held. 0 stops the rotation and shows the first only. */
  intervalSeconds: number
  background: string
  textColor: string
  /** Whether the visitor can close it for the rest of the session. */
  dismissible: boolean
  slides: AnnouncementSlide[]
}

export const MAX_ANNOUNCEMENT_SLIDES = 5

export const DEFAULT_ANNOUNCEMENT_BAR: AnnouncementBarConfig = {
  active: false,
  intervalSeconds: 5,
  background: "#101010",
  textColor: "#ffffff",
  dismissible: false,
  slides: [],
}

export const EMPTY_ANNOUNCEMENT_SLIDE: AnnouncementSlide = { text: "", href: "" }

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

/** Anything that is not a `#rrggbb`/`#rgb` literal is refused. The value is
 *  interpolated into an inline style, so it must not be free text. */
function color(raw: unknown, fallback: string): string {
  return typeof raw === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw.trim())
    ? raw.trim()
    : fallback
}

function toSlide(raw: unknown): AnnouncementSlide {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return { text: str(f.text, ""), href: str(f.href, "") }
}

/**
 * `keepEmpty` separates the two callers: the admin editor needs the blank row
 * it just added to survive a reload, the storefront must not render a slide
 * with nothing written on it.
 */
export function parseAnnouncementBar(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): AnnouncementBarConfig {
  if (!raw) return DEFAULT_ANNOUNCEMENT_BAR

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_ANNOUNCEMENT_BAR
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const seconds = typeof f.intervalSeconds === "number" ? f.intervalSeconds : NaN
  const slides = (Array.isArray(f.slides) ? f.slides : [])
    .map(toSlide)
    .slice(0, MAX_ANNOUNCEMENT_SLIDES)

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_ANNOUNCEMENT_BAR.active,
    // Clamped: a one-second rotation is unreadable and a stored 0.001 would
    // spin the bar every frame.
    intervalSeconds: Number.isFinite(seconds)
      ? seconds <= 0
        ? 0
        : Math.min(30, Math.max(2, seconds))
      : DEFAULT_ANNOUNCEMENT_BAR.intervalSeconds,
    background: color(f.background, DEFAULT_ANNOUNCEMENT_BAR.background),
    textColor: color(f.textColor, DEFAULT_ANNOUNCEMENT_BAR.textColor),
    dismissible:
      typeof f.dismissible === "boolean" ? f.dismissible : DEFAULT_ANNOUNCEMENT_BAR.dismissible,
    slides: keepEmpty ? slides : slides.filter((s) => s.text.trim()),
  }
}
