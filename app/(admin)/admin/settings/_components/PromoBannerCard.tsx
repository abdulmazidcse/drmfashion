"use client"

import { Image as ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import CollapsibleCard from "./CollapsibleCard"
import MediaField from "./MediaField"
import { useSettingsForm } from "./SettingsFormContext"
import {
  PROMO_BANNER_POSITIONS,
  PROMO_BANNER_TEXT_SIZES,
  type PromoBannerPosition,
  type PromoBannerTextSize,
} from "@/lib/promoBanner"

const selectClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"

const POSITION_LABELS: Record<PromoBannerPosition, string> = {
  "top-left": "Top left",
  "top-center": "Top centre",
  "top-right": "Top right",
  "middle-left": "Middle left",
  "middle-center": "Middle centre",
  "middle-right": "Middle right",
  "bottom-left": "Bottom left",
  "bottom-center": "Bottom centre",
  "bottom-right": "Bottom right",
}

const SIZE_LABELS: Record<PromoBannerTextSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra large",
}

/** A colour box beside the hex, so a value can be typed or picked. */
function ColourField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  hint?: string
}) {
  const { fieldLabel, helpText } = useSettingsForm()

  return (
    <div className="space-y-3">
      <Label className={fieldLabel}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
          aria-label={label}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          className="font-mono"
        />
      </div>
      {hint && <p className={helpText}>{hint}</p>}
    </div>
  )
}

/**
 * The campaign poster that covers the storefront shortly after it loads.
 *
 * Separate from the slide-in drawer above: that one collects email addresses
 * and leaves a tab behind, this one shows a picture and sends the visitor
 * somewhere. Either can run without the other.
 */
export default function PromoBannerCard() {
  const { promoBanner, updatePromoBanner, fieldLabel, helpText } = useSettingsForm()

  const ready = promoBanner.image.trim() !== ""

  return (
    <CollapsibleCard
      title="Pop-up Banner (Image)"
      description="A full-screen picture with copy over it, shown a moment after the storefront loads."
      icon={ImageIcon}
      defaultCollapsed
      action={
        <div className="flex items-center gap-3">
          <Badge variant={promoBanner.active && ready ? "default" : "secondary"}>
            {promoBanner.active ? (ready ? "Live" : "No image") : "Off"}
          </Badge>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              promoBanner.active ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            onClick={() => updatePromoBanner({ active: !promoBanner.active })}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                promoBanner.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      }
    >
      <div
        className={`space-y-8 transition-all ${
          promoBanner.active ? "" : "pointer-events-none opacity-50"
        }`}
      >
        {/* ─── Picture ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MediaField
            label="Banner Image"
            hint="Required — with no picture the banner never opens. Portrait or square reads best on a phone."
            value={promoBanner.image}
            onChange={(next) =>
              updatePromoBanner({
                image: typeof next === "function" ? next(promoBanner.image) : next,
              })
            }
          />

          <div className="space-y-3">
            <Label className={fieldLabel}>Image Description</Label>
            <Input
              type="text"
              value={promoBanner.imageAlt}
              onChange={(e) => updatePromoBanner({ imageAlt: e.target.value })}
              placeholder="Eid collection — up to 40% off"
            />
            <p className={helpText}>
              What a screen reader announces for the picture. Empty falls back to the heading below.
            </p>
          </div>
        </div>

        {/* ─── Size and timing ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3 md:col-span-2">
            <Label className={fieldLabel}>Popup Width (pixels)</Label>
            <Input
              type="number"
              min={280}
              max={1200}
              step={20}
              value={promoBanner.maxWidthPx}
              onChange={(e) => updatePromoBanner({ maxWidthPx: Number(e.target.value) })}
              className="font-mono font-bold"
            />
            <p className={helpText}>
              How wide it is allowed to get, 280–1200. This is the desktop size: on a phone the
              banner already fills the screen, so a bigger number changes nothing there. 560 is the
              default; around 900 suits a wide landscape picture.
            </p>
          </div>

          <div className="space-y-3">
            <Label className={fieldLabel}>Open After (seconds)</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={promoBanner.delaySeconds}
              onChange={(e) => updatePromoBanner({ delaySeconds: Number(e.target.value) })}
              className="font-mono font-bold"
            />
            <p className={helpText}>
              How long after the page loads before it appears. 1–2 is usual; 0 opens immediately.
            </p>
          </div>

          <div className="space-y-3">
            <Label className={fieldLabel}>Show Again After (hours)</Label>
            <Input
              type="number"
              min={0}
              max={8760}
              value={promoBanner.reshowHours}
              onChange={(e) => updatePromoBanner({ reshowHours: Number(e.target.value) })}
              className="font-mono font-bold"
            />
            <p className={helpText}>
              Once a visitor closes it, this long before it can open again for them. Remembered in
              their own browser, so it is per device and clearing site data resets it.
            </p>
          </div>
        </div>

        {/* ─── Copy over the picture ───────────────────────────────────── */}
        <div className="space-y-6 border-t pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3 md:col-span-2">
              <Label className={fieldLabel}>Heading</Label>
              <Input
                type="text"
                value={promoBanner.heading}
                onChange={(e) => updatePromoBanner({ heading: e.target.value })}
                placeholder="Eid Collection"
                className="font-bold"
              />
              <p className={helpText}>
                Leave every copy field and the button empty to show the picture on its own.
              </p>
            </div>

            <ColourField
              label="Heading Colour"
              value={promoBanner.headingColor}
              onChange={(headingColor) => updatePromoBanner({ headingColor })}
            />

            <div className="space-y-3">
              <Label className={fieldLabel}>Heading Size</Label>
              <select
                className={selectClass}
                value={promoBanner.headingSize}
                onChange={(e) =>
                  updatePromoBanner({ headingSize: e.target.value as PromoBannerTextSize })
                }
              >
                {PROMO_BANNER_TEXT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className={fieldLabel}>Description</Label>
              <Textarea
                rows={2}
                value={promoBanner.body}
                onChange={(e) => updatePromoBanner({ body: e.target.value })}
                placeholder="Up to 40% off panjabi, blazer and more."
              />
            </div>

            <ColourField
              label="Description Colour"
              value={promoBanner.bodyColor}
              onChange={(bodyColor) => updatePromoBanner({ bodyColor })}
            />

            <div className="space-y-3">
              <Label className={fieldLabel}>Description Size</Label>
              <select
                className={selectClass}
                value={promoBanner.bodySize}
                onChange={(e) =>
                  updatePromoBanner({ bodySize: e.target.value as PromoBannerTextSize })
                }
              >
                {PROMO_BANNER_TEXT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className={fieldLabel}>Text Position</Label>
              <select
                className={selectClass}
                value={promoBanner.position}
                onChange={(e) =>
                  updatePromoBanner({ position: e.target.value as PromoBannerPosition })
                }
              >
                {PROMO_BANNER_POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {POSITION_LABELS[position]}
                  </option>
                ))}
              </select>
              <p className={helpText}>
                Where the heading, description and button sit over the picture. Pick the corner your
                artwork leaves empty.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Button ──────────────────────────────────────────────────── */}
        <div className="space-y-6 border-t pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label className={fieldLabel}>Button Label</Label>
              <Input
                type="text"
                value={promoBanner.buttonLabel}
                onChange={(e) => updatePromoBanner({ buttonLabel: e.target.value })}
                placeholder="Shop the collection"
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>Button Link</Label>
              <Input
                type="text"
                value={promoBanner.buttonHref}
                onChange={(e) => updatePromoBanner({ buttonHref: e.target.value })}
                placeholder="/category/premium-panjabi-for-men"
                className="font-mono"
              />
              <p className={helpText}>
                The button is drawn only when both the label and the link are filled in. Clicking it
                closes the banner.
              </p>
            </div>

            <ColourField
              label="Button Background"
              value={promoBanner.buttonBg}
              onChange={(buttonBg) => updatePromoBanner({ buttonBg })}
            />

            <ColourField
              label="Button Text Colour"
              value={promoBanner.buttonColor}
              onChange={(buttonColor) => updatePromoBanner({ buttonColor })}
            />
          </div>
        </div>
      </div>
    </CollapsibleCard>
  )
}
