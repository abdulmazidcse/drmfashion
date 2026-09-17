/**
 * The image pop-up banner — a picture that covers the screen a second or two
 * after the site loads, with copy and a call-to-action laid over it.
 *
 * Deliberately separate from the promo drawer in `promo_popup_*`. That one is
 * an email-capture form that slides in from the edge and keeps a tab on screen
 * afterwards; this is a campaign poster the visitor either clicks or closes.
 * They have different lifetimes, different copy and different dismissal rules,
 * and folding them together would mean a store could not run one without the
 * other.
 *
 * One JSON key rather than a dozen `promo_banner_*` rows, because everything
 * here is edited as a single campaign and read in one go.
 */

export const PROMO_BANNER_SETTING_KEY = "promo_banner"

/** Where the copy sits over the picture. */
export const PROMO_BANNER_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const

export type PromoBannerPosition = (typeof PROMO_BANNER_POSITIONS)[number]

/** Named rather than free numbers, so the banner cannot be typed out of shape. */
export const PROMO_BANNER_TEXT_SIZES = ["sm", "md", "lg", "xl"] as const

export type PromoBannerTextSize = (typeof PROMO_BANNER_TEXT_SIZES)[number]

export interface PromoBannerConfig {
  active: boolean

  /** Required. With no picture there is no banner, whatever else is set. */
  image: string
  /** Describes the picture to a screen reader. Empty falls back to the heading. */
  imageAlt: string

  /**
   * How wide the banner is allowed to get, in pixels.
   *
   * A ceiling, not a width: the card is still `w-full` inside the backdrop's
   * padding, so on a phone this changes nothing and the picture fills the
   * screen either way. It is the desktop size.
   */
  maxWidthPx: number

  /** Seconds after the page settles before it opens. */
  delaySeconds: number
  /** Hours to stay away once the visitor has closed it. */
  reshowHours: number

  heading: string
  headingColor: string
  headingSize: PromoBannerTextSize

  body: string
  bodyColor: string
  bodySize: PromoBannerTextSize

  position: PromoBannerPosition

  /** Both the label and the link are needed before a button is drawn. */
  buttonLabel: string
  buttonHref: string
  buttonBg: string
  buttonColor: string
}

export const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  active: false,
  image: "",
  imageAlt: "",
  maxWidthPx: 560,
  delaySeconds: 2,
  reshowHours: 4,
  heading: "",
  headingColor: "#ffffff",
  headingSize: "lg",
  body: "",
  bodyColor: "#ffffff",
  bodySize: "md",
  position: "middle-center",
  buttonLabel: "",
  buttonHref: "",
  buttonBg: "#b4703a",
  buttonColor: "#ffffff",
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

/** Clamped rather than trusted: these drive a timer and a dismissal window. */
function num(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

export function parsePromoBanner(raw: string | null | undefined): PromoBannerConfig {
  if (!raw) return DEFAULT_PROMO_BANNER

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_PROMO_BANNER
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const d = DEFAULT_PROMO_BANNER

  return {
    active: typeof f.active === "boolean" ? f.active : d.active,
    image: str(f.image, d.image),
    imageAlt: str(f.imageAlt, d.imageAlt),
    // Floored at a narrow phone and capped short of a full desktop window — a
    // poster wider than that stops being a poster and hides the site behind it.
    maxWidthPx: num(f.maxWidthPx, d.maxWidthPx, 280, 1200),
    // 0 is allowed and means "straight away"; a minute is already far longer
    // than anyone waits before the first scroll.
    delaySeconds: num(f.delaySeconds, d.delaySeconds, 0, 60),
    // 0 means it comes back on the very next page load, which is a legitimate
    // setting while a campaign is being previewed. A year is the ceiling.
    reshowHours: num(f.reshowHours, d.reshowHours, 0, 8760),
    heading: str(f.heading, d.heading),
    headingColor: str(f.headingColor, d.headingColor),
    headingSize: oneOf(f.headingSize, PROMO_BANNER_TEXT_SIZES, d.headingSize),
    body: str(f.body, d.body),
    bodyColor: str(f.bodyColor, d.bodyColor),
    bodySize: oneOf(f.bodySize, PROMO_BANNER_TEXT_SIZES, d.bodySize),
    position: oneOf(f.position, PROMO_BANNER_POSITIONS, d.position),
    buttonLabel: str(f.buttonLabel, d.buttonLabel),
    buttonHref: str(f.buttonHref, d.buttonHref),
    buttonBg: str(f.buttonBg, d.buttonBg),
    buttonColor: str(f.buttonColor, d.buttonColor),
  }
}

/** Nothing to show without a picture, however much copy has been written. */
export function isPromoBannerRenderable(config: PromoBannerConfig): boolean {
  return config.active && config.image.trim() !== ""
}
