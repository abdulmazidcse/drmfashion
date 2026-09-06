/**
 * GA4 ecommerce events, pushed to the GTM dataLayer.
 *
 * Nothing here talks to Google directly — the site only pushes into
 * `window.dataLayer`, and the GTM container (see `gtm_id` in Admin → Settings →
 * SEO) decides what to forward to GA4, Ads or Meta. That is why a tag can be
 * added or swapped without touching this file.
 *
 * Event names and payload shape follow GA4's recommended ecommerce schema, so
 * GTM's built-in "GA4 Event" tag can read them with no field mapping:
 * https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

export interface AnalyticsItem {
  item_id: string
  item_name: string
  price: number
  quantity?: number
  item_brand?: string
  item_category?: string
  item_variant?: string
}

interface DataLayerWindow extends Window {
  dataLayer?: Record<string, unknown>[]
  /** Store base currency, published by the GTM snippet in app/layout.tsx. */
  __STORE_CURRENCY__?: string
}

/** Falls back to USD so an event is never dropped for want of a currency. */
export function storeCurrency(): string {
  if (typeof window === "undefined") return "USD"
  return (window as DataLayerWindow).__STORE_CURRENCY__ || "USD"
}

/**
 * Push one ecommerce event.
 *
 * The `ecommerce: null` reset is required, not decorative: the dataLayer merges
 * successive pushes, so without it the previous event's `items` leak into the
 * next one and GA4 reports products that were never involved.
 *
 * Safe to call anywhere — it no-ops during SSR and when no container is
 * installed, so callers never need to check first.
 */
export function pushEcommerce(event: string, ecommerce: Record<string, unknown>): void {
  if (typeof window === "undefined") return

  const w = window as DataLayerWindow
  if (!Array.isArray(w.dataLayer)) return

  try {
    w.dataLayer.push({ ecommerce: null })
    w.dataLayer.push({ event, ecommerce })
  } catch (err) {
    // Analytics must never break a purchase.
    console.warn("[ANALYTICS_PUSH]", event, err)
  }
}

const sum = (items: AnalyticsItem[]) =>
  Math.round(items.reduce((t, i) => t + i.price * (i.quantity ?? 1), 0) * 100) / 100

/**
 * A client-side navigation.
 *
 * Not an ecommerce event, so it skips `pushEcommerce` and its `ecommerce: null`
 * reset — that reset exists to stop item lists leaking between events, and a
 * page view carries no items.
 */
export function trackPageView(url: string, title: string): void {
  if (typeof window === "undefined") return

  const w = window as DataLayerWindow
  if (!Array.isArray(w.dataLayer)) return

  try {
    const parsed = new URL(url)
    w.dataLayer.push({
      event: "page_view",
      page_location: url,
      page_path: parsed.pathname + parsed.search,
      page_title: title,
    })
  } catch (err) {
    console.warn("[ANALYTICS_PAGEVIEW]", err)
  }
}

// ─── view_item de-duplication ───────────────────────────────────────────────
// A product page mounts more than once per navigation — measured twice on a
// production build, and more under React StrictMode in dev — and GA4 counts
// every view_item it receives. Collapsing repeats of the same product within a
// short window turns one genuine view into one event, while still letting a
// real revisit later in the session count again.
//
// Deliberately not applied to add_to_cart: adding the same item twice is a
// thing shoppers actually do, and both adds must be reported.

const REPEAT_VIEW_MS = 3000
const recentViews = new Map<string, number>()

function isRepeatView(itemId: string): boolean {
  const now = Date.now()
  const last = recentViews.get(itemId)
  recentViews.set(itemId, now)

  // Long browsing sessions would otherwise grow this map without bound.
  for (const [key, seenAt] of recentViews) {
    if (now - seenAt > REPEAT_VIEW_MS) recentViews.delete(key)
  }

  return last !== undefined && now - last < REPEAT_VIEW_MS
}

/** Product detail page viewed. */
export function trackViewItem(item: AnalyticsItem): void {
  if (isRepeatView(item.item_id)) return

  pushEcommerce("view_item", {
    currency: storeCurrency(),
    value: sum([item]),
    items: [{ quantity: 1, ...item }],
  })
}

/**
 * A product listing was shown — category, shop, /men, /women, search results.
 *
 * `item_list_id` and `item_list_name` are what let GA4 report which listing
 * produced a click, so both are required rather than optional. Items carry
 * `index` (1-based, as GA4 expects) so position within the grid is reportable.
 *
 * Deduped like view_item: a filter change re-renders the grid, and without the
 * guard every re-render would count as another impression of the same list.
 */
export function trackViewItemList(
  listId: string,
  listName: string,
  items: AnalyticsItem[]
): void {
  if (items.length === 0) return
  if (isRepeatView(`list:${listId}:${items.map((i) => i.item_id).join(",")}`)) return

  pushEcommerce("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    currency: storeCurrency(),
    items: items.map((item, i) => ({ quantity: 1, index: i + 1, ...item })),
  })
}

/** A product was clicked inside a listing — the pair to view_item_list. */
export function trackSelectItem(listId: string, listName: string, item: AnalyticsItem): void {
  pushEcommerce("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [{ quantity: 1, ...item }],
  })
}

/** Item added to the cart. */
export function trackAddToCart(item: AnalyticsItem): void {
  pushEcommerce("add_to_cart", {
    currency: storeCurrency(),
    value: sum([item]),
    items: [{ quantity: 1, ...item }],
  })
}

/**
 * Order completed.
 *
 * `value`, `currency`, `shipping` and `coupon` come from the checkout API
 * rather than the browser: the server is what applies coupons, shipping and
 * reward points, so a client-side re-calculation would drift from the amount
 * actually charged.
 */
export function trackPurchase(order: {
  transaction_id: string
  value: number
  currency: string
  items: AnalyticsItem[]
  shipping?: number
  tax?: number
  coupon?: string
}): void {
  if (!order.transaction_id) return
  if (alreadyTracked(order.transaction_id)) return

  pushEcommerce("purchase", {
    transaction_id: order.transaction_id,
    value: order.value,
    currency: order.currency,
    ...(order.shipping !== undefined ? { shipping: order.shipping } : {}),
    ...(order.tax !== undefined ? { tax: order.tax } : {}),
    ...(order.coupon ? { coupon: order.coupon } : {}),
    items: order.items,
  })

  markTracked(order.transaction_id)
}

// ─── Purchase de-duplication ────────────────────────────────────────────────
// There is no dedicated order-confirmation route — checkout swaps to a success
// panel in place — so a refresh or a back-navigation can re-run the effect that
// fires `purchase`. GA4 would count the revenue again, so every order id that
// has been reported is remembered locally.

const TRACKED_KEY = "ag_tracked_purchases"
const TRACKED_LIMIT = 50

function readTracked(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function alreadyTracked(orderId: string): boolean {
  if (typeof window === "undefined") return true
  return readTracked().includes(orderId)
}

function markTracked(orderId: string): void {
  try {
    // Keep the tail only; this list exists to stop double-counting, not to be a
    // history, and localStorage should not grow without bound.
    const next = [...readTracked(), orderId].slice(-TRACKED_LIMIT)
    localStorage.setItem(TRACKED_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — worst case the event can fire twice on a refresh.
  }
}
