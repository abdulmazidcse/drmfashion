"use client"

import { ArrowDown, ArrowUp, BadgeCheck, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"
import {
  MAX_HERO_TRUST_BADGES,
  MAX_TRUST_BADGES,
  TRUST_BADGE_ICONS,
  TRUST_BADGE_THRESHOLD_TOKEN,
} from "@/lib/trustBadges"

const selectClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"

const ICON_LABELS: Record<(typeof TRUST_BADGE_ICONS)[number], string> = {
  truck: "Delivery van",
  returns: "Return arrow",
  shield: "Shield",
  sparkles: "Sparkles",
  clock: "Clock",
  heart: "Heart",
}

/**
 * The store's promises, edited once and shown in two places: the chip row under
 * the hero's buttons and the card strip further down the homepage.
 *
 * The shipping figure is deliberately not typed in here. Writing
 * `{threshold}` puts whatever Settings → Shipping has configured into the line,
 * converted into the currency the visitor is browsing — so raising the
 * threshold does not leave the homepage advertising the old one.
 */
export default function TrustBadgesCard() {
  const {
    trustBadges,
    updateTrustBadges,
    updateTrustBadge,
    addTrustBadge,
    removeTrustBadge,
    moveTrustBadge,
    fieldLabel,
  } = useSettingsForm()

  const badges = trustBadges.badges
  const liveCount = badges.filter((b) => b.label.trim() !== "").length
  const heroCount = badges.filter((b) => b.inHero && b.label.trim() !== "").length

  return (
    <CollapsibleCard
      title="Trust Badges"
      description="Free shipping, returns, secure checkout — shown as chips under the hero and as cards further down the homepage. A badge with no label is ignored."
      icon={BadgeCheck}
      defaultCollapsed
      action={
        <div className="flex items-center gap-3">
          <Badge variant={trustBadges.active && liveCount > 0 ? "default" : "secondary"}>
            {trustBadges.active ? (liveCount > 0 ? `${liveCount} live` : "No badges") : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              trustBadges.active ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            onClick={() => updateTrustBadges({ active: !trustBadges.active })}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                trustBadges.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      }
    >
      <div
        className={`space-y-6 transition-all ${
          trustBadges.active ? "" : "pointer-events-none opacity-50"
        }`}
      >
        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          Type <code className="font-mono font-bold">{TRUST_BADGE_THRESHOLD_TOKEN}</code> anywhere
          in a label or description and it is replaced with the free-shipping amount from{" "}
          <b>Settings → Shipping</b>, in the visitor&apos;s own currency. With no threshold set
          there, badges that use it are hidden rather than shown with a gap.
        </div>

        {badges.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No badges yet. With none, neither the hero chips nor the card strip appear.
          </p>
        ) : (
          <div className="space-y-4">
            {badges.map((badge, index) => (
              <div key={index} className="rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Badge {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveTrustBadge(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === badges.length - 1}
                      onClick={() => moveTrustBadge(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTrustBadge(index)}
                      title="Remove badge"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Label</Label>
                    <Input
                      type="text"
                      value={badge.label}
                      onChange={(e) => updateTrustBadge(index, { label: e.target.value })}
                      placeholder={`Free shipping over ${TRUST_BADGE_THRESHOLD_TOKEN}`}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      The hero chip&apos;s one line, and the card&apos;s heading. Leave empty and
                      the badge is skipped.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Chip symbol</Label>
                    <Input
                      type="text"
                      value={badge.mark}
                      onChange={(e) => updateTrustBadge(index, { mark: e.target.value })}
                      placeholder="✓"
                      className="text-center font-bold"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      One character, shown in the hero&apos;s round chip. ✓ ↺ ★ ✦
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Card icon</Label>
                    <select
                      className={selectClass}
                      value={badge.icon}
                      onChange={(e) =>
                        updateTrustBadge(index, { icon: e.target.value as typeof badge.icon })
                      }
                    >
                      {TRUST_BADGE_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {ICON_LABELS[icon]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Drawn on the card only — the hero uses the symbol beside it.
                    </p>
                  </div>

                  <div className="space-y-3 md:col-span-3">
                    <Label className={fieldLabel}>Card description</Label>
                    <Textarea
                      rows={2}
                      value={badge.detail}
                      onChange={(e) => updateTrustBadge(index, { detail: e.target.value })}
                      placeholder="Dispatched the same day."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Shown under the heading on the card. The hero chip never shows it. Leave
                      empty for a heading on its own.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Show in hero</Label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-3 py-2">
                      <input
                        type="checkbox"
                        checked={badge.inHero}
                        onChange={(e) => updateTrustBadge(index, { inHero: e.target.checked })}
                        className="h-4 w-4 rounded border-input text-foreground focus:ring-ring"
                      />
                      <span className="text-sm">Under the hero buttons</span>
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      The card strip shows every badge regardless.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={addTrustBadge}
            disabled={badges.length >= MAX_TRUST_BADGES}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add badge
          </Button>
          {badges.length >= MAX_TRUST_BADGES ? (
            <p className="text-[10px] text-muted-foreground">
              {MAX_TRUST_BADGES} is the maximum — past that the strip stops reading as a set of
              promises.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Both the chips and the cards follow the order above. The hero carries the first{" "}
              {MAX_HERO_TRUST_BADGES} ticked badges
              {heroCount > MAX_HERO_TRUST_BADGES
                ? ` — ${heroCount} are ticked, so the rest only appear as cards.`
                : "."}
            </p>
          )}
        </div>
      </div>
    </CollapsibleCard>
  )
}
