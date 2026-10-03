/**
 * Steadfast Courier (packzy) API client — server only.
 *
 * Credentials come from the environment, never from code or the database:
 *   STEADFAST_API_KEY, STEADFAST_SECRET_KEY
 *   STEADFAST_BASE_URL (optional, defaults to the current production API)
 *
 * Only the calls the admin needs: book a consignment for an order, read its
 * delivery status, and read the account balance (used as a cheap credential
 * check). Every call is time-limited and returns a typed error instead of
 * throwing raw fetch failures, so a courier outage cannot take an admin page
 * down with it.
 */

export const STEADFAST_CARRIER_NAME = "Steadfast"
export const STEADFAST_TRACKING_URL = "https://steadfast.com.bd/t/{tracking}"

const DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1"
const TIMEOUT_MS = 15_000

export class SteadfastError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
  }
}

export function steadfastConfigured() {
  return Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY)
}

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const apiKey = process.env.STEADFAST_API_KEY
  const secretKey = process.env.STEADFAST_SECRET_KEY
  if (!apiKey || !secretKey) {
    throw new SteadfastError("Steadfast is not configured. Add STEADFAST_API_KEY and STEADFAST_SECRET_KEY to .env.")
  }
  const base = (process.env.STEADFAST_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "")

  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError"
    throw new SteadfastError(timedOut ? "Steadfast did not respond in time." : "Could not reach Steadfast.")
  }

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
  // Steadfast reports some failures as HTTP 200 with a non-200 `status` field.
  const bodyStatus = typeof data?.status === "number" ? data.status : res.status
  if (!res.ok || bodyStatus >= 400) {
    const errors = data?.errors && typeof data.errors === "object" ? Object.values(data.errors).flat().join(" ") : ""
    const message = (typeof data?.message === "string" && data.message) || errors || `Steadfast error (${res.status})`
    throw new SteadfastError(message, bodyStatus)
  }
  return data as T
}

/**
 * Bangladeshi mobile number in the 11-digit local form Steadfast requires:
 * "+880 1821-915515" / "8801821915515" / "01821915515" → "01821915515".
 * Returns null when it does not look like a BD mobile number.
 */
export function normalizeBdPhone(raw: string | null | undefined): string | null {
  const digits = String(raw || "").replace(/\D/g, "")
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits.startsWith("1") && digits.length === 10 ? `0${digits}` : digits
  return /^01[3-9]\d{8}$/.test(local) ? local : null
}

export interface SteadfastConsignment {
  consignment_id: number
  invoice: string
  tracking_code: string
  status: string
}

export interface CreateConsignmentInput {
  /** Unique per consignment — the order id. */
  invoice: string
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  /** Taka to collect on delivery; 0 for a prepaid order. */
  codAmount: number
  note?: string
}

export async function createConsignment(input: CreateConsignmentInput): Promise<SteadfastConsignment> {
  const data = await call<{ consignment?: SteadfastConsignment }>("/create_order", {
    method: "POST",
    body: {
      invoice: input.invoice,
      recipient_name: input.recipientName.slice(0, 100),
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress.slice(0, 250),
      cod_amount: Math.max(0, Math.round(input.codAmount)),
      note: input.note?.slice(0, 500) || undefined,
    },
  })
  if (!data.consignment?.tracking_code) {
    throw new SteadfastError("Steadfast accepted the request but returned no tracking code.")
  }
  return data.consignment
}

/** Delivery status by tracking code, e.g. "in_review", "pending", "delivered", "cancelled". */
export async function statusByTrackingCode(trackingCode: string): Promise<string> {
  const data = await call<{ delivery_status?: string }>(
    `/status_by_trackingcode/${encodeURIComponent(trackingCode)}`
  )
  return data.delivery_status || "unknown"
}

export async function currentBalance(): Promise<number> {
  const data = await call<{ current_balance?: number }>("/get_balance")
  return Number(data.current_balance ?? 0)
}

export function steadfastTrackingUrl(trackingCode: string) {
  return STEADFAST_TRACKING_URL.replace("{tracking}", encodeURIComponent(trackingCode))
}
