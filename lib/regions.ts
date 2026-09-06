// ─── Sub-national regions ────────────────────────────────────────────────────
// Tax is charged per province/state, so the shopper has to pick one from a
// list rather than type it: "NY", "New York" and "new york" are the same place
// to a person and three different keys to a lookup table.
//
// Only the countries whose tax is collected at checkout need a list. Everywhere
// else the address form keeps its free-text box, because there is nothing to
// match against.
// ─────────────────────────────────────────────────────────────────────────────

export interface Region {
  code: string
  name: string
}

export const CA_PROVINCES: Region[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
]

export const US_STATES: Region[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

const REGIONS_BY_COUNTRY: Record<string, Region[]> = {
  CA: CA_PROVINCES,
  US: US_STATES,
}

/** Regions for a country, or an empty array where the form should stay free text. */
export function regionsFor(countryCode: string | undefined | null): Region[] {
  if (!countryCode) return []
  return REGIONS_BY_COUNTRY[countryCode.toUpperCase()] ?? []
}

export function hasRegions(countryCode: string | undefined | null): boolean {
  return regionsFor(countryCode).length > 0
}

export function regionName(countryCode: string, regionCode: string): string {
  const match = regionsFor(countryCode).find(
    (r) => r.code.toUpperCase() === (regionCode || "").toUpperCase()
  )
  return match?.name || regionCode
}

/** What to call the field — "Province" in Canada, "State" in the US. */
export function regionLabelFor(countryCode: string | undefined | null): string {
  const code = (countryCode || "").toUpperCase()
  if (code === "CA") return "Province"
  if (code === "US") return "State"
  return "State / Province / Region"
}
