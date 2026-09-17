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

/*
 * The full range, so the number in the box is the number that is used. A
 * tighter bound would either be refused by the browser or clamped here without
 * saying so, and both amount to the setting lying about what it accepts. The
 * backdrop's padding is subtracted where these are applied, so even 100 stays
 * on screen.
 */
export const MIN_PROMO_BANNER_WIDTH = 1
export const MAX_PROMO_BANNER_WIDTH = 100

/** 0 is "auto" — no preference, the screen is the only limit. */
export const MIN_PROMO_BANNER_HEIGHT = 1
export const MAX_PROMO_BANNER_HEIGHT = 100

export interface PromoBannerConfig {
  active: boolean

  /** Required. With no picture there is no banner, whatever else is set. */
  image: string
  /** Describes the picture to a screen reader. Empty falls back to the heading. */
  imageAlt: string

  /**
   * How wide the banner is, as a percentage of the screen.
   *
   * Read as a share of the viewport rather than a pixel count, so the banner
   * keeps its proportions on a laptop and a large monitor alike. A floor is
   * applied when it is rendered: a percentage that is comfortable on a desktop
   * would be a postage stamp on a phone, so below roughly 320px the banner
   * simply takes the width it is given.
   */
  widthPercent: number

  /**
   * A fixed height for the picture, as a percentage of the screen height.
   *
   * 0 means "use the image's own proportions", which is what the banner did
   * before this existed and is still the right answer for artwork cropped for
   * the purpose. The ceiling is short of 100 on purpose — a banner as tall as
   * the screen leaves nowhere for the backdrop, and the close button ends up
   * against the edge.
   */
  heightPercent: number

  /**
   * What sits behind the picture, or empty for nothing at all.
   *
   * Two things need a colour and neither is exotic: a PNG with a transparent
   * background, which would otherwise show the dimmed page through the artwork,
   * and `contain`, which leaves the frame showing on two sides.
   *
   * Empty by default. Artwork made for a banner is usually full-bleed and
   * carries its own background, and imposing a colour on it — black, white or
   * otherwise — only shows up where it is not wanted.
   */
  backgroundColor: string

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
  widthPercent: 40,
  heightPercent: 0,
  backgroundColor: "",
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
    widthPercent: num(
      f.widthPercent,
      d.widthPercent,
      MIN_PROMO_BANNER_WIDTH,
      MAX_PROMO_BANNER_WIDTH
    ),
    // 0 passes through untouched — it is the "auto" switch, not a short
    // height, so clamping it up to the minimum would take the option away.
    heightPercent:
      Number(f.heightPercent) === 0
        ? 0
        : num(
            f.heightPercent,
            d.heightPercent,
            MIN_PROMO_BANNER_HEIGHT,
            MAX_PROMO_BANNER_HEIGHT
          ),
    backgroundColor: str(f.backgroundColor, d.backgroundColor),
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
