/**
 * Full-bleed video banners on the homepage — the "The New Denim Standard" /
 * "10 Years Tall" slot: edge-to-edge footage with the copy laid over it.
 *
 * Two things make this its own setting rather than another showcase row:
 *
 *  - A banner names *where* it goes. The homepage order is still fixed in
 *    app/page.tsx, so instead of one hardcoded position each banner picks an
 *    anchor between two existing sections. When the section manager lands this
 *    becomes just another orderable block and `position` can retire.
 *  - Desktop and mobile get separate files. A 21:9 landscape crop is unusable
 *    on a phone, so the two are uploaded independently and only the one that is
 *    actually on screen is ever allowed to load.
 */

export const HOME_VIDEO_BANNERS_SETTING_KEY = "home_video_banners"

/** Where a banner sits, named for the section it follows. */
export const HOME_VIDEO_BANNER_SLOTS = [
  { value: "after-pillars", label: "After the pillars carousel" },
  { value: "after-flash-sale", label: "After the flash sale" },
  { value: "after-style", label: "After the seasonal styles" },
  { value: "after-bestsellers", label: "After this month's best sellers" },
  { value: "after-trending", label: "After trending categories" },
  { value: "after-reels", label: "After the reels strip" },
  { value: "after-showcase", label: "After the product showcase" },
  { value: "after-new-arrivals", label: "After new arrivals" },
  { value: "after-reviews", label: "After customer reviews" },
] as const

export type HomeVideoBannerSlot = (typeof HOME_VIDEO_BANNER_SLOTS)[number]["value"]

export const HOME_VIDEO_BANNER_HEIGHTS = [
  { value: "short", label: "Short (cinematic)" },
  { value: "medium", label: "Medium" },
  { value: "tall", label: "Tall (near full screen)" },
] as const

export type HomeVideoBannerHeight = (typeof HOME_VIDEO_BANNER_HEIGHTS)[number]["value"]

export const HOME_VIDEO_BANNER_ALIGNS = ["left", "center", "right"] as const
export type HomeVideoBannerAlign = (typeof HOME_VIDEO_BANNER_ALIGNS)[number]

/** Which way the overlaid copy is coloured — footage decides, not the site theme. */
export const HOME_VIDEO_BANNER_THEMES = ["light", "dark"] as const
export type HomeVideoBannerTheme = (typeof HOME_VIDEO_BANNER_THEMES)[number]

export interface HomeVideoBanner {
  active: boolean
  position: HomeVideoBannerSlot
  height: HomeVideoBannerHeight
  align: HomeVideoBannerAlign
  /** "light" = white copy over dark footage. */
  theme: HomeVideoBannerTheme
  /** 0–0.8. A scrim only where the footage is too busy to read over. */
  overlayOpacity: number

  /** Required. A banner with no desktop file is dropped when the setting is read. */
  video: string
  /** Optional portrait cut. Falls back to `video`. */
  videoMobile: string
  poster: string
  posterMobile: string

  eyebrow: string
  heading: string
  /** A word inside `heading` rendered in the accent colour. */
  highlight: string
  subheading: string

  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
}

export const EMPTY_HOME_VIDEO_BANNER: HomeVideoBanner = {
  active: true,
  position: "after-pillars",
  height: "short",
  align: "center",
  theme: "light",
  overlayOpacity: 0.15,
  video: "",
  videoMobile: "",
  poster: "",
  posterMobile: "",
  eyebrow: "",
  heading: "",
  highlight: "",
  subheading: "",
  primaryLabel: "",
  primaryHref: "",
  secondaryLabel: "",
  secondaryHref: "",
}

/** Admin cap. Each banner is two video files; a homepage of them is a homepage nobody waits for. */
export const MAX_HOME_VIDEO_BANNERS = 4

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

function toBanner(raw: unknown): HomeVideoBanner {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const opacity = typeof f.overlayOpacity === "number" ? f.overlayOpacity : NaN

  return {
    active: typeof f.active === "boolean" ? f.active : true,
    position: oneOf(
      f.position,
      HOME_VIDEO_BANNER_SLOTS.map((s) => s.value),
      EMPTY_HOME_VIDEO_BANNER.position
    ),
    height: oneOf(
      f.height,
      HOME_VIDEO_BANNER_HEIGHTS.map((h) => h.value),
      EMPTY_HOME_VIDEO_BANNER.height
    ),
    align: oneOf(f.align, HOME_VIDEO_BANNER_ALIGNS, EMPTY_HOME_VIDEO_BANNER.align),
    theme: oneOf(f.theme, HOME_VIDEO_BANNER_THEMES, EMPTY_HOME_VIDEO_BANNER.theme),
    // Clamped rather than trusted: the stored JSON is hand-editable, and an
    // opacity of 5 would paint the footage out entirely.
    overlayOpacity: Number.isFinite(opacity)
      ? Math.min(0.8, Math.max(0, opacity))
      : EMPTY_HOME_VIDEO_BANNER.overlayOpacity,

    video: str(f.video, ""),
    videoMobile: str(f.videoMobile, ""),
    poster: str(f.poster, ""),
    posterMobile: str(f.posterMobile, ""),

    eyebrow: str(f.eyebrow, ""),
    heading: str(f.heading, ""),
    highlight: str(f.highlight, ""),
    subheading: str(f.subheading, ""),

    primaryLabel: str(f.primaryLabel, ""),
    primaryHref: str(f.primaryHref, ""),
    secondaryLabel: str(f.secondaryLabel, ""),
    secondaryHref: str(f.secondaryHref, ""),
  }
}

/**
 * `keepEmpty` separates the two callers: the admin editor needs the blank row
 * it just added to survive a reload, the storefront must not render a banner
 * with no footage in it.
 */
export function parseHomeVideoBanners(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): HomeVideoBanner[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []
  const banners = parsed.map(toBanner).slice(0, MAX_HOME_VIDEO_BANNERS)
  return keepEmpty ? banners : banners.filter((b) => b.active && b.video)
}
