/**
 * The height ranges on the pillars carousel's first slide — the row of chips
 * under the figures, and the readout that appears beside the measuring rule
 * when one is picked.
 *
 * Stored inside the existing `home_community_tabs` setting rather than beside
 * it, because they belong to that slide and are edited with the rest of it.
 *
 * Three per gender is the ceiling, and it is structural rather than taste: the
 * slide lays the figures out on thirds of the media box and slides the chosen
 * one into the last third. A fourth range has nowhere to stand.
 */

export interface PillarSize {
  /** Stable across edits; what the slide tracks the selection by. */
  id: string
  /** The chip's label — "6' - 6'3\"". */
  range: string
  /** The name that appears beside the rule — "Semi Tall". */
  name: string
  /** The height readout under that name. */
  height: string
  /** The inseam readout below it. */
  inseam: string
  /**
   * How tall the measuring rule is drawn, as a percentage of the media box.
   * It grows with the range so the rule reads as the height being described
   * rather than as decoration around the numbers.
   */
  bracket: number
}

export type PillarGender = "men" | "women"

export type PillarSizes = Record<PillarGender, PillarSize[]>

/**
 * The slide lays its figures out on thirds, so anything past the third range
 * has nowhere to stand. Enforced when reading rather than offered as a choice:
 * the editor works from the five figure slots the slide actually has.
 */
export const MAX_PILLAR_SIZES = 3

export const MIN_PILLAR_BRACKET = 20
export const MAX_PILLAR_BRACKET = 100

/** What the carousel hardcoded before any of this was editable. */
export const DEFAULT_PILLAR_SIZES: PillarSizes = {
  men: [
    { id: "men-1", range: `6' - 6'3"`, name: "Semi Tall", height: `6' 0" - 6' 3"`, inseam: `34"`, bracket: 51 },
    { id: "men-2", range: `6'3" - 6'7"`, name: "Tall", height: `6' 3" - 6' 7"`, inseam: `36"`, bracket: 54 },
    { id: "men-3", range: `6'8" - 7'1"`, name: "Extra Tall", height: `6' 8" - 7' 1"`, inseam: `38" - 40"`, bracket: 58 },
  ],
  women: [
    { id: "women-1", range: `5'9" - 6'1"`, name: "Tall", height: `5' 9" - 6' 1"`, inseam: `Up to 36"`, bracket: 54 },
    { id: "women-2", range: `6'2" - 6'6"`, name: "Extra Tall", height: `6' 2" - 6' 6"`, inseam: `36" and up`, bracket: 58 },
  ],
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

function toSize(raw: unknown, gender: PillarGender, index: number): PillarSize {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const bracket = Number(f.bracket)

  return {
    id: str(f.id, `${gender}-${index + 1}`),
    range: str(f.range, ""),
    name: str(f.name, ""),
    height: str(f.height, ""),
    inseam: str(f.inseam, ""),
    bracket: Number.isFinite(bracket)
      ? Math.min(MAX_PILLAR_BRACKET, Math.max(MIN_PILLAR_BRACKET, Math.round(bracket)))
      : 51 + index * 4,
  }
}

function toSizes(raw: unknown, gender: PillarGender, keepEmpty: boolean): PillarSize[] {
  const rows = (Array.isArray(raw) ? raw : [])
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => toSize(entry, gender, index))
    .slice(0, MAX_PILLAR_SIZES)

  // A chip with no label would be a blank button, so the storefront drops it.
  // The editor keeps it: the range still owns a figure slot, and hiding the row
  // would leave that picture with nothing to edit it by.
  return keepEmpty ? rows : rows.filter((s) => s.range.trim() !== "")
}

/**
 * Reads the `sizes` block out of an already-parsed `home_community_tabs`.
 *
 * A gender with nothing configured falls back to the built-in ranges rather
 * than to an empty slide — the carousel has always shown these, and a store
 * that has never opened this editor should not lose them.
 */
export function parsePillarSizes(
  raw: unknown,
  { keepEmpty = false }: { keepEmpty?: boolean } = {}
): PillarSizes {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}

  const men = toSizes(f.men, "men", keepEmpty)
  const women = toSizes(f.women, "women", keepEmpty)

  return {
    men: men.length > 0 ? men : DEFAULT_PILLAR_SIZES.men,
    women: women.length > 0 ? women : DEFAULT_PILLAR_SIZES.women,
  }
}
