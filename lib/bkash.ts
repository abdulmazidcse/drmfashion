// ─── bKash Tokenized Checkout (Payment Gateway) ─────────────────────────────
// One-time "Checkout Payment" flow (mode 0011) — see developer.bka.sh. Not the
// recurring "Checkout Agreement" flow, which needs a different mode/agreementID
// this store has no use for.
//
// Credentials come from bKash's own merchant onboarding, not this codebase:
//   BKASH_BASE_URL   e.g. https://tokenized.pay.bka.sh/v1.2.0-beta
//   BKASH_APP_KEY
//   BKASH_APP_SECRET
//   BKASH_USERNAME
//   BKASH_PASSWORD
// ─────────────────────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30_000 // bKash's own documented timeout for every API call

interface BkashTokenResponse {
  id_token?: string
  token_type?: string
  expires_in?: number
  refresh_token?: string
  statusCode?: string
  statusMessage?: string
}

export interface BkashCreatePaymentResult {
  paymentID: string
  bkashURL: string
  transactionStatus: string
}

export interface BkashExecutePaymentResult {
  paymentID: string
  trxID?: string
  transactionStatus: string
  amount?: string
  statusCode?: string
  statusMessage?: string
}

// Cached in-process only — each PM2 cluster worker grants its own token. No
// documented rate limit on Grant Token itself (unlike Refresh Token, capped at
// 2 calls/hour), so re-granting per worker on expiry is acceptable.
let cachedToken: { idToken: string; expiresAt: number } | null = null

function baseUrl(): string {
  const url = process.env.BKASH_BASE_URL?.trim().replace(/\/+$/, "")
  if (!url) throw new Error("bKash is not configured (BKASH_BASE_URL missing).")
  return url
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`bKash is not configured (${name} missing).`)
  return value
}

async function bkashFetch<T = Record<string, unknown>>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = data?.errorMessage || data?.statusMessage || `bKash request failed (${res.status})`
      throw new Error(message)
    }
    return data as T
  } finally {
    clearTimeout(timeout)
  }
}

/** Grants a fresh token, or hands back the cached one if it still has headroom. */
async function grantToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.idToken
  }

  const data = await bkashFetch<BkashTokenResponse>("/tokenized/checkout/token/grant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: requiredEnv("BKASH_USERNAME"),
      password: requiredEnv("BKASH_PASSWORD"),
    },
    body: JSON.stringify({
      app_key: requiredEnv("BKASH_APP_KEY"),
      app_secret: requiredEnv("BKASH_APP_SECRET"),
    }),
  })

  if (!data?.id_token) {
    throw new Error(data?.statusMessage || "bKash did not return an authorization token.")
  }

  cachedToken = {
    idToken: data.id_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  }
  return cachedToken.idToken
}

async function authedFetch<T = Record<string, unknown>>(path: string, init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }): Promise<T> {
  const idToken = await grantToken()
  try {
    return await bkashFetch<T>(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: idToken,
        "X-App-Key": requiredEnv("BKASH_APP_KEY"),
      },
    })
  } catch {
    // The cached token may have been revoked/expired server-side ahead of our
    // own clock — one retry with a forced re-grant before giving up.
    cachedToken = null
    const idToken2 = await grantToken()
    return bkashFetch<T>(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: idToken2,
        "X-App-Key": requiredEnv("BKASH_APP_KEY"),
      },
    })
  }
}

interface BkashCreatePaymentRaw {
  paymentID?: string
  bkashURL?: string
  transactionStatus?: string
  statusMessage?: string
}

interface BkashExecuteOrQueryRaw {
  trxID?: string
  transactionStatus?: string
  amount?: string
  statusCode?: string
  statusMessage?: string
}

export async function createBkashPayment(params: {
  amount: number
  callbackURL: string
  merchantInvoiceNumber: string
  payerReference: string
}): Promise<BkashCreatePaymentResult> {
  const data = await authedFetch<BkashCreatePaymentRaw>("/tokenized/checkout/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      mode: "0011",
      payerReference: params.payerReference.slice(0, 255) || "N/A",
      callbackURL: params.callbackURL,
      amount: params.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: params.merchantInvoiceNumber,
    }),
  })

  if (!data?.paymentID || !data?.bkashURL) {
    throw new Error(data?.statusMessage || "bKash did not return a payment URL.")
  }

  return {
    paymentID: data.paymentID,
    bkashURL: data.bkashURL,
    transactionStatus: data.transactionStatus || "Initiated",
  }
}

export async function executeBkashPayment(paymentID: string): Promise<BkashExecutePaymentResult> {
  const data = await authedFetch<BkashExecuteOrQueryRaw>(`/tokenized/checkout/execute/${encodeURIComponent(paymentID)}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  })

  return {
    paymentID,
    trxID: data?.trxID,
    transactionStatus: data?.transactionStatus || "Failed",
    amount: data?.amount,
    statusCode: data?.statusCode,
    statusMessage: data?.statusMessage,
  }
}

/** Fallback when Execute Payment times out or returns no response, per bKash's documented pattern. */
export async function queryBkashPayment(paymentID: string): Promise<BkashExecutePaymentResult> {
  const data = await authedFetch<BkashExecuteOrQueryRaw>("/tokenized/checkout/payment/status", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ paymentID }),
  })

  return {
    paymentID,
    trxID: data?.trxID,
    transactionStatus: data?.transactionStatus || "Failed",
    amount: data?.amount,
    statusCode: data?.statusCode,
    statusMessage: data?.statusMessage,
  }
}
