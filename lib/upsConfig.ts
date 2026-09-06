// ─── UPS credentials ─────────────────────────────────────────────────────────
// Credentials come from Admin → Settings → Shipping, falling back to the `.env`
// values they replaced. The fallback matters: an existing deployment that has
// UPS working through env vars keeps working after this change, and only starts
// reading the database once someone saves credentials there.
//
// The three secret keys are listed in `SECRET_SETTING_KEYS`, so they never
// travel to the browser through `/api/settings`. Server code reads them via
// `getSettings()`, which is not filtered.
// ─────────────────────────────────────────────────────────────────────────────

export interface UpsConfig {
  /** Master switch — off means UPS is not offered at checkout at all. */
  enabled: boolean
  clientId: string
  clientSecret: string
  accountNumber: string
  environment: "sandbox" | "production"
  /** True only when a real credential pair is present. */
  isConfigured: boolean
}

/** Values shipped in `.env`; treated as absent so they cannot bill anyone. */
function isPlaceholderValue(value: string): boolean {
  return !value || value.startsWith("placeholder_")
}

function envFallback(key: string): string {
  const value = process.env[key] || ""
  return isPlaceholderValue(value) ? "" : value
}

export function upsConfigFromSettings(
  settings: Record<string, string> | undefined | null
): UpsConfig {
  const s = settings ?? {}

  const clientId = (s.ups_client_id || "").trim() || envFallback("UPS_CLIENT_ID")
  const clientSecret = (s.ups_client_secret || "").trim() || envFallback("UPS_CLIENT_SECRET")
  const accountNumber = (s.ups_account_number || "").trim() || envFallback("UPS_ACCOUNT_NUMBER")

  const rawEnvironment = (s.ups_environment || process.env.UPS_ENVIRONMENT || "sandbox").trim()
  const environment = rawEnvironment === "production" ? "production" : "sandbox"

  return {
    // Off unless switched on: turning UPS on is a deliberate act, and a store
    // that never configured it should not advertise carrier services.
    enabled: s.ups_enabled === "true",
    clientId,
    clientSecret,
    accountNumber,
    environment,
    isConfigured: Boolean(clientId && clientSecret),
  }
}

/** Never returns the secret itself — only whether one is stored. */
export function maskUpsConfig(config: UpsConfig) {
  return {
    ups_enabled: String(config.enabled),
    ups_environment: config.environment,
    ups_client_id: config.clientId,
    ups_account_number: config.accountNumber,
    // The admin form shows "saved" rather than the value, and sends the field
    // back untouched unless the operator types a replacement.
    ups_client_secret_set: Boolean(config.clientSecret),
    ups_is_configured: config.isConfigured,
  }
}
