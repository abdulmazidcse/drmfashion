/**
 * The Contact page (/pages/contact-support) and the footer's office address,
 * editable from Admin → Settings → Brand → Contact Page.
 *
 * The page used to be fixed copy in the route file — only the email came from
 * settings — so nothing on it could be changed without a deploy. Everything a
 * store would want to reword now lives in one JSON setting. The defaults are
 * exactly what the page and footer showed before, so an unsaved store looks
 * the same as it always did.
 */

export const CONTACT_PAGE_SETTING_KEY = "contact_page"

export interface ContactFaq {
  q: string
  a: string
}

export interface ContactPageConfig {
  heroTitle: string
  /** `{store}` is replaced with the store name. */
  heroText: string
  replyTime: string
  phone: string
  address: string
  /** Google Maps share link for the address (footer + contact page). */
  mapUrl: string
  hours: string
  faqs: ContactFaq[]
}

export const MAX_CONTACT_FAQS = 12

export const DEFAULT_CONTACT_PAGE: ContactPageConfig = {
  heroTitle: "How can we help?",
  heroText:
    "Questions about an order, sizing or a return — the {store} support team reads every message and replies personally.",
  replyTime: "Within 1 business day",
  phone: "",
  address: "House #55, 3rd Floor, Eastern Mollika Lane, New Elephant Road, Dhaka-1205",
  mapUrl: "https://maps.app.goo.gl/SFniRK51kLArf1Sh9",
  hours: "Sun – Thu, 10:00 AM – 6:00 PM",
  faqs: [
    {
      q: "How long does it take to get a reply?",
      a: "Most messages are answered within one business day. Enquiries sent over a weekend or public holiday are picked up the next working day.",
    },
    {
      q: "I need to change or cancel an order — what now?",
      a: "Message us with your order number as soon as possible. While the order is still marked Pending we can usually change the size, update the address or cancel it outright.",
    },
    {
      q: "Can you help me pick a size?",
      a: "Yes. Send your height, your usual size, and the measurements of a garment that already fits you well — we'll recommend the closest fit from our tall sizing.",
    },
    {
      q: "My parcel hasn't arrived. What should I include?",
      a: "Your order number and the delivery address on the order. Check the tracking status first, then message us and we'll open a case with the courier.",
    },
  ],
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback
}

/** Only http(s) links are accepted; anything else falls back to the default. */
function link(raw: unknown, fallback: string): string {
  return typeof raw === "string" && /^https?:\/\//i.test(raw.trim()) ? raw.trim() : raw === "" ? "" : fallback
}

/**
 * `keepEmpty` is for the admin editor, which needs a blank FAQ row it just
 * added to survive; the storefront drops rows with no question.
 *
 * `legacy` carries the old flat `contact_phone` / `contact_address` /
 * `contact_hours` settings, used when this config has never been saved.
 */
export function parseContactPage(
  raw: string | null | undefined,
  options: { keepEmpty?: boolean; legacy?: Record<string, string> } = {}
): ContactPageConfig {
  const legacy = options.legacy ?? {}
  const base: ContactPageConfig = {
    ...DEFAULT_CONTACT_PAGE,
    phone: legacy.contact_phone || DEFAULT_CONTACT_PAGE.phone,
    address: legacy.contact_address || DEFAULT_CONTACT_PAGE.address,
    hours: legacy.contact_hours || DEFAULT_CONTACT_PAGE.hours,
  }
  if (!raw) return base

  let parsed: Record<string, unknown>
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== "object") return base
    parsed = value as Record<string, unknown>
  } catch {
    return base
  }

  const faqs = Array.isArray(parsed.faqs)
    ? parsed.faqs
        .map((f) => {
          const o = f && typeof f === "object" ? (f as Record<string, unknown>) : {}
          return { q: str(o.q, "").slice(0, 300), a: str(o.a, "").slice(0, 2000) }
        })
        .filter((f) => options.keepEmpty || f.q.trim())
        .slice(0, MAX_CONTACT_FAQS)
    : base.faqs

  return {
    heroTitle: str(parsed.heroTitle, base.heroTitle),
    heroText: str(parsed.heroText, base.heroText),
    replyTime: str(parsed.replyTime, base.replyTime),
    phone: str(parsed.phone, base.phone),
    address: str(parsed.address, base.address),
    mapUrl: link(parsed.mapUrl, base.mapUrl),
    hours: str(parsed.hours, base.hours),
    faqs,
  }
}
