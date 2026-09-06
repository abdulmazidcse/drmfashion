"use client"

import { Megaphone, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"
import { MAX_ANNOUNCEMENT_SLIDES } from "@/lib/announcementBar"

/** Hex text box paired with a swatch picker, both driving the same value. */
function ColorField({
  label,
  value,
  onChange,
  labelClass,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  labelClass: string
}) {
  return (
    <div className="space-y-3">
      <Label className={labelClass}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-card p-1"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#101010"
          className="font-mono"
        />
      </div>
    </div>
  )
}

/**
 * The strip above the header. Multiple messages rotate through one another;
 * a single message just sits there, which is what most stores want.
 */
export default function AnnouncementBarCard() {
  const {
    announcementBar,
    updateAnnouncementBar,
    updateAnnouncementSlide,
    addAnnouncementSlide,
    removeAnnouncementSlide,
    moveAnnouncementSlide,
    fieldLabel,
  } = useSettingsForm()

  const liveCount = announcementBar.slides.filter((s) => s.text.trim()).length

  return (
    <CollapsibleCard
      title="Announcement Bar"
      description="A strip above the header, on every storefront page. Messages rotate; empty ones are ignored."
      icon={Megaphone}
      action={
        <div className="flex items-center gap-3">
          <Badge variant={announcementBar.active && liveCount > 0 ? "default" : "secondary"}>
            {announcementBar.active
              ? liveCount > 0
                ? `${liveCount} message${liveCount === 1 ? "" : "s"}`
                : "No messages"
              : "Hidden"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              announcementBar.active ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            onClick={() => updateAnnouncementBar({ active: !announcementBar.active })}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                announcementBar.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      }
    >
      <div
        className={`space-y-6 transition-all ${
          announcementBar.active ? "" : "pointer-events-none opacity-50"
        }`}
      >
        {/* Live preview — the colours are the whole reason this card is fiddly
            to get right blind. */}
        <div
          className="flex items-center justify-center rounded-md px-6 py-2.5"
          style={{ background: announcementBar.background, color: announcementBar.textColor }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            {announcementBar.slides.find((s) => s.text.trim())?.text || "Your message here"}
          </span>
        </div>

        {announcementBar.slides.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
            No messages yet. Add one to switch the strip on.
          </p>
        ) : (
          <div className="space-y-3">
            {announcementBar.slides.map((slide, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border p-3">
                <span className="mt-3 w-4 shrink-0 text-center text-[10px] font-black tabular-nums text-muted-foreground">
                  {index + 1}
                </span>

                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                  <Input
                    type="text"
                    value={slide.text}
                    onChange={(e) => updateAnnouncementSlide(index, { text: e.target.value })}
                    placeholder={`Tall Men's & Tall Women's Clothing up to 7'1"`}
                  />
                  <Input
                    type="text"
                    value={slide.href}
                    onChange={(e) => updateAnnouncementSlide(index, { href: e.target.value })}
                    placeholder="/shop  (optional — makes the whole strip clickable)"
                    className="font-mono"
                  />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => moveAnnouncementSlide(index, -1)}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === announcementBar.slides.length - 1}
                    onClick={() => moveAnnouncementSlide(index, 1)}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAnnouncementSlide(index)}
                    title="Remove message"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addAnnouncementSlide}
          disabled={announcementBar.slides.length >= MAX_ANNOUNCEMENT_SLIDES}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add message
        </Button>

        <Separator />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ColorField
            label="Background"
            value={announcementBar.background}
            onChange={(background) => updateAnnouncementBar({ background })}
            labelClass={fieldLabel}
          />
          <ColorField
            label="Text colour"
            value={announcementBar.textColor}
            onChange={(textColor) => updateAnnouncementBar({ textColor })}
            labelClass={fieldLabel}
          />

          <div className="space-y-3">
            <Label className={fieldLabel}>Seconds per message</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={announcementBar.intervalSeconds}
              onChange={(e) =>
                updateAnnouncementBar({ intervalSeconds: Number(e.target.value) || 0 })
              }
            />
            <p className="text-[10px] text-muted-foreground">
              2–30 seconds. Set 0 to stop the rotation and show only the first message.
            </p>
          </div>

          <div className="space-y-3">
            <Label className={fieldLabel}>Let visitors close it</Label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                announcementBar.dismissible ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              onClick={() => updateAnnouncementBar({ dismissible: !announcementBar.dismissible })}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  announcementBar.dismissible ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <p className="text-[10px] text-muted-foreground">
              Closing it lasts for that browser tab only, and editing the copy brings it back.
            </p>
          </div>
        </div>
      </div>
    </CollapsibleCard>
  )
}
