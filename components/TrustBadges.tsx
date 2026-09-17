"use client"

import {
  Clock,
  Heart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react"

import { useSettings } from "@/providers/SettingsProvider"
import { useCurrency } from "@/providers/CurrencyProvider"
import { freeShippingThresholdFromSettings } from "@/lib/shipping"
import {
  MAX_HERO_TRUST_BADGES,
  TRUST_BADGES_SETTING_KEY,
  parseTrustBadges,
  resolveTrustBadges,
  type TrustBadgeIcon,
} from "@/lib/trustBadges"

const ICONS: Record<TrustBadgeIcon, LucideIcon> = {
  truck: Truck,
  returns: RotateCcw,
  shield: ShieldCheck,
  sparkles: Sparkles,
  clock: Clock,
  heart: Heart,
}

/**
 * The store's promises, in the two shapes the homepage asks for them.
 *
 * A client component because the free-shipping figure has to be rendered in the
 * currency the visitor switched to, and that lives in CurrencyProvider. Nothing
 * is fetched for it: the root layout already hands every public setting to
 * SettingsProvider, so both the badge copy and the threshold are in hand on the
 * first paint.
 */
export default function TrustBadges({ variant }: { variant: "hero" | "cards" }) {
  const { settings } = useSettings()
  const { formatPrice } = useCurrency()

  const config = parseTrustBadges(settings[TRUST_BADGES_SETTING_KEY])
  if (!config.active) return null

  // The threshold is stored against the store's own currency, the same figure
  // the cart compares its subtotal to, so `formatPrice` converts it exactly as
  // it converts a price.
  const threshold = freeShippingThresholdFromSettings(settings)
  const resolved = resolveTrustBadges(
    config.badges,
    threshold === null ? null : formatPrice(threshold)
  )

  if (variant === "hero") {
    const heroBadges = resolved.filter((b) => b.inHero).slice(0, MAX_HERO_TRUST_BADGES)
    if (heroBadges.length === 0) return null

    return (
      <div className="mt-9 flex flex-wrap gap-x-[22px] gap-y-3 border-t border-sig-line pt-[26px]">
        {heroBadges.map((badge) => (
          <div
            key={badge.label}
            className="flex items-center gap-2.5 text-[13px] font-semibold text-sig-soft"
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-sig-aqua-50 text-[11px] font-extrabold text-sig-aqua-700">
              {badge.mark}
            </span>
            {badge.label}
          </div>
        ))}
      </div>
    )
  }

  if (resolved.length === 0) return null

  return (
    <section className="bg-sig-cream pb-12 pt-2.5 lg:pb-[70px]">
      <div className="sig-wrap grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resolved.map((badge, idx) => {
          const Icon = ICONS[badge.icon]
          return (
            <div
              key={badge.label}
              className="rounded-sig border border-sig-line bg-sig-card px-6 py-[26px]"
            >
              {/* Alternating accent, so the row reads as a set rather than
                  several copies of the same card. */}
              <div
                className={`mb-4 grid h-[46px] w-[46px] place-items-center rounded-[14px] ${
                  idx % 2 === 0
                    ? "bg-sig-copper-50 text-sig-copper-600"
                    : "bg-sig-aqua-50 text-sig-aqua-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <b className="mb-1.5 block text-[15px] font-extrabold text-sig-ink">{badge.label}</b>
              {badge.detail && (
                <p className="text-[13.5px] leading-[1.65] text-sig-soft">{badge.detail}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
