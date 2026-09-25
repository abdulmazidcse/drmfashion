// ─── Landing page builder: shared section + theme model ──────────────────────
//
// Stored on LandingPage.sections (JSON array) and LandingPage.theme (JSON
// object). Used by:
//   • the admin designer   (components/admin/landing/*)
//   • the public renderer  (components/landing/*, app/landingpage/[slug])
//   • the admin API        (app/api/admin/landing-pages/[id]) for sanitising
//
// This file must stay framework-free (no React, no Prisma) so both the server
// and the client can import it.

export type SectionType =
  | "hero"
  | "headline"
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "features"
  | "countdown"
  | "pricing"
  | "cta"
  | "faq"
  | "spacer"
  | "html"
  | "order"

export type Padding = "none" | "sm" | "md" | "lg"

/** Styling every section shares. Empty colour = inherit from the theme. */
export interface SectionStyle {
  bg: string
  text: string
  padding: Padding
  /** Stretches the section's background and content edge-to-edge instead of
   *  capping it at the theme's content width. */
  fullWidth: boolean
}

export interface HeroData {
  badge: string
  heading: string
  subheading: string
  image: string
  imageAlt: string
  /** Optional YouTube / Facebook link — shown instead of the image when set. */
  videoUrl: string
  buttonText: string
  showWhatsapp: boolean
  whatsappText: string
}

export interface HeadlineData {
  text: string
  size: "md" | "lg" | "xl"
  /** Colour of the box behind the text. Empty = theme primary. */
  boxColor: string
  boxTextColor: string
}

export interface TextData {
  /** Admin-authored HTML (bold, lists, line breaks). Plain text also works. */
  html: string
  align: "left" | "center" | "right"
}

export interface ImageData {
  src: string
  alt: string
  link: string
  width: "sm" | "md" | "lg" | "full"
  rounded: boolean
}

export interface GalleryData {
  title: string
  images: string[]
  columns: 1 | 2 | 3 | 4
}

export interface VideoData {
  title: string
  url: string
}

export interface FeaturesData {
  title: string
  items: string[]
  icon: "check" | "star" | "arrow" | "none"
  columns: 1 | 2
  /** Card background behind the list. Empty = no card. */
  cardBg: string
  iconColor: string
}

export interface CountdownData {
  title: string
  subtitle: string
  /**
   * fixed     — counts down to `endAt` (same moment for every visitor)
   * evergreen — restarts per visitor for `evergreenHours` (stored in the
   *             browser), so the offer never visibly "expires"
   */
  mode: "fixed" | "evergreen"
  endAt: string
  evergreenHours: number
  boxColor: string
  boxTextColor: string
}

export interface PricingData {
  title: string
  regularLabel: string
  regularPrice: string
  offerLabel: string
  offerPrice: string
  note: string
  buttonText: string
}

export interface CtaData {
  heading: string
  text: string
  buttonText: string
  showWhatsapp: boolean
}

export interface FaqData {
  title: string
  items: { q: string; a: string }[]
}

export interface SpacerData {
  height: number
}

export interface HtmlData {
  html: string
}

export interface OrderData {
  heading: string
  subheading: string
  buttonText: string
}

export interface SectionDataMap {
  hero: HeroData
  headline: HeadlineData
  text: TextData
  image: ImageData
  gallery: GalleryData
  video: VideoData
  features: FeaturesData
  countdown: CountdownData
  pricing: PricingData
  cta: CtaData
  faq: FaqData
  spacer: SpacerData
  html: HtmlData
  order: OrderData
}

export type Section<T extends SectionType = SectionType> = {
  [K in T]: {
    id: string
    type: K
    hidden?: boolean
    style: SectionStyle
    data: SectionDataMap[K]
  }
}[T]

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface LandingTheme {
  /** Headline boxes, countdown boxes, icons. */
  primary: string
  primaryText: string
  /** "Order now" buttons. */
  accent: string
  accentText: string
  pageBg: string
  text: string
  font: "default" | "bangla"
  width: "narrow" | "medium" | "wide"
  radius: "none" | "md" | "lg"
  showHeader: boolean
  showFooter: boolean
  /** WhatsApp number with country code, e.g. 8801XXXXXXXXX. Empty hides WhatsApp buttons. */
  whatsapp: string
  /** Floating "order now" bar on mobile. */
  stickyButton: boolean
  stickyButtonText: string
  /** Language of the built-in order-form labels. */
  language: "bn" | "en"
}

export const DEFAULT_THEME: LandingTheme = {
  primary: "#be123c",
  primaryText: "#ffffff",
  accent: "#16a34a",
  accentText: "#ffffff",
  pageBg: "#ffffff",
  text: "#18181b",
  font: "bangla",
  width: "medium",
  radius: "md",
  showHeader: false,
  showFooter: false,
  whatsapp: "",
  stickyButton: true,
  stickyButtonText: "এখনই অর্ডার করুন",
  language: "bn",
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_STYLE: SectionStyle = { bg: "", text: "", padding: "md", fullWidth: false }

export const DEFAULT_DATA: SectionDataMap = {
  hero: {
    badge: "",
    heading: "আপনার ভাবনার থেকেও সুন্দর",
    subheading: "প্রিমিয়াম কোয়ালিটির প্রোডাক্ট, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।",
    image: "",
    imageAlt: "",
    videoUrl: "",
    buttonText: "অর্ডার করতে চাই",
    showWhatsapp: true,
    whatsappText: "WhatsApp এ যোগাযোগ",
  },
  headline: { text: "বাস্তবে ছবির চেয়েও সুন্দর", size: "lg", boxColor: "", boxTextColor: "" },
  text: {
    html: "<p>এখানে আপনার প্রোডাক্ট সম্পর্কে লিখুন। <strong>বোল্ড</strong> লেখা, লিস্ট, লাইন ব্রেক সবই ব্যবহার করা যাবে।</p>",
    align: "center",
  },
  image: { src: "", alt: "", link: "", width: "lg", rounded: true },
  gallery: { title: "আমাদের কাস্টমার রিভিউ", images: [], columns: 2 },
  video: { title: "ভিডিওতে দেখুন", url: "" },
  features: {
    title: "প্রোডাক্টের বৈশিষ্ট্য",
    items: ["১০০% প্রিমিয়াম কোয়ালিটি", "আরামদায়ক ও টেকসই", "সব বয়সের জন্য উপযোগী", "গিফট প্যাকেজিং"],
    icon: "check",
    columns: 1,
    cardBg: "#f8fafc",
    iconColor: "",
  },
  countdown: {
    title: "সীমিত সময়ের অফার! অফার শেষ হতে বাকি",
    subtitle: "এখনই অর্ডার করলে পাচ্ছেন বিশেষ ছাড়",
    mode: "evergreen",
    endAt: "",
    evergreenHours: 24,
    boxColor: "",
    boxTextColor: "",
  },
  pricing: {
    title: "অফার প্রাইস",
    regularLabel: "রেগুলার প্রাইস",
    regularPrice: "৳ ১৫০০",
    offerLabel: "অফার প্রাইস",
    offerPrice: "৳ ৯৯০",
    note: "স্টক সীমিত — আজই অর্ডার করুন",
    buttonText: "অর্ডার করতে চাই",
  },
  cta: {
    heading: "২টি কিনলেই ডেলিভারি চার্জ ফ্রি!",
    text: "",
    buttonText: "এখনই অর্ডার করুন",
    showWhatsapp: false,
  },
  faq: {
    title: "সাধারণ জিজ্ঞাসা",
    items: [
      { q: "ডেলিভারি কত দিনে পাব?", a: "ঢাকার ভিতরে ১-২ দিন, ঢাকার বাইরে ২-৩ দিনে।" },
      { q: "ক্যাশ অন ডেলিভারি আছে?", a: "হ্যাঁ, প্রোডাক্ট হাতে পেয়ে টাকা পরিশোধ করতে পারবেন।" },
    ],
  },
  spacer: { height: 40 },
  html: { html: "" },
  order: {
    heading: "অর্ডার করতে নিচের ফর্মটি পূরণ করুন",
    subheading: "",
    buttonText: "অর্ডার কনফার্ম করুন",
  },
}

// ─── Palette metadata (admin "Add section" menu) ─────────────────────────────

export interface SectionMeta {
  type: SectionType
  label: string
  description: string
  icon: string
}

export const SECTION_META: SectionMeta[] = [
  { type: "hero", label: "Hero", description: "Headline, image/video, order + WhatsApp buttons", icon: "🖼️" },
  { type: "headline", label: "Headline Box", description: "Big coloured title strip", icon: "🔠" },
  { type: "text", label: "Text", description: "Paragraphs, bold, lists", icon: "📝" },
  { type: "image", label: "Image", description: "Single product / banner image", icon: "🌄" },
  { type: "gallery", label: "Image Gallery", description: "Review screenshots, product photos", icon: "🧩" },
  { type: "video", label: "Video", description: "YouTube or Facebook video", icon: "🎬" },
  { type: "features", label: "Feature List", description: "Checklist of benefits / specs", icon: "✅" },
  { type: "countdown", label: "Countdown Timer", description: "Offer ends in … days / hours", icon: "⏳" },
  { type: "pricing", label: "Price Box", description: "Regular vs offer price", icon: "💰" },
  { type: "cta", label: "Call to Action", description: "Banner with an order button", icon: "🎯" },
  { type: "faq", label: "FAQ", description: "Questions & answers", icon: "❓" },
  { type: "spacer", label: "Spacer", description: "Empty vertical space", icon: "↕️" },
  { type: "html", label: "Custom HTML", description: "Embed code / raw HTML", icon: "💻" },
  { type: "order", label: "Order Form", description: "Products + checkout (only one per page)", icon: "🛒" },
]

export function sectionMeta(type: SectionType): SectionMeta {
  return SECTION_META.find((m) => m.type === type) ?? SECTION_META[0]
}

// ─── Factories ───────────────────────────────────────────────────────────────

function newId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

export function createSection<T extends SectionType>(type: T, overrides?: Partial<SectionDataMap[T]>, style?: Partial<SectionStyle>): Section<T> {
  return {
    id: newId(),
    type,
    style: { ...DEFAULT_STYLE, ...(style || {}) },
    data: { ...clone(DEFAULT_DATA[type]), ...(overrides || {}) },
  } as Section<T>
}

export function duplicateSection(s: Section): Section {
  return { ...clone(s), id: newId() }
}

// ─── Parsing / sanitising (used on read AND on save) ─────────────────────────

const TYPES = new Set<string>(SECTION_META.map((m) => m.type))
const PADDINGS = new Set<string>(["none", "sm", "md", "lg"])

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/**
 * Coerce one stored value onto the shape of its default: unknown keys are
 * dropped, missing keys fall back to the default, and each value must match the
 * default's JS type (string / number / boolean / array). Keeps old saved pages
 * rendering after new fields are added.
 */
function coerceLike<T>(def: T, raw: unknown): T {
  if (!isObj(raw)) return clone(def)
  const out: Record<string, unknown> = {}
  for (const [key, defVal] of Object.entries(def as Record<string, unknown>)) {
    const v = raw[key]
    if (Array.isArray(defVal)) {
      out[key] = Array.isArray(v) ? v : clone(defVal)
    } else if (typeof defVal === "number") {
      out[key] = typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : defVal
    } else if (typeof defVal === "boolean") {
      out[key] = typeof v === "boolean" ? v : defVal
    } else if (typeof defVal === "string") {
      out[key] = typeof v === "string" ? v : defVal
    } else {
      out[key] = v === undefined ? clone(defVal) : v
    }
  }
  return out as T
}

function cleanStringList(v: unknown, max = 60): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string").slice(0, max)
}

export function parseSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return []
  const out: Section[] = []
  const seen = new Set<string>()
  let hasOrder = false

  for (const item of raw.slice(0, 80)) {
    if (!isObj(item) || typeof item.type !== "string" || !TYPES.has(item.type)) continue
    const type = item.type as SectionType
    // Only one order form per page — it owns the #order anchor.
    if (type === "order") {
      if (hasOrder) continue
      hasOrder = true
    }

    let id = typeof item.id === "string" && item.id ? item.id : newId()
    if (seen.has(id)) id = newId()
    seen.add(id)

    const styleRaw = isObj(item.style) ? item.style : {}
    const style: SectionStyle = {
      bg: typeof styleRaw.bg === "string" ? styleRaw.bg : "",
      text: typeof styleRaw.text === "string" ? styleRaw.text : "",
      padding: typeof styleRaw.padding === "string" && PADDINGS.has(styleRaw.padding) ? (styleRaw.padding as Padding) : "md",
      fullWidth: styleRaw.fullWidth === true,
    }

    const data = coerceLike(DEFAULT_DATA[type], item.data) as unknown as Record<string, unknown>

    // Nested lists get an extra pass so a malformed entry can't crash a render.
    if (type === "features") data.items = cleanStringList(data.items)
    if (type === "gallery") data.images = cleanStringList(data.images)
    if (type === "faq") {
      data.items = (Array.isArray(data.items) ? data.items : [])
        .filter(isObj)
        .slice(0, 40)
        .map((f) => ({ q: typeof f.q === "string" ? f.q : "", a: typeof f.a === "string" ? f.a : "" }))
    }
    if (type === "gallery" && ![1, 2, 3, 4].includes(data.columns as number)) data.columns = 2
    if (type === "features" && ![1, 2].includes(data.columns as number)) data.columns = 1
    if (type === "spacer") data.height = Math.max(0, Math.min(400, Number(data.height) || 0))

    out.push({ id, type, hidden: item.hidden === true, style, data } as unknown as Section)
  }
  return out
}

export function parseTheme(raw: unknown): LandingTheme {
  const t = coerceLike(DEFAULT_THEME, raw)
  if (!["default", "bangla"].includes(t.font)) t.font = DEFAULT_THEME.font
  if (!["narrow", "medium", "wide"].includes(t.width)) t.width = DEFAULT_THEME.width
  if (!["none", "md", "lg"].includes(t.radius)) t.radius = DEFAULT_THEME.radius
  if (!["bn", "en"].includes(t.language)) t.language = DEFAULT_THEME.language
  return t
}

/** Rough upper bound on what we'll store, so a runaway paste can't bloat a row. */
export const MAX_SECTIONS_BYTES = 400_000

// ─── Legacy + template ──────────────────────────────────────────────────────

/**
 * What a page saved before the builder existed renders as: its banner and
 * heading on top, then the order form. English labels / monochrome theme so it
 * stays close to the old look.
 */
export function legacySections(page: { heading: string; subheading: string; bannerImage: string }): Section[] {
  const list: Section[] = []
  if (page.bannerImage) {
    list.push(createSection("image", { src: page.bannerImage, alt: page.heading, width: "full", rounded: false }, { padding: "none" }))
  }
  list.push(createSection("text", { html: `<h1>${escapeHtml(page.heading)}</h1>${page.subheading ? `<p>${escapeHtml(page.subheading)}</p>` : ""}`, align: "left" }))
  list.push(createSection("order", { heading: "", subheading: "", buttonText: "Place Order" }))
  return list
}

export const LEGACY_THEME: LandingTheme = {
  ...DEFAULT_THEME,
  primary: "#09090b",
  accent: "#09090b",
  font: "default",
  width: "wide",
  radius: "none",
  showHeader: true,
  showFooter: true,
  stickyButton: false,
  stickyButtonText: "Order Now",
  language: "en",
}

/**
 * Starter layout modelled on a typical Bangladeshi single-product landing page
 * (hero → headline → video → features → countdown → price → reviews → order).
 * The admin can then edit / delete / reorder anything.
 */
export function starterTemplate(opts?: { heading?: string; image?: string }): Section[] {
  return [
    createSection("hero", { heading: opts?.heading || DEFAULT_DATA.hero.heading, image: opts?.image || "" }, { bg: "#fff1f2" }),
    createSection("countdown", {}, { padding: "sm" }),
    createSection("headline", { text: "বাস্তবে ছবির চেয়েও সুন্দর" }),
    createSection("image", {}),
    createSection("video", {}),
    createSection("features", {}),
    createSection("features", {
      title: "ডেলিভারি তথ্য",
      items: [
        "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি",
        "৪৮-৭২ ঘণ্টার মধ্যে হোম ডেলিভারি",
        "ঢাকার ভিতরে ডেলিভারি চার্জ ৬০ টাকা",
        "ঢাকার বাইরে ডেলিভারি চার্জ ১০০ টাকা",
      ],
      icon: "arrow",
      cardBg: "#fefce8",
    }),
    createSection("cta", {}, { bg: "#be123c", text: "#ffffff" }),
    createSection("gallery", {}),
    createSection("pricing", {}),
    createSection("order", {}, { bg: "#f8fafc" }),
  ]
}

// ─── Helpers used by renderers ──────────────────────────────────────────────

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Turn a YouTube / Facebook share link into an embeddable iframe URL. */
export function toEmbedUrl(url: string): string {
  const u = (url || "").trim()
  if (!u) return ""
  const yt =
    u.match(/youtu\.be\/([\w-]{6,})/) ||
    u.match(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  if (/facebook\.com|fb\.watch/.test(u)) {
    if (u.includes("/plugins/video.php")) return u
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`
  }
  // Already an embed URL (Vimeo player etc.) — use as is if it's https.
  return /^https:\/\//.test(u) ? u : ""
}

export function whatsappLink(number: string, text?: string) {
  const digits = (number || "").replace(/[^\d]/g, "")
  if (!digits) return ""
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
