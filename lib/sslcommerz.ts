// ─── SSLCommerz Hosted Checkout (Session API) ────────────────────────────────
// Bangladesh's other major redirect-based gateway, alongside bKash — see
// lib/bkash.ts for the sibling implementation this mirrors. developer.sslcommerz.com.
//
// Credentials come from SSLCommerz's own merchant onboarding, not this codebase:
//   SSLCOMMERZ_STORE_ID
//   SSLCOMMERZ_STORE_PASSWORD
//   SSLCOMMERZ_BASE_URL   sandbox.sslcommerz.com in testing, securepay.sslcommerz.com live
// ─────────────────────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 30_000

function baseUrl(): string {
  const url = process.env.SSLCOMMERZ_BASE_URL?.trim().replace(/\/+$/, "")
  if (!url) throw new Error("SSLCommerz is not configured (SSLCOMMERZ_BASE_URL missing).")
  return url
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`SSLCommerz is not configured (${name} missing).`)
  return value
}

async function sslcommerzFetch<T = Record<string, unknown>>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(`SSLCommerz request failed (${res.status})`)
    }
    return data as T
  } finally {
    clearTimeout(timeout)
  }
}

interface SslcommerzSessionRaw {
  status?: string
  failedreason?: string
  sessionkey?: string
  GatewayPageURL?: string
}

export interface SslcommerzSessionResult {
  sessionkey: string
  gatewayPageURL: string
}

export async function createSslcommerzSession(params: {
  amount: number
  tranId: string
  successUrl: string
  failUrl: string
  cancelUrl: string
  ipnUrl: string
  customer: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    postcode: string
    country: string
  }
  productName: string
}): Promise<SslcommerzSessionResult> {
  const body = new URLSearchParams({
    store_id: requiredEnv("SSLCOMMERZ_STORE_ID"),
    store_passwd: requiredEnv("SSLCOMMERZ_STORE_PASSWORD"),
    total_amount: params.amount.toFixed(2),
    currency: "BDT",
    tran_id: params.tranId,
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    cus_name: params.customer.name || "N/A",
    cus_email: params.customer.email || "N/A",
    cus_add1: params.customer.address || "N/A",
    cus_city: params.customer.city || "N/A",
    cus_postcode: params.customer.postcode || "N/A",
    cus_country: params.customer.country || "N/A",
    cus_phone: params.customer.phone || "N/A",
    shipping_method: "NO",
    num_of_item: "1",
    product_name: params.productName.slice(0, 255) || "Order",
    product_category: "General",
    product_profile: "general",
  })

  const data = await sslcommerzFetch<SslcommerzSessionRaw>("/gwprocess/v4/api.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (data?.status !== "SUCCESS" || !data?.GatewayPageURL || !data?.sessionkey) {
    throw new Error(data?.failedreason || "SSLCommerz did not return a payment URL.")
  }

  return { sessionkey: data.sessionkey, gatewayPageURL: data.GatewayPageURL }
}

interface SslcommerzValidationRaw {
  status?: string
  tran_id?: string
  val_id?: string
  amount?: string
  currency?: string
  bank_tran_id?: string
  card_type?: string
}

export interface SslcommerzValidationResult {
  status: string
  tranId: string
  valId: string
  amount: number
  bankTranId?: string
  cardType?: string
}

/**
 * Server-to-server confirmation via the Validation API — the only source of
 * truth for whether a transaction actually succeeded. The `status`/`amount`
 * fields SSLCommerz posts to success_url/ipn_url are a UX hint only, mirroring
 * how the bKash callback never trusts its own redirect query params either.
 */
export async function validateSslcommerzTransaction(valId: string): Promise<SslcommerzValidationResult | null> {
  const qs = new URLSearchParams({
    val_id: valId,
    store_id: requiredEnv("SSLCOMMERZ_STORE_ID"),
    store_passwd: requiredEnv("SSLCOMMERZ_STORE_PASSWORD"),
    format: "json",
  })

  const data = await sslcommerzFetch<SslcommerzValidationRaw>(`/validator/api/validationserverAPI.php?${qs.toString()}`, {
    method: "GET",
  })

  if (!data?.tran_id || !data?.val_id) return null

  return {
    status: data.status || "",
    tranId: data.tran_id,
    valId: data.val_id,
    amount: Number(data.amount) || 0,
    bankTranId: data.bank_tran_id,
    cardType: data.card_type,
  }
}
