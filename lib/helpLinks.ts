// Links shown under the "HELP" menu in the header (and the Help section of the
// mobile drawer). Each `/pages/*` target is a CMS page editable from
// Admin → Pages, so copy changes never need a deploy.
export interface HelpLink {
  label: string
  href: string
}

export const HELP_LINKS: HelpLink[] = [
  { label: "Help Center", href: "/pages/help-center" },
  { label: "Contact Us", href: "/pages/contact-support" },
  { label: "Track My Order", href: "/track-order" },
  { label: "Returns & Exchanges", href: "/pages/returns-exchanges" },
  { label: "Shipping", href: "/pages/shipping-policy" },
  { label: "Feedback", href: "/pages/feedback" },
]
