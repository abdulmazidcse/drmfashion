"use client"

import { MonitorPlay, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"
import {
  HOME_VIDEO_BANNER_ALIGNS,
  HOME_VIDEO_BANNER_HEIGHTS,
  HOME_VIDEO_BANNER_SLOTS,
  HOME_VIDEO_BANNER_THEMES,
  MAX_HOME_VIDEO_BANNERS,
} from "@/lib/homeVideoBanners"

const selectClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Full-bleed video banners. Each one names the section it follows rather than
 * sitting at a fixed point, so the same editor can drop a banner anywhere down
 * the page without the homepage having to be re-ordered in code.
 *
 * Its own file rather than another block inside HomepageTab: that file is
 * already past a thousand lines, and this card owns nothing the others touch.
 */
export default function VideoBannersCard() {
  const {
    videoBanners,
    updateVideoBanner,
    addVideoBanner,
    removeVideoBanner,
    moveVideoBanner,
    fieldLabel,
  } = useSettingsForm()

  const liveCount = videoBanners.filter((b) => b.active && b.video).length

  return (
    <CollapsibleCard
      title="Homepage Video Banners"
      description="Edge-to-edge autoplay video with the copy laid over it. Rows without a desktop video are ignored on the storefront."
      icon={MonitorPlay}
      action={
        <Badge variant={liveCount > 0 ? "default" : "secondary"}>
          {liveCount > 0 ? `${liveCount} live` : "None"}
        </Badge>
      }
    >
      <div className="space-y-6">
        {videoBanners.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No video banners yet. Add one to drop a full-width clip into the page.
          </p>
        ) : (
          <div className="space-y-4">
            {videoBanners.map((banner, index) => (
              <div key={index} className="space-y-5 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Banner {index + 1}
                    </span>
                    <Badge variant={banner.active ? "default" : "secondary"}>
                      {banner.active ? "Active" : "Hidden"}
                    </Badge>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        banner.active ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      onClick={() => updateVideoBanner(index, { active: !banner.active })}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                          banner.active ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveVideoBanner(index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === videoBanners.length - 1}
                      onClick={() => moveVideoBanner(index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVideoBanner(index)}
                      title="Remove banner"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div
                  className={`space-y-5 transition-all ${
                    banner.active ? "" : "pointer-events-none opacity-50"
                  }`}
                >
                  {/* ─── Media ─────────────────────────────────────────── */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <MediaField
                      label="Desktop video"
                      kind="video"
                      hint="Landscape. Plays muted and on loop. Required — without it the banner is skipped."
                      value={banner.video}
                      onChange={(next) =>
                        updateVideoBanner(index, {
                          video: typeof next === "function" ? next(banner.video) : next,
                        })
                      }
                    />
                    <MediaField
                      label="Mobile video"
                      kind="video"
                      hint="Portrait cut. Leave empty to reuse the desktop file — a wide crop reads badly on a phone."
                      value={banner.videoMobile}
                      onChange={(next) =>
                        updateVideoBanner(index, {
                          videoMobile: typeof next === "function" ? next(banner.videoMobile) : next,
                        })
                      }
                    />
                    <MediaField
                      label="Desktop poster"
                      hint="Held up until the clip decodes, and the whole banner when the visitor has reduced motion on."
                      value={banner.poster}
                      onChange={(next) =>
                        updateVideoBanner(index, {
                          poster: typeof next === "function" ? next(banner.poster) : next,
                        })
                      }
                    />
                    <MediaField
                      label="Mobile poster"
                      hint="Optional. Falls back to the desktop poster."
                      value={banner.posterMobile}
                      onChange={(next) =>
                        updateVideoBanner(index, {
                          posterMobile: typeof next === "function" ? next(banner.posterMobile) : next,
                        })
                      }
                    />
                  </div>

                  <Separator />

                  {/* ─── Copy ──────────────────────────────────────────── */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Eyebrow</Label>
                      <Input
                        type="text"
                        value={banner.eyebrow}
                        onChange={(e) => updateVideoBanner(index, { eyebrow: e.target.value })}
                        placeholder="New for autumn"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Heading</Label>
                      <Input
                        type="text"
                        value={banner.heading}
                        onChange={(e) => updateVideoBanner(index, { heading: e.target.value })}
                        placeholder="The New Denim Standard"
                        className="font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Accent word</Label>
                      <Input
                        type="text"
                        value={banner.highlight}
                        onChange={(e) => updateVideoBanner(index, { highlight: e.target.value })}
                        placeholder="Denim Standard"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Must be part of the heading above — that word is picked out in the accent colour.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Subheading</Label>
                      <Textarea
                        rows={2}
                        value={banner.subheading}
                        onChange={(e) => updateVideoBanner(index, { subheading: e.target.value })}
                        placeholder="Refined fits. Elevated finishes. Exclusively for tall."
                      />
                    </div>
                  </div>

                  {/* ─── Buttons ───────────────────────────────────────── */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Primary button</Label>
                      <Input
                        type="text"
                        value={banner.primaryLabel}
                        onChange={(e) => updateVideoBanner(index, { primaryLabel: e.target.value })}
                        placeholder="Shop Men"
                      />
                      <Input
                        type="text"
                        value={banner.primaryHref}
                        onChange={(e) => updateVideoBanner(index, { primaryHref: e.target.value })}
                        placeholder="/men"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Secondary button</Label>
                      <Input
                        type="text"
                        value={banner.secondaryLabel}
                        onChange={(e) => updateVideoBanner(index, { secondaryLabel: e.target.value })}
                        placeholder="Shop Women"
                      />
                      <Input
                        type="text"
                        value={banner.secondaryHref}
                        onChange={(e) => updateVideoBanner(index, { secondaryHref: e.target.value })}
                        placeholder="/women"
                        className="font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground md:col-span-2">
                      A button needs both its label and its link before it appears.
                    </p>
                  </div>

                  <Separator />

                  {/* ─── Placement and treatment ───────────────────────── */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label className={fieldLabel}>Position on the homepage</Label>
                      <select
                        className={selectClass}
                        value={banner.position}
                        onChange={(e) =>
                          updateVideoBanner(index, {
                            position: e.target.value as typeof banner.position,
                          })
                        }
                      >
                        {HOME_VIDEO_BANNER_SLOTS.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        A section that is empty or switched off is skipped, and the banner then
                        follows whatever comes before it.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className={fieldLabel}>Height</Label>
                      <select
                        className={selectClass}
                        value={banner.height}
                        onChange={(e) =>
                          updateVideoBanner(index, { height: e.target.value as typeof banner.height })
                        }
                      >
                        {HOME_VIDEO_BANNER_HEIGHTS.map((h) => (
                          <option key={h.value} value={h.value}>
                            {h.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className={fieldLabel}>Text alignment</Label>
                      <select
                        className={selectClass}
                        value={banner.align}
                        onChange={(e) =>
                          updateVideoBanner(index, { align: e.target.value as typeof banner.align })
                        }
                      >
                        {HOME_VIDEO_BANNER_ALIGNS.map((a) => (
                          <option key={a} value={a} className="capitalize">
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <Label className={fieldLabel}>Text colour</Label>
                      <select
                        className={selectClass}
                        value={banner.theme}
                        onChange={(e) =>
                          updateVideoBanner(index, { theme: e.target.value as typeof banner.theme })
                        }
                      >
                        {HOME_VIDEO_BANNER_THEMES.map((t) => (
                          <option key={t} value={t}>
                            {t === "light" ? "White — for dark footage" : "Dark — for light footage"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 md:col-span-2">
                      <Label className={fieldLabel}>
                        Darken the video ({Math.round(banner.overlayOpacity * 100)}%)
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={80}
                        step={5}
                        value={Math.round(banner.overlayOpacity * 100)}
                        onChange={(e) =>
                          updateVideoBanner(index, { overlayOpacity: Number(e.target.value) / 100 })
                        }
                        className="w-full accent-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Only as much as the copy needs to stay readable — every step here is footage
                        the visitor stops seeing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addVideoBanner}
          disabled={videoBanners.length >= MAX_HOME_VIDEO_BANNERS}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add video banner
        </Button>
        {videoBanners.length >= MAX_HOME_VIDEO_BANNERS && (
          <p className="text-[10px] text-muted-foreground">
            {MAX_HOME_VIDEO_BANNERS} is the maximum — each banner is two video files, and a homepage
            of them is a homepage nobody waits for.
          </p>
        )}
      </div>
    </CollapsibleCard>
  )
}
