/**
 * Where a staff-entered order came from (Admin → Orders → Create Order).
 * Stored on `Order.source`; null means the customer ordered on the website.
 */
export const ORDER_SOURCES = [
  { value: "facebook", label: "Facebook" },
  { value: "messenger", label: "Messenger" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Phone call" },
  { value: "walk-in", label: "Walk-in" },
  { value: "other", label: "Other" },
] as const

export type OrderSource = (typeof ORDER_SOURCES)[number]["value"]

export function isOrderSource(v: unknown): v is OrderSource {
  return ORDER_SOURCES.some((s) => s.value === v)
}

export function orderSourceLabel(source: string | null | undefined): string {
  if (!source) return "Website"
  return ORDER_SOURCES.find((s) => s.value === source)?.label ?? source
}
