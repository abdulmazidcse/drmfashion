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

/** Short human label for a swatch, e.g. "#0F172A → #6366F1". */
export function swatchLabel(color: SwatchColor): string {
  if (color.type === "IMAGE") return color.image ? "Fabric photo" : "No fabric photo yet"

  const base = color.value.toUpperCase()
  const second = color.value2?.trim().toUpperCase()
  if (!second || color.type === "SOLID") return base
  return color.type === "GRADIENT" ? `${base} → ${second}` : `${base} / ${second}`
}
