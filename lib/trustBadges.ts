/**
 * The promises the storefront repeats — free shipping, returns, secure
 * checkout.
 *
 * One setting feeds both places they appear: the chip row under the hero's
 * buttons, and the value-props card strip further down the homepage. Those were
 * two hardcoded arrays, which is how the hero came to promise "free shipping
 * over $150" on a store that prices in taka and keeps its real threshold in
 * Settings → Shipping, where an admin can change it without either line moving.
 *
 * `{threshold}` in a label or detail is replaced with that configured amount,
 * formatted in whichever currency the visitor is browsing. A badge that asks
 * for the token while no threshold is set is dropped rather than rendered with
 * a hole in it — the same rule `parseFreeShippingThreshold` already follows
 * when it treats blank, zero and nonsense as "no offer".
 */

export const TRUST_BADGES_SETTING_KEY = "trust_badges"

/** Replaced at render time with the configured free-shipping threshold. */
export const TRUST_BADGE_THRESHOLD_TOKEN = "{threshold}"

/**
 * The card's icon, by name rather than by component, so a badge survives
 * JSON.stringify. `TrustBadges` maps these onto the real lucide icons.
 */
export const TRUST_BADGE_ICONS = [
  "truck",
  "returns",
  "shield",
  "sparkles",
  "clock",
  "heart",
] as const

export type TrustBadgeIcon = (typeof TRUST_BADGE_ICONS)[number]

export interface TrustBadge {
  /** The glyph in the hero's round chip. */
  mark: string
  /** Which icon the value-props card draws. */
  icon: TrustBadgeIcon
  /** The hero's one line, and the card's heading. Blank drops the badge. */
  label: string
  /** The card's supporting sentence. Blank leaves the heading standing alone. */
  detail: string
  /** Whether the hero's chip row carries this one. The strip shows them all. */
  inHero: boolean
}

export interface TrustBadgesConfig {
  active: boolean
  badges: TrustBadge[]
}

/** Past this the strip stops being a set of promises and becomes a list. */
export const MAX_TRUST_BADGES = 6

/** The hero has room for one line of chips; a fourth wraps into a block. */
export const MAX_HERO_TRUST_BADGES = 3

export const EMPTY_TRUST_BADGE: TrustBadge = {
  mark: "✓",
  icon: "truck",
  label: "",
  detail: "",
  inHero: false,
}

/**
 * What the two hardcoded arrays used to say, minus the dollar figure: the
 * shipping line now asks Settings → Shipping for the number instead of carrying
 * a stale one of its own.
 */
export const DEFAULT_TRUST_BADGES: TrustBadgesConfig = {
  active: true,
  badges: [
    {
      mark: "✓",
      icon: "truck",
      label: `Free shipping over ${TRUST_BADGE_THRESHOLD_TOKEN}`,
      detail: "Dispatched the same day.",
      inHero: true,
    },
    {
      mark: "↺",
      icon: "returns",
      label: "30-day easy returns",
      detail: "Wrong fit? Send it back free, no restocking fee.",
      inHero: true,
    },
    {
      mark: "★",
      icon: "shield",
      label: "Secure checkout",
      detail: "Every payment encrypted end to end.",
      inHero: true,
    },
    {
      mark: "✦",
      icon: "sparkles",
      label: "Elite quality",
      detail: "Carefully sourced materials, built to keep their shape.",
      inHero: false,
    },
  ],
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function toIcon(raw: unknown): TrustBadgeIcon {
  return TRUST_BADGE_ICONS.includes(raw as TrustBadgeIcon) ? (raw as TrustBadgeIcon) : "truck"
}

function toBadge(raw: unknown): TrustBadge {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return {
    mark: str(f.mark, "✓"),
    icon: toIcon(f.icon),
    label: str(f.label, ""),
    detail: str(f.detail, ""),
    inHero: typeof f.inHero === "boolean" ? f.inHero : false,
  }
}

/**
 * `keepEmpty` separates the two callers: the admin editor needs the blank badge
 * it just added to survive a reload, the storefront must not render a chip with
 * no words in it.
 */
export function parseTrustBadges(
  raw: string | null | undefined,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): TrustBadgesConfig {
  if (!raw) return DEFAULT_TRUST_BADGES

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_TRUST_BADGES
  }

  const f = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  const badges = (Array.isArray(f.badges) ? f.badges : [])
    .filter((entry) => entry && typeof entry === "object")
    .map(toBadge)
    .slice(0, MAX_TRUST_BADGES)

  return {
    active: typeof f.active === "boolean" ? f.active : DEFAULT_TRUST_BADGES.active,
    badges: keepEmpty ? badges : badges.filter((b) => b.label.trim() !== ""),
  }
}

/**
 * Fills `{threshold}` in and drops the badges that needed one when there is
 * none, so the storefront never promises free shipping over nothing.
 *
 * `formattedThreshold` arrives already rendered — the caller holds the currency
 * the visitor picked, and this module has no business knowing about rates.
 */
export function resolveTrustBadges(
  badges: TrustBadge[],
  formattedThreshold: string | null
): TrustBadge[] {
  return badges.flatMap((badge) => {
    const needsThreshold =
      badge.label.includes(TRUST_BADGE_THRESHOLD_TOKEN) ||
      badge.detail.includes(TRUST_BADGE_THRESHOLD_TOKEN)

    if (!needsThreshold) return [badge]
    if (!formattedThreshold) return []

    const fill = (text: string) => text.split(TRUST_BADGE_THRESHOLD_TOKEN).join(formattedThreshold)
    return [{ ...badge, label: fill(badge.label), detail: fill(badge.detail) }]
  })
}
