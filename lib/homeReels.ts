/**
 * The homepage "Reels" strip — a row of vertical, muted, looping clips.
 *
 * Unlike the trending/style sections there is no Product or Category row to
 * hang this on: a reel is a piece of marketing footage with a caption and an
 * arbitrary destination, so the whole thing lives in one `home_reels` Setting
 * edited in Settings → Homepage.
 *
 * The default is an empty list rather than sample footage — the section hides
 * itself until an admin uploads something, so a fresh store shows no gap.
 */

export const HOME_REELS_SETTING_KEY = "home_reels"

export interface HomeReel {
  /** Required. A reel with no video file is dropped when the setting is read. */
  video: string
  /** Shown before the clip is decoded and while it is paused off-screen. */
  poster: string
  caption: string
  /** Where the tile links to. Empty means the tile is not clickable. */
  href: string
}

export interface HomeReelsConfig {
  active: boolean
  title: string
  /** A word inside `title` rendered in grey — same contract as SectionHeading. */
  highlight: string
  subtitle: string
  reels: HomeReel[]
}

export const EMPTY_HOME_REEL: HomeReel = { video: "", poster: "", caption: "", href: "" }

export const DEFAULT_HOME_REELS: HomeReelsConfig = {
  active: true,
  title: "Tall Style In Motion",
  highlight: "In Motion",
  subtitle: "Short clips of real fits, filmed on real tall bodies.",
  reels: [],
}

/** Admin UI cap — enough for a full-width row without turning the tab into a form. */
export const MAX_HOME_REELS = 12

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function toReel(raw: unknown): HomeReel {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    video: str(f.video, ""),
    poster: str(f.poster, ""),
    caption: str(f.caption, ""),
    href: str(f.href, ""),
  }
}

/**
 * The stored JSON is hand-editable in the DB, so every field is checked rather
 * than spread blindly. `keepEmpty` is what separates the two callers: the admin
 * editor needs the blank rows it just added to survive a reload, the storefront
 * does not want to render a tile with no footage in it.
 */
export function parseHomeReels(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): HomeReelsConfig {
  if (!raw) return DEFAULT_HOME_REELS

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_HOME_REELS
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const reels = (Array.isArray(f.reels) ? f.reels : []).map(toReel).slice(0, MAX_HOME_REELS)

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_HOME_REELS.active,
    title: str(f.title, DEFAULT_HOME_REELS.title),
    highlight: str(f.highlight, DEFAULT_HOME_REELS.highlight),
    subtitle: str(f.subtitle, DEFAULT_HOME_REELS.subtitle),
    reels: keepEmpty ? reels : reels.filter(r => r.video),
  }
}
