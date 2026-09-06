import type { CSSProperties } from "react"

export type ColorType = "SOLID" | "GRADIENT" | "CHECK" | "IMAGE"

export type SwatchColor = {
  type?: string | null
  value: string
  value2?: string | null
  angle?: number | null
  image?: string | null
}

export const COLOR_TYPES: { value: ColorType; label: string; hint: string }[] = [
  { value: "SOLID", label: "Solid", hint: "One flat colour" },
  { value: "GRADIENT", label: "Gradient", hint: "Blend between two colours" },
  { value: "CHECK", label: "Check", hint: "Checked / plaid weave drawn in CSS" },
  { value: "IMAGE", label: "Fabric", hint: "Real fabric or print photo" },
]

export const DEFAULT_ANGLE = 135

/**
 * Turns a Color row into inline styles for a swatch. Gradients, checks and
 * fabric photos all need `background-image`, so never render a Color with a
 * bare `backgroundColor`.
 */
export function swatchStyle(color?: SwatchColor | null, fallback = "#71717a"): CSSProperties {
  const base = color?.value?.trim() || fallback

  const image = color?.image?.trim()
  if (color?.type === "IMAGE" && image) {
    return {
      backgroundColor: base,
      backgroundImage: `url("${image.replace(/"/g, "%22")}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }
  }

  const second = color?.value2?.trim()

  if (color?.type === "GRADIENT" && second) {
    return {
      backgroundImage: `linear-gradient(${color.angle ?? DEFAULT_ANGLE}deg, ${base} 0%, ${second} 100%)`,
    }
  }

  if (color?.type === "CHECK" && second) {
    return {
      backgroundColor: base,
      backgroundImage:
        `repeating-linear-gradient(0deg, ${second} 0 3px, transparent 3px 10px),` +
        `repeating-linear-gradient(90deg, ${second} 0 3px, transparent 3px 10px)`,
    }
  }

  return { backgroundColor: base }
}

/** CSS colour keywords light enough to need dark text over them. */
const LIGHT_KEYWORDS = new Set([
  "white", "snow", "honeydew", "mintcream", "azure", "aliceblue", "ghostwhite", "whitesmoke",
  "seashell", "beige", "oldlace", "floralwhite", "ivory", "antiquewhite", "linen",
  "lavenderblush", "mistyrose", "cornsilk", "blanchedalmond", "bisque", "navajowhite",
  "wheat", "burlywood", "papayawhip", "moccasin", "peachpuff", "lemonchiffon", "lightyellow",
  "lightgoldenrodyellow", "palegoldenrod", "khaki", "gainsboro", "lightgray", "lightgrey",
  "silver", "lavender", "thistle", "plum", "pink", "lightpink", "lightcyan", "paleturquoise",
  "powderblue", "lightblue", "lightskyblue", "skyblue", "lightsteelblue", "aquamarine",
  "palegreen", "lightgreen", "greenyellow", "chartreuse", "yellow", "gold", "aqua", "cyan",
  "lime", "springgreen", "orange", "coral", "salmon", "lightsalmon", "sandybrown", "tan",
])

/**
 * WCAG relative luminance of a hex colour, or null when the value is not one.
 *
 * Exported because the right light/dark cut-off depends on what is painted on
 * the colour: a 14px swatch and a panel of 13px body copy do not flip at the
 * same point, so callers pick their own threshold.
 */
export function relativeLuminance(hex?: string | null): number | null {
  const raw = (hex || "").trim().toLowerCase().replace(/^#/, "")
  if (raw.length !== 3 && raw.length !== 6) return null

  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return null

  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Whether a colour is light enough that dark text reads better on it than
 * white. 0.179 is the point where contrast against white and against black is
 * equal.
 *
 * Callers use this to decide whether a panel painted in a product colour needs
 * its light text protecting — "Ivory White" and "Navy Blue" cannot both carry
 * the same foreground.
 */
export function isLightColor(hex?: string | null): boolean {
  const input = (hex || "").trim().toLowerCase()

  // Color rows are hand-entered and not always hex — "white" and "black" are
  // real CSS keywords, while values like "navy-blue" are not colours at all.
  // Anything not listed here is treated as dark, which is the safe answer for
  // both a genuinely dark colour and an invalid one (an invalid value leaves
  // the element on its dark Tailwind background).
  if (LIGHT_KEYWORDS.has(input)) return true

  const luminance = relativeLuminance(input)
  return luminance === null ? false : luminance > 0.179
}

/** Short human label for a swatch, e.g. "#0F172A → #6366F1". */
export function swatchLabel(color: SwatchColor): string {
  if (color.type === "IMAGE") return color.image ? "Fabric photo" : "No fabric photo yet"

  const base = color.value.toUpperCase()
  const second = color.value2?.trim().toUpperCase()
  if (!second || color.type === "SOLID") return base
  return color.type === "GRADIENT" ? `${base} → ${second}` : `${base} / ${second}`
}
