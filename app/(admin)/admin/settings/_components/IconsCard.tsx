"use client"

import { useState } from "react"
import { Star, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"
import { MAX_HOME_ICONS } from "@/lib/homeIcons"

/**
 * The curated wall behind a Men/Women toggle.
 *
 * Each tile stands on its own — its photograph, caption and link are all typed
 * in here — so a tile can point at a category, a lookbook page or one product,
 * and can use a styled shot rather than whatever the product's thumbnail is.
 */
export default function IconsCard() {
  const {
    homeIcons,
    updateHomeIcons,
    updateHomeIconTile,
    addHomeIconTile,
    removeHomeIconTile,
    moveHomeIconTile,
    fieldLabel,
  } = useSettingsForm()

  const [gender, setGender] = useState<"men" | "women">("men")

  const tiles = homeIcons[gender]
  const liveCount =
    homeIcons.men.filter((t) => t.image).length + homeIcons.women.filter((t) => t.image).length

  return (
    <CollapsibleCard
      title="Featured Icons"
      description="A wall of photography with Men/Women tabs — image only, no prices. Tiles without an image are ignored on the storefront."
      icon={Star}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={homeIcons.active && liveCount > 0 ? "default" : "secondary"}>
            {homeIcons.active ? (liveCount > 0 ? `${liveCount} live` : "No tiles") : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              homeIcons.active ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            onClick={() => updateHomeIcons({ active: !homeIcons.active })}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                homeIcons.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      }
    >
      <div
        className={`space-y-6 transition-all ${
          homeIcons.active ? "" : "pointer-events-none opacity-50"
        }`}
      >
        {/* ─── Section copy ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className={fieldLabel}>Section Heading</Label>
            <Input
              type="text"
              value={homeIcons.title}
              onChange={(e) => updateHomeIcons({ title: e.target.value })}
              placeholder="The Icons"
              className="font-bold"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Greyed-out word</Label>
            <Input
              type="text"
              value={homeIcons.highlight}
              onChange={(e) => updateHomeIcons({ highlight: e.target.value })}
              placeholder="Icons"
              className="font-bold"
            />
            <p className="text-[10px] text-muted-foreground">
              Must be part of the heading above — that word is rendered in grey.
            </p>
          </div>

          <div className="space-y-3 md:col-span-2">
            <Label className={fieldLabel}>Subtitle</Label>
            <Textarea
              rows={2}
              value={homeIcons.subtitle}
              onChange={(e) => updateHomeIcons({ subtitle: e.target.value })}
              placeholder="The pieces our tall community keeps coming back to."
            />
          </div>

          <div className="space-y-3">
            <Label className={fieldLabel}>Link label</Label>
            <Input
              type="text"
              value={homeIcons.ctaLabel}
              onChange={(e) => updateHomeIcons({ ctaLabel: e.target.value })}
              placeholder="Explore the icons"
            />
          </div>
          <div className="space-y-3">
            <Label className={fieldLabel}>Link URL</Label>
            <Input
              type="text"
              value={homeIcons.ctaHref}
              onChange={(e) => updateHomeIcons({ ctaHref: e.target.value })}
              placeholder="/shop"
              className="font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Both fields are needed before the link appears.
            </p>
          </div>
        </div>

        <Separator />

        {/* ─── Tiles, per tab ────────────────────────────────────────── */}
        <div className="flex w-fit overflow-hidden rounded-lg border bg-muted/50 p-1">
          {(["men", "women"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                gender === g
                  ? "border bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g} tab ({homeIcons[g].length})
            </button>
          ))}
        </div>

        {tiles.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No tiles in the {gender} tab yet. A tab with nothing in it does not appear on the
            homepage.
          </p>
        ) : (
          <div className="space-y-4">
            {tiles.map((tile, index) => (
              <div key={index} className="rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Tile {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => moveHomeIconTile(gender, index, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === tiles.length - 1}
                      onClick={() => moveHomeIconTile(gender, index, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHomeIconTile(gender, index)}
                      title="Remove tile"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <MediaField
                    label="Image"
                    hint="Portrait, 5:7. Required — a tile without one is skipped."
                    value={tile.image}
                    onChange={(next) =>
                      updateHomeIconTile(gender, index, {
                        image: typeof next === "function" ? next(tile.image) : next,
                      })
                    }
                  />

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Caption</Label>
                    <Input
                      type="text"
                      value={tile.title}
                      onChange={(e) => updateHomeIconTile(gender, index, { title: e.target.value })}
                      placeholder="The Carman Jean"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Appears on hover, and is what a screen reader announces for the photograph.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className={fieldLabel}>Link</Label>
                    <Input
                      type="text"
                      value={tile.href}
                      onChange={(e) => updateHomeIconTile(gender, index, { href: e.target.value })}
                      placeholder="/product/carman-tapered-jeans"
                      className="font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      A product, a category, any page. Leave empty and the tile is not clickable.
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
            onClick={() => addHomeIconTile(gender)}
            disabled={tiles.length >= MAX_HOME_ICONS}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tile to {gender}
          </Button>
          {tiles.length >= MAX_HOME_ICONS ? (
            <p className="text-[10px] text-muted-foreground">
              {MAX_HOME_ICONS} per tab is the maximum — past that it stops reading as a curation.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              The grid follows the order above. Portrait shots on a consistent background sit best
              next to one another.
            </p>
          )}
        </div>
      </div>
    </CollapsibleCard>
  )
}
