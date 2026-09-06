"use client"

import { LayoutList, ArrowUp, ArrowDown, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"
import { HOME_SECTIONS } from "@/lib/homeSections"

const META = new Map(HOME_SECTIONS.map((s) => [s.key, s]))

/**
 * Reorder and hide the homepage's blocks.
 *
 * Up/down buttons rather than drag-and-drop: dragging needs a library, and with
 * sixteen rows on a page that is already a long form, a click target that works
 * with the keyboard is the better trade.
 */
export default function SectionOrderCard() {
  const { homeSections, moveHomeSection, toggleHomeSection, resetHomeSections } = useSettingsForm()

  const hiddenCount = homeSections.filter((s) => !s.active).length

  return (
    <CollapsibleCard
      title="Homepage Section Order"
      description="Drag the page into shape: reorder the blocks, or switch the ones you are not using off."
      icon={LayoutList}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={hiddenCount > 0 ? "secondary" : "default"}>
            {hiddenCount > 0 ? `${hiddenCount} hidden` : "All visible"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              resetHomeSections()
            }}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset order
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {homeSections.map((section, index) => {
          const meta = META.get(section.key)
          return (
            <div
              key={section.key}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-opacity ${
                section.active ? "" : "opacity-60"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-[11px] font-black tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{meta?.label ?? section.key}</p>
                {meta?.hint && (
                  <p className="truncate text-[10px] text-muted-foreground">{meta.hint}</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveHomeSection(index, -1)}
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === homeSections.length - 1}
                  onClick={() => moveHomeSection(index, 1)}
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  title={section.active ? "Hide this section" : "Show this section"}
                  className={`relative ml-1 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    section.active ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  onClick={() => toggleHomeSection(section.key)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      section.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )
        })}

        <p className="pt-2 text-[10px] text-muted-foreground">
          Switching a section on is permission to appear, not a promise that it will — a block with
          nothing in it (no reels uploaded, no reviews written yet) still renders nothing. Video
          banners follow the section they are anchored to, so moving a section takes its banner with
          it.
        </p>
      </div>
    </CollapsibleCard>
  )
}
