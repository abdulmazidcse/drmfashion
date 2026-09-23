/**
 * The homepage Hero — an admin-managed list of slides (image required, video
 * optional), auto-rotating when there's more than one. Same shape convention
 * as home_video_banners/home_reels: one JSON row in the `Setting` table.
 *
 * Replaces the old fixed "Men slide / Women slide" pair. `parseHomeHeroSlides`
 * migrates that old shape into this one on read, so a store's existing two
 * slides become the first two rows of the new list rather than disappearing.
 */

export const HOME_HERO_SLIDES_SETTING_KEY = "home_hero_slides"

export interface HeroSlideItem {
  active: boolean
  image: string
  /** Optional background video; falls back to `image` as a static poster. */
  video: string
  /** Alt text for the poster; empty falls back to the slide title. */
  imageAlt: string
  title: string
  subtitle: string
  buttonText: string
  shopLink: string
  /** Small pill above the title, e.g. "Made for Tall". */
  topBarTag: string
}

export const EMPTY_HERO_SLIDE: HeroSlideItem = {
  active: true,
  image: "",
  video: "",
  imageAlt: "",
  title: "",
  subtitle: "",
  buttonText: "",
  shopLink: "/shop",
  topBarTag: "",
}

/** The two slides the hero shipped with — used whenever nothing has been saved yet. */
export const DEFAULT_HOME_HERO_SLIDES: HeroSlideItem[] = [
  {
    active: true,
    image: "/images/hero.jpg",
    video: "",
    imageAlt: "",
    title: "FINALLY, CLOTHES THAT FIT.",
    subtitle: "Designed specifically for tall men. Proportions perfected.",
    buttonText: "Shop Men",
    shopLink: "/shop",
    topBarTag: "Made for Tall",
  },
  {
    active: true,
    image: "/images/olaszkolda-fashion-10318918.jpg",
    video: "",
    imageAlt: "",
    title: "ELEGANCE IN EVERY INCH.",
    subtitle: "Tailored specifically for tall women. Modern style with perfect length.",
    buttonText: "Shop Women",
    shopLink: "/shop",
    topBarTag: "Made for Tall",
  },
]

/** Admin UI cap — enough for a full rotation without turning it into a chore to click through. */
export const MAX_HOME_HERO_SLIDES = 6

function str(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback
}

function toSlide(raw: unknown): HeroSlideItem {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    active: typeof f.active === "boolean" ? f.active : true,
    image: str(f.image),
    // `videoFallback` was the old per-gender field's second video slot —
    // still honoured on read so a migrated slide doesn't lose it.
    video: str(f.video) || str(f.videoFallback),
    imageAlt: str(f.imageAlt),
    title: str(f.title),
    subtitle: str(f.subtitle),
    buttonText: str(f.buttonText),
    shopLink: str(f.shopLink, "/shop"),
    topBarTag: str(f.topBarTag),
  }
}

/**
 * `keepEmpty` separates the two callers, same convention as
 * parseHomeVideoBanners/parseHomeReels: the admin editor needs blank/inactive
 * rows to survive a reload, the storefront must not render a slide with
 * nothing to show.
 */
export function parseHomeHeroSlides(
  raw: unknown,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): HeroSlideItem[] {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null

  let slides: HeroSlideItem[]

  if (f && Array.isArray(f.slides)) {
    // Current shape.
    slides = f.slides.map(toSlide).slice(0, MAX_HOME_HERO_SLIDES)
  } else if (f && (f.men || f.women)) {
    // Old fixed-pair shape — migrate in place rather than losing the store's
    // existing slides the first time this is read after the upgrade.
    slides = [f.men, f.women].filter(Boolean).map(toSlide)
  } else if (f) {
    // A `home_hero_slides` row exists but has neither shape — an admin who
    // emptied the list and saved. Respected as a deliberate empty list.
    slides = []
  } else {
    // Nothing saved at all: fresh install.
    slides = DEFAULT_HOME_HERO_SLIDES
  }

  return keepEmpty ? slides : slides.filter((s) => s.active && (s.image || s.video))
}
