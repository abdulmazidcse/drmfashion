"use client"

import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"
import { MAX_HOME_HERO_SLIDES } from "@/lib/homeHeroSlides"

/**
 * The hero's own slide list. Rendered inside HomepageTab's existing
 * "Homepage Hero Slider Settings" card (alongside the rotation interval and
 * floating-product-card fields already there) rather than as its own
 * CollapsibleCard — unlike VideoBannersCard/ReelsCard, which are sections in
 * their own right.
 */
export default function HeroSlidesCard() {
  const { heroSlides, updateHeroSlide, addHeroSlide, removeHeroSlide, moveHeroSlide, fieldLabel } =
    useSettingsForm()

  return (
    <div className="space-y-6">
      {heroSlides.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          No slides yet. Add one to put something in the hero.
        </p>
      ) : (
        <div className="space-y-4">
          {heroSlides.map((slide, index) => (
            <div key={index} className="space-y-5 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Slide {index + 1}
                  </span>
                  <Badge variant={slide.active ? "default" : "secondary"}>
                    {slide.active ? "Active" : "Hidden"}
                  </Badge>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      slide.active ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    onClick={() => updateHeroSlide(index, { active: !slide.active })}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        slide.active ? "translate-x-6" : "translate-x-1"
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
                    onClick={() => moveHeroSlide(index, -1)}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === heroSlides.length - 1}
                    onClick={() => moveHeroSlide(index, 1)}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeroSlide(index)}
                    title="Remove slide"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div
                className={`space-y-5 transition-all ${slide.active ? "" : "pointer-events-none opacity-50"}`}
              >
                {/* ─── Media ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <MediaField
                    label="Image"
                    kind="image"
                    hint="About 1600×1600. Required — a slide with no image is skipped on the storefront."
                    value={slide.image}
                    onChange={(next) =>
                      updateHeroSlide(index, { image: typeof next === "function" ? next(slide.image) : next })
                    }
                  />
                  <MediaField
                    label="Video (optional)"
                    kind="video"
                    allowUrl
                    hint="Loops muted over the image. Leave empty to show just the image — keep it under ~8 MB, it autoplays on every visit."
                    value={slide.video}
                    onChange={(next) =>
                      updateHeroSlide(index, { video: typeof next === "function" ? next(slide.video) : next })
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-normal text-muted-foreground">
                    Image alt text (for SEO and screen readers)
                  </Label>
                  <Input
                    value={slide.imageAlt}
                    onChange={(e) => updateHeroSlide(index, { imageAlt: e.target.value })}
                    placeholder="Empty falls back to the title below"
                  />
                </div>

                {/* ─── Copy ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Title</Label>
                    <Textarea
                      rows={2}
                      value={slide.title}
                      onChange={(e) => updateHeroSlide(index, { title: e.target.value })}
                      className="font-extrabold"
                      placeholder="FINALLY, CLOTHES THAT FIT."
                    />
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <Label className={fieldLabel}>Subtitle</Label>
                    <Input
                      type="text"
                      value={slide.subtitle}
                      onChange={(e) => updateHeroSlide(index, { subtitle: e.target.value })}
                      placeholder="Designed specifically for tall men."
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Top bar tag</Label>
                    <Input
                      type="text"
                      value={slide.topBarTag}
                      onChange={(e) => updateHeroSlide(index, { topBarTag: e.target.value })}
                      className="font-bold"
                      placeholder="Made for Tall"
                    />
                  </div>
                </div>

                {/* ─── Button ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Button text</Label>
                    <Input
                      type="text"
                      value={slide.buttonText}
                      onChange={(e) => updateHeroSlide(index, { buttonText: e.target.value })}
                      className="font-bold"
                      placeholder="Shop Men"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className={fieldLabel}>Link</Label>
                    <Input
                      type="text"
                      value={slide.shopLink}
                      onChange={(e) => updateHeroSlide(index, { shopLink: e.target.value })}
                      className="font-mono"
                      placeholder="/shop"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" onClick={addHeroSlide} disabled={heroSlides.length >= MAX_HOME_HERO_SLIDES}>
        <Plus className="mr-2 h-4 w-4" />
        Add slide
      </Button>
      {heroSlides.length >= MAX_HOME_HERO_SLIDES && (
        <p className="text-[10px] text-muted-foreground">
          {MAX_HOME_HERO_SLIDES} is the maximum — a hero with more slides than that is one nobody
          waits to rotate through.
        </p>
      )}
    </div>
  )
}
