import type { Padding, SectionStyle, LandingTheme } from "@/lib/landing/sections"
import type { CSSProperties } from "react"

/** Vertical breathing room around a section, shared by every renderer. */
export const PADDING_CLASS: Record<Padding, string> = {
  none: "",
  sm: "py-6",
  md: "py-12",
  lg: "py-20",
}

/** Max-width class driven by the page theme, applied inside each section. */
export const WIDTH_CLASS: Record<LandingTheme["width"], string> = {
  narrow: "max-w-2xl",
  medium: "max-w-4xl",
  wide: "max-w-6xl",
}

export const RADIUS_CLASS: Record<LandingTheme["radius"], string> = {
  none: "rounded-none",
  md: "rounded-lg",
  lg: "rounded-2xl",
}

/** Explicit section colours win; empty falls back to the theme, per SectionStyle's own contract. */
export function sectionColors(style: SectionStyle, theme: LandingTheme): CSSProperties {
  return {
    backgroundColor: style.bg || undefined,
    color: style.text || theme.text || undefined,
  }
}

/**
 * Every section component hardcodes its own reading-width cap (e.g. "max-w-4xl
 * mx-auto") — the outer wrapper in LandingRenderer/SectionCanvas skipping the
 * theme's width alone isn't enough to make a section look full-bleed, since
 * this inner cap re-constrains it. Sections call this instead of hardcoding
 * the class so the section's own "Full width" style toggle actually reaches
 * their content, not just their background.
 */
export function contentWidthClass(fullWidth: boolean, maxWidthClass: string): string {
  return fullWidth ? "w-full" : `${maxWidthClass} mx-auto`
}
