"use client"

import { createContext, useContext, useEffect, useState } from "react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import {
  DEFAULT_HEIGHTS_GUIDE,
  HEIGHTS_GUIDE_SETTING_KEY,
  parseHeightsGuide,
  type HeightsGuide,
  type HeightsGuideModel,
} from "@/lib/heightsGuide"
import {
  DEFAULT_HOME_REELS,
  EMPTY_HOME_REEL,
  HOME_REELS_SETTING_KEY,
  MAX_HOME_REELS,
  parseHomeReels,
  type HomeReel,
  type HomeReelsConfig,
} from "@/lib/homeReels"
import {
  DEFAULT_HOME_ICONS,
  EMPTY_HOME_ICON_TILE,
  HOME_ICONS_SETTING_KEY,
  MAX_HOME_ICONS,
  parseHomeIcons,
  type HomeIconsConfig,
  type HomeIconTile,
} from "@/lib/homeIcons"
import {
  DEFAULT_ANNOUNCEMENT_BAR,
  EMPTY_ANNOUNCEMENT_SLIDE,
  ANNOUNCEMENT_BAR_SETTING_KEY,
  MAX_ANNOUNCEMENT_SLIDES,
  parseAnnouncementBar,
  type AnnouncementBarConfig,
  type AnnouncementSlide,
} from "@/lib/announcementBar"
import {
  DEFAULT_HOME_SECTIONS,
  HOME_SECTIONS_SETTING_KEY,
  parseHomeSections,
  type HomeSectionKey,
  type HomeSectionState,
} from "@/lib/homeSections"
import {
  EMPTY_HOME_VIDEO_BANNER,
  HOME_VIDEO_BANNERS_SETTING_KEY,
  MAX_HOME_VIDEO_BANNERS,
  parseHomeVideoBanners,
  type HomeVideoBanner,
} from "@/lib/homeVideoBanners"
import {
  DEFAULT_HOME_SHOWCASE,
  EMPTY_HOME_SHOWCASE_ROW,
  HOME_SHOWCASE_SETTING_KEY,
  MAX_HOME_SHOWCASE_PRODUCTS,
  MAX_HOME_SHOWCASE_ROWS,
  parseHomeShowcase,
  type HomeShowcaseConfig,
  type HomeShowcaseRow,
} from "@/lib/homeShowcase"

// Seasonal homepage tile sections — rendered by components/home/StyleSection.tsx
// from the `home_style_sections` Setting. Tiles are categories, so the image,
// name and link all come from the Category row rather than being typed in here.
export type StyleSectionKey = "summer"

export interface StyleSectionConfig {
  active: boolean
  title: string
  highlight: string
  men: string[]
  women: string[]
}

const DEFAULT_STYLE_SECTIONS: Record<StyleSectionKey, StyleSectionConfig> = {
  summer: { active: true, title: "Summer Styles", highlight: "Styles", men: [], women: [] },
}

// The stored JSON is hand-editable in the DB, so every field is checked rather
// than spread blindly — a bad `men` value would otherwise crash the picker.
function mergeStyleSection(base: StyleSectionConfig, raw: any): StyleSectionConfig {
  return {
    active: typeof raw?.active === "boolean" ? raw.active : base.active,
    title: typeof raw?.title === "string" ? raw.title : base.title,
    highlight: typeof raw?.highlight === "string" ? raw.highlight : base.highlight,
    men: Array.isArray(raw?.men) ? raw.men.filter((id: any) => typeof id === "string") : base.men,
    women: Array.isArray(raw?.women) ? raw.women.filter((id: any) => typeof id === "string") : base.women,
  }
}

// /api/admin/categories returns a nested tree; the picker wants one flat list
// with the depth kept for indentation.
function flattenCategories(nodes: any[], depth = 0): any[] {
  if (!Array.isArray(nodes)) return []
  return nodes.flatMap(node => {
    if (!node || node.deletedAt) return []
    return [
      { id: node.id, name: node.name, slug: node.slug, image: node.image, depth },
      ...flattenCategories(node.children || [], depth + 1),
    ]
  })
}

// Every field lives here so the tab panels can stay presentational and be code
// split — without this they would need ~200 props drilled through the page.
function useSettingsFormState() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<"brand" | "payments" | "rewards" | "flashsale" | "promopopup" | "homepage" | "seo">("brand")


  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  
  // Settings values
  const [rewardPointValue, setRewardPointValue] = useState("1")
  const [rewardPointEarnRate, setRewardPointEarnRate] = useState("10")

  // Currencies state
  const [currencies, setCurrencies] = useState([
    { code: "USD", symbol: "$", rate: 1 }
  ])

  // Brand state
  const [brandStoreName, setBrandStoreName] = useState("My Store")
  const [brandLogoUrl, setBrandLogoUrl] = useState("")
  const [brandFaviconUrl, setBrandFaviconUrl] = useState("")
  const [brandSlogan, setBrandSlogan] = useState("Tall Men 6' - 7'1\" | Tall Women 5'9\" - 6'6\"")
  const [contactEmail, setContactEmail] = useState("support@store.local")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [whatsappMessage, setWhatsappMessage] = useState("Hi! I have a question about my order.")
  const [tawkPropertyId, setTawkPropertyId] = useState("")
  const [tawkWidgetId, setTawkWidgetId] = useState("default")

  // Social Links state
  const [socialFacebook, setSocialFacebook] = useState("")
  const [socialInstagram, setSocialInstagram] = useState("")
  const [socialYoutube, setSocialYoutube] = useState("")
  const [socialTiktok, setSocialTiktok] = useState("")
  const [socialPinterest, setSocialPinterest] = useState("")

  // Payment state
  const [paymentCodEnabled, setPaymentCodEnabled] = useState("true")
  const [paymentCodCountry, setPaymentCodCountry] = useState("")
  const [paymentStripeEnabled, setPaymentStripeEnabled] = useState("true")
  const [paymentBkashEnabled, setPaymentBkashEnabled] = useState("true")
  const [paymentNagadEnabled, setPaymentNagadEnabled] = useState("true")
  const [paymentSquareEnabled, setPaymentSquareEnabled] = useState("true")

  // Flash Sale state
  const [flashSaleEnabled, setFlashSaleEnabled] = useState("true")
  const [flashSaleTitle, setFlashSaleTitle] = useState("Limited Time Offers")
  const [flashSaleDescription, setFlashSaleDescription] = useState("Grab our premium collections at exclusive discounted prices before the timer runs out.")
  const [flashSaleEndDate, setFlashSaleEndDate] = useState("")
  const [flashSaleProducts, setFlashSaleProducts] = useState<string[]>([])

  const [allProducts, setAllProducts] = useState<any[]>([])
  const [productsLoaded, setProductsLoaded] = useState(false)

  // Promo Popup (right-side drawer on the storefront — components/PromoDrawer.tsx)
  const [promoPopupEnabled, setPromoPopupEnabled] = useState("true")
  const [promoPopupHeading, setPromoPopupHeading] = useState("You just got")
  const [promoPopupHighlight, setPromoPopupHighlight] = useState("15% off")
  const [promoPopupSubheading, setPromoPopupSubheading] = useState("your next order")
  const [promoPopupConsentText, setPromoPopupConsentText] = useState("By submitting this form, you agree to receive recurring automated promotional and personalized email marketing messages (e.g. cart reminders) at the submitted email address. Consent is not a condition of any purchase. You can withdraw your consent at any time by following the unsubscribe instructions in any email we send you. Message frequency varies.")
  const [promoPopupButtonText, setPromoPopupButtonText] = useState("Reveal Promo Code")
  const [promoPopupCode, setPromoPopupCode] = useState("WELCOME15")
  const [promoPopupSuccessHeading, setPromoPopupSuccessHeading] = useState("Here is your code")
  const [promoPopupSuccessText, setPromoPopupSuccessText] = useState("Apply it at checkout to claim your discount.")
  const [promoPopupTabLabel, setPromoPopupTabLabel] = useState("Get 15% Off")
  const [promoPopupImageUrl, setPromoPopupImageUrl] = useState("")
  const [promoPopupShowShopFor, setPromoPopupShowShopFor] = useState("true")
  const [promoPopupShopForOptions, setPromoPopupShopForOptions] = useState("Women,Men,Both")
  const [promoPopupTermsUrl, setPromoPopupTermsUrl] = useState("")
  const [promoPopupPrivacyUrl, setPromoPopupPrivacyUrl] = useState("")
  const [promoPopupDelaySeconds, setPromoPopupDelaySeconds] = useState("5")
  const [promoPopupFrequencyDays, setPromoPopupFrequencyDays] = useState("7")
  const [uploadingPromoPopupImage, setUploadingPromoPopupImage] = useState(false)

  // SEO & Analytics state
  const [seoMetaTitle, setSeoMetaTitle] = useState("")
  const [seoMetaDescription, setSeoMetaDescription] = useState("")
  const [googleSiteVerification, setGoogleSiteVerification] = useState("")
  const [facebookDomainVerification, setfacebookDomainVerification] = useState("")
  const [gtmId, setGtmId] = useState("")
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("")
  const [facebookPixelId, setfacebookPixelId] = useState("")
  const [customHeadScripts, setCustomHeadScripts] = useState("")

  // Homepage Hero Slider Settings
  const [activeEditTab, setActiveEditTab] = useState<"men" | "women">("men")
  const [slideRotationInterval, setSlideRotationInterval] = useState("7000")

  const [slideMenActive, setSlideMenActive] = useState(true)
  const [slideMenTitle, setSlideMenTitle] = useState("FINALLY, CLOTHES THAT FIT.")
  const [slideMenSubtitle, setSlideMenSubtitle] = useState("Designed specifically for men up to 7'1\". Proportions perfected for vertical precision.")
  /** Alt text for the poster image; empty falls back to the slide title. */
  const [slideMenImageAlt, setSlideMenImageAlt] = useState("")
  const [slideMenImage, setSlideMenImage] = useState("/images/men_hero.png")
  const [slideMenVideo, setSlideMenVideo] = useState("/videos/men.mp4")
  const [slideMenVideoFallback, setSlideMenVideoFallback] = useState("/videos/fashion.mp4")
  const [slideMenButtonText, setSlideMenButtonText] = useState("Shop Men")
  const [slideMenShopLink, setSlideMenShopLink] = useState("/shop")
  const [slideMenTopBarTag, setSlideMenTopBarTag] = useState("Made for Tall")

  const [slideWomenActive, setSlideWomenActive] = useState(true)
  const [slideWomenTitle, setSlideWomenTitle] = useState("ELEGANCE IN EVERY INCH.")
  const [slideWomenSubtitle, setSlideWomenSubtitle] = useState("Tailored specifically for tall women up to 6'6\". Modern style with perfect length.")
  /** Alt text for the poster image; empty falls back to the slide title. */
  const [slideWomenImageAlt, setSlideWomenImageAlt] = useState("")
  const [slideWomenImage, setSlideWomenImage] = useState("/images/olaszkolda-fashion-10318918.jpg")
  const [slideWomenVideo, setSlideWomenVideo] = useState("/videos/women.mp4")
  const [slideWomenVideoFallback, setSlideWomenVideoFallback] = useState("/videos/main-side-video.mp4")
  const [slideWomenButtonText, setSlideWomenButtonText] = useState("Shop Women")
  const [slideWomenShopLink, setSlideWomenShopLink] = useState("/shop")
  const [slideWomenTopBarTag, setSlideWomenTopBarTag] = useState("Made for Tall")

  // Free-text block rendered just above the storefront footer
  const [homeDescription, setHomeDescription] = useState("")

  // "Our Heights & Fit" panel of the product size-chart modal — brand-level, so
  // the same content shows on every product. See lib/heightsGuide.ts.
  const [heightsGuide, setHeightsGuide] = useState<HeightsGuide>(DEFAULT_HEIGHTS_GUIDE)

  function updateHeightsGuide(patch: Partial<HeightsGuide>) {
    setHeightsGuide(prev => ({ ...prev, ...patch }))
  }

  function updateHeightsCell(rowIndex: number, colIndex: number, value: string) {
    setHeightsGuide(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) =>
        i === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row
      ),
    }))
  }

  function addHeightsRow() {
    setHeightsGuide(prev => ({
      ...prev,
      rows: [...prev.rows, Array.from({ length: prev.columns.length }, () => "")],
    }))
  }

  function removeHeightsRow(index: number) {
    setHeightsGuide(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))
  }

  function updateHeightsColumn(index: number, value: string) {
    setHeightsGuide(prev => ({
      ...prev,
      columns: prev.columns.map((column, i) => (i === index ? value : column)),
    }))
  }

  // Columns and rows are widened together — a row shorter than the header count
  // would render a ragged table, and parseHeightsGuide squares it off anyway.
  function addHeightsColumn() {
    setHeightsGuide(prev => ({
      ...prev,
      columns: [...prev.columns, ""],
      rows: prev.rows.map(row => [...row, ""]),
    }))
  }

  function removeHeightsColumn(index: number) {
    setHeightsGuide(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
      rows: prev.rows.map(row => row.filter((_, i) => i !== index)),
    }))
  }

  function updateHeightsModel(index: number, patch: Partial<HeightsGuideModel>) {
    setHeightsGuide(prev => ({
      ...prev,
      models: prev.models.map((model, i) => (i === index ? { ...model, ...patch } : model)),
    }))
  }

  function addHeightsModel() {
    setHeightsGuide(prev => ({ ...prev, models: [...prev.models, { label: "", range: "", image: "" }] }))
  }

  function removeHeightsModel(index: number) {
    setHeightsGuide(prev => ({ ...prev, models: prev.models.filter((_, i) => i !== index) }))
  }

  // Homepage seasonal style section (Summer)
  const [styleSections, setStyleSections] = useState<Record<StyleSectionKey, StyleSectionConfig>>(DEFAULT_STYLE_SECTIONS)
  const [styleEditTab, setStyleEditTab] = useState<Record<StyleSectionKey, "men" | "women">>({ summer: "men" })
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)

  function updateStyleSection(key: StyleSectionKey, patch: Partial<StyleSectionConfig>) {
    setStyleSections(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function toggleStyleCategory(key: StyleSectionKey, gender: "men" | "women", categoryId: string) {
    setStyleSections(prev => {
      const selected = prev[key][gender]
      return {
        ...prev,
        [key]: {
          ...prev[key],
          [gender]: selected.includes(categoryId)
            ? selected.filter(id => id !== categoryId)
            : [...selected, categoryId],
        },
      }
    })
  }

  // Featured icons grid
  const [homeIcons, setHomeIcons] = useState<HomeIconsConfig>(DEFAULT_HOME_ICONS)

  function updateHomeIcons(patch: Partial<HomeIconsConfig>) {
    setHomeIcons(prev => ({ ...prev, ...patch }))
  }

  function updateHomeIconTile(
    gender: "men" | "women",
    index: number,
    patch: Partial<HomeIconTile>
  ) {
    setHomeIcons(prev => ({
      ...prev,
      [gender]: prev[gender].map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  function addHomeIconTile(gender: "men" | "women") {
    setHomeIcons(prev =>
      prev[gender].length >= MAX_HOME_ICONS
        ? prev
        : { ...prev, [gender]: [...prev[gender], { ...EMPTY_HOME_ICON_TILE }] }
    )
  }

  function removeHomeIconTile(gender: "men" | "women", index: number) {
    setHomeIcons(prev => ({
      ...prev,
      [gender]: prev[gender].filter((_, i) => i !== index),
    }))
  }

  function moveHomeIconTile(gender: "men" | "women", index: number, direction: -1 | 1) {
    setHomeIcons(prev => {
      const target = index + direction
      if (target < 0 || target >= prev[gender].length) return prev
      const tiles = [...prev[gender]]
      ;[tiles[index], tiles[target]] = [tiles[target], tiles[index]]
      return { ...prev, [gender]: tiles }
    })
  }

  // Site-wide announcement strip
  const [announcementBar, setAnnouncementBar] =
    useState<AnnouncementBarConfig>(DEFAULT_ANNOUNCEMENT_BAR)

  function updateAnnouncementBar(patch: Partial<AnnouncementBarConfig>) {
    setAnnouncementBar(prev => ({ ...prev, ...patch }))
  }

  function updateAnnouncementSlide(index: number, patch: Partial<AnnouncementSlide>) {
    setAnnouncementBar(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function addAnnouncementSlide() {
    setAnnouncementBar(prev =>
      prev.slides.length >= MAX_ANNOUNCEMENT_SLIDES
        ? prev
        : { ...prev, slides: [...prev.slides, { ...EMPTY_ANNOUNCEMENT_SLIDE }] }
    )
  }

  function removeAnnouncementSlide(index: number) {
    setAnnouncementBar(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }))
  }

  function moveAnnouncementSlide(index: number, direction: -1 | 1) {
    setAnnouncementBar(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.slides.length) return prev
      const slides = [...prev.slides]
      ;[slides[index], slides[target]] = [slides[target], slides[index]]
      return { ...prev, slides }
    })
  }

  // Homepage block order and visibility
  const [homeSections, setHomeSections] = useState<HomeSectionState[]>(DEFAULT_HOME_SECTIONS)

  function moveHomeSection(index: number, direction: -1 | 1) {
    setHomeSections(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function toggleHomeSection(key: HomeSectionKey) {
    setHomeSections(prev =>
      prev.map(s => (s.key === key ? { ...s, active: !s.active } : s))
    )
  }

  function resetHomeSections() {
    setHomeSections(DEFAULT_HOME_SECTIONS)
  }

  // Full-bleed homepage video banners
  const [videoBanners, setVideoBanners] = useState<HomeVideoBanner[]>([])

  function updateVideoBanner(index: number, patch: Partial<HomeVideoBanner>) {
    setVideoBanners(prev => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  function addVideoBanner() {
    setVideoBanners(prev =>
      prev.length >= MAX_HOME_VIDEO_BANNERS ? prev : [...prev, { ...EMPTY_HOME_VIDEO_BANNER }]
    )
  }

  function removeVideoBanner(index: number) {
    setVideoBanners(prev => prev.filter((_, i) => i !== index))
  }

  /** Only affects two banners sharing one slot — otherwise `position` decides. */
  function moveVideoBanner(index: number, direction: -1 | 1) {
    setVideoBanners(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // Homepage reels strip
  const [homeReels, setHomeReels] = useState<HomeReelsConfig>(DEFAULT_HOME_REELS)

  function updateHomeReelsSection(patch: Partial<HomeReelsConfig>) {
    setHomeReels(prev => ({ ...prev, ...patch }))
  }

  function updateHomeReel(index: number, patch: Partial<HomeReel>) {
    setHomeReels(prev => ({
      ...prev,
      reels: prev.reels.map((reel, i) => (i === index ? { ...reel, ...patch } : reel)),
    }))
  }

  function addHomeReel() {
    setHomeReels(prev =>
      prev.reels.length >= MAX_HOME_REELS
        ? prev
        : { ...prev, reels: [...prev.reels, { ...EMPTY_HOME_REEL }] }
    )
  }

  function removeHomeReel(index: number) {
    setHomeReels(prev => ({ ...prev, reels: prev.reels.filter((_, i) => i !== index) }))
  }

  /** Reordering by drag would need a library; ± buttons keep it to one click. */
  function moveHomeReel(index: number, direction: -1 | 1) {
    setHomeReels(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.reels.length) return prev
      const reels = [...prev.reels]
      ;[reels[index], reels[target]] = [reels[target], reels[index]]
      return { ...prev, reels }
    })
  }

  // Homepage product showcase rows ("Our Bestselling Jeans")
  const [homeShowcase, setHomeShowcase] = useState<HomeShowcaseConfig>(DEFAULT_HOME_SHOWCASE)

  function updateHomeShowcaseSection(patch: Partial<HomeShowcaseConfig>) {
    setHomeShowcase(prev => ({ ...prev, ...patch }))
  }

  function updateHomeShowcaseRow(index: number, patch: Partial<HomeShowcaseRow>) {
    setHomeShowcase(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }))
  }

  /** Ticking a product appends it — the strip follows the order they were picked. */
  function toggleHomeShowcaseProduct(index: number, productId: string) {
    setHomeShowcase(prev => ({
      ...prev,
      rows: prev.rows.map((row, i) => {
        if (i !== index) return row
        const picked = row.productIds.includes(productId)
        if (!picked && row.productIds.length >= MAX_HOME_SHOWCASE_PRODUCTS) return row
        return {
          ...row,
          productIds: picked
            ? row.productIds.filter(id => id !== productId)
            : [...row.productIds, productId],
        }
      }),
    }))
  }

  function addHomeShowcaseRow() {
    setHomeShowcase(prev =>
      prev.rows.length >= MAX_HOME_SHOWCASE_ROWS
        ? prev
        : { ...prev, rows: [...prev.rows, { ...EMPTY_HOME_SHOWCASE_ROW, productIds: [] }] }
    )
  }

  function removeHomeShowcaseRow(index: number) {
    setHomeShowcase(prev => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }))
  }

  function moveHomeShowcaseRow(index: number, direction: -1 | 1) {
    setHomeShowcase(prev => {
      const target = index + direction
      if (target < 0 || target >= prev.rows.length) return prev
      const rows = [...prev.rows]
      ;[rows[index], rows[target]] = [rows[target], rows[index]]
      return { ...prev, rows }
    })
  }

  // Homepage Community Tabs Settings
  const [activeCommunityEditTab, setActiveCommunityEditTab] =
    useState<"heights" | "fit" | "purpose" | "product">("heights")
  const [uploadingTabImage, setUploadingTabImage] = useState(false)

  // Homepage slide upload states
  const [uploadingMenImage, setUploadingMenImage] = useState(false)
  const [uploadingMenVideo, setUploadingMenVideo] = useState(false)
  const [uploadingMenVideoFallback, setUploadingMenVideoFallback] = useState(false)
  const [uploadingWomenImage, setUploadingWomenImage] = useState(false)
  const [uploadingWomenVideo, setUploadingWomenVideo] = useState(false)
  const [uploadingWomenVideoFallback, setUploadingWomenVideoFallback] = useState(false)

  const [tabHeightsLabel, setTabHeightsLabel] = useState("Our Heights")
  const [tabHeightsHeading, setTabHeightsHeading] = useState("Designed For Real Heights.")
  const [tabHeightsDescription, setTabHeightsDescription] = useState("We engineer clothing specifically for tall men from 6'3\" to 7'1\" and tall women from 5'9\" to 6'6\". Every pattern is scaled vertically to ensure the waist, elbows, and knees land exactly where they should.")
  const [tabHeightsImage, setTabHeightsImage] = useState("/images/men_hero.png")
  const [tabHeightsCtaText, setTabHeightsCtaText] = useState("Explore Heights")
  const [tabHeightsCtaLink, setTabHeightsCtaLink] = useState("/about")

  const [tabFitLabel, setTabFitLabel] = useState("Our Fit")
  const [tabFitHeading, setTabFitHeading] = useState("Proportions, Perfected.")
  const [tabFitDescription, setTabFitDescription] = useState("Standard grading just adds width. We adjust every single measurement—sleeve length, torso length, shoulder width, and rise—to create a tailored fit that respects your height without being baggy.")
  const [tabFitImage, setTabFitImage] = useState("/images/pants.png")
  const [tabFitCtaText, setTabFitCtaText] = useState("Explore Fit Guide")
  const [tabFitCtaLink, setTabFitCtaLink] = useState("/about")

  const [tabPurposeLabel, setTabPurposeLabel] = useState("Our Purpose")
  const [tabPurposeHeading, setTabPurposeHeading] = useState("We're All About Community.")
  const [tabPurposeDescription, setTabPurposeDescription] = useState("We know the frustration of searching endlessly for clothing that fits—and coming up short. What started as one family's mission to solve fit challenges with better options has reached a global community of tall people with a shared vision.")
  const [tabPurposeImage, setTabPurposeImage] = useState("/images/community.png")
  const [tabPurposeCtaText, setTabPurposeCtaText] = useState("Learn More")
  const [tabPurposeCtaLink, setTabPurposeCtaLink] = useState("/about")

  // Fourth carousel slide — a video rather than a still, so no image field.
  const [tabProductLabel, setTabProductLabel] = useState("Our Product")
  const [tabProductHeading, setTabProductHeading] = useState("Intentional Design.")
  const [tabProductDescription, setTabProductDescription] = useState("Every garment is created with purpose, whether it's a request from our community or a suggestion from our seasoned design team.")
  const [tabProductVideo, setTabProductVideo] = useState("/videos/main-side-video.mp4")
  const [tabProductPoster, setTabProductPoster] = useState("/images/hero.jpg")

  // Imagery shared by the carousel rather than owned by one tab.
  const [pillarFigureWomen, setPillarFigureWomen] = useState("/images/women_hero.png")
  // One cut-out per height range for the heights slide's sliding ladder. Left
  // empty on purpose: each falls back to the single Men/Women figure above, so
  // the animation works before a store has shot five separate photos.
  const [pillarFigureMen1, setPillarFigureMen1] = useState("")
  const [pillarFigureMen2, setPillarFigureMen2] = useState("")
  const [pillarFigureMen3, setPillarFigureMen3] = useState("")
  const [pillarFigureWomen1, setPillarFigureWomen1] = useState("")
  const [pillarFigureWomen2, setPillarFigureWomen2] = useState("")
  const [pillarCompareMenBefore, setPillarCompareMenBefore] = useState("/images/hero.jpg")
  const [pillarCompareMenAfter, setPillarCompareMenAfter] = useState("/images/olaszkolda-fashion-10318918.jpg")
  const [pillarCompareWomenBefore, setPillarCompareWomenBefore] = useState("/images/women_hero.png")
  const [pillarCompareWomenAfter, setPillarCompareWomenAfter] = useState("/images/fashion-show-1746622_1280.jpg")

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true)
        const res = await api.get("/admin/settings")
        if (res.data) {
          if (res.data.reward_point_value) setRewardPointValue(res.data.reward_point_value)
          if (res.data.reward_point_earn_rate) setRewardPointEarnRate(res.data.reward_point_earn_rate)
          if (res.data.supported_currencies) {
            try {
              const parsed = JSON.parse(res.data.supported_currencies)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCurrencies(parsed)
              }
            } catch(e) {}
          }
          if (res.data.brand_store_name !== undefined) setBrandStoreName(res.data.brand_store_name)
          if (res.data.brand_logo_url !== undefined) setBrandLogoUrl(res.data.brand_logo_url)
          if (res.data.brand_favicon_url !== undefined) setBrandFaviconUrl(res.data.brand_favicon_url)
          if (res.data.brand_slogan !== undefined) setBrandSlogan(res.data.brand_slogan)
          if (res.data.contact_email !== undefined) setContactEmail(res.data.contact_email)
          if (res.data.whatsapp_number !== undefined) setWhatsappNumber(res.data.whatsapp_number)
          if (res.data.whatsapp_message !== undefined) setWhatsappMessage(res.data.whatsapp_message)
          if (res.data.tawk_property_id !== undefined) setTawkPropertyId(res.data.tawk_property_id)
          if (res.data.tawk_widget_id !== undefined) setTawkWidgetId(res.data.tawk_widget_id)
          if (res.data.social_facebook !== undefined) setSocialFacebook(res.data.social_facebook)
          if (res.data.social_instagram !== undefined) setSocialInstagram(res.data.social_instagram)
          if (res.data.social_youtube !== undefined) setSocialYoutube(res.data.social_youtube)
          if (res.data.social_tiktok !== undefined) setSocialTiktok(res.data.social_tiktok)
          if (res.data.social_pinterest !== undefined) setSocialPinterest(res.data.social_pinterest)
          if (res.data.payment_cod_enabled !== undefined) setPaymentCodEnabled(res.data.payment_cod_enabled)
          if (res.data.payment_cod_country !== undefined) setPaymentCodCountry(res.data.payment_cod_country)
          if (res.data.payment_stripe_enabled !== undefined) setPaymentStripeEnabled(res.data.payment_stripe_enabled)
          if (res.data.payment_bkash_enabled !== undefined) setPaymentBkashEnabled(res.data.payment_bkash_enabled)
          if (res.data.payment_nagad_enabled !== undefined) setPaymentNagadEnabled(res.data.payment_nagad_enabled)
          if (res.data.payment_square_enabled !== undefined) setPaymentSquareEnabled(res.data.payment_square_enabled)

          if (res.data.seo_meta_title !== undefined) setSeoMetaTitle(res.data.seo_meta_title)
          if (res.data.seo_meta_description !== undefined) setSeoMetaDescription(res.data.seo_meta_description)
          if (res.data.google_site_verification !== undefined) setGoogleSiteVerification(res.data.google_site_verification)
          if (res.data.facebook_domain_verification !== undefined) setfacebookDomainVerification(res.data.facebook_domain_verification)
          if (res.data.gtm_id !== undefined) setGtmId(res.data.gtm_id)
          if (res.data.google_analytics_id !== undefined) setGoogleAnalyticsId(res.data.google_analytics_id)
          if (res.data.facebook_pixel_id !== undefined) setfacebookPixelId(res.data.facebook_pixel_id)
          if (res.data.custom_head_scripts !== undefined) setCustomHeadScripts(res.data.custom_head_scripts)

          if (res.data.flash_sale_enabled !== undefined) setFlashSaleEnabled(res.data.flash_sale_enabled)
          if (res.data.flash_sale_title !== undefined) setFlashSaleTitle(res.data.flash_sale_title)
          if (res.data.flash_sale_description !== undefined) setFlashSaleDescription(res.data.flash_sale_description)
          if (res.data.flash_sale_end_date !== undefined) setFlashSaleEndDate(res.data.flash_sale_end_date)
          if (res.data.flash_sale_products !== undefined) {
            try {
              const parsed = JSON.parse(res.data.flash_sale_products)
              if (Array.isArray(parsed)) setFlashSaleProducts(parsed)
            } catch(e) {}
          }

          if (res.data.promo_popup_enabled !== undefined) setPromoPopupEnabled(res.data.promo_popup_enabled)
          if (res.data.promo_popup_heading !== undefined) setPromoPopupHeading(res.data.promo_popup_heading)
          if (res.data.promo_popup_highlight !== undefined) setPromoPopupHighlight(res.data.promo_popup_highlight)
          if (res.data.promo_popup_subheading !== undefined) setPromoPopupSubheading(res.data.promo_popup_subheading)
          if (res.data.promo_popup_consent_text !== undefined) setPromoPopupConsentText(res.data.promo_popup_consent_text)
          if (res.data.promo_popup_button_text !== undefined) setPromoPopupButtonText(res.data.promo_popup_button_text)
          if (res.data.promo_popup_code !== undefined) setPromoPopupCode(res.data.promo_popup_code)
          if (res.data.promo_popup_success_heading !== undefined) setPromoPopupSuccessHeading(res.data.promo_popup_success_heading)
          if (res.data.promo_popup_success_text !== undefined) setPromoPopupSuccessText(res.data.promo_popup_success_text)
          if (res.data.promo_popup_tab_label !== undefined) setPromoPopupTabLabel(res.data.promo_popup_tab_label)
          if (res.data.promo_popup_image_url !== undefined) setPromoPopupImageUrl(res.data.promo_popup_image_url)
          if (res.data.promo_popup_show_shop_for !== undefined) setPromoPopupShowShopFor(res.data.promo_popup_show_shop_for)
          if (res.data.promo_popup_shop_for_options !== undefined) setPromoPopupShopForOptions(res.data.promo_popup_shop_for_options)
          if (res.data.promo_popup_terms_url !== undefined) setPromoPopupTermsUrl(res.data.promo_popup_terms_url)
          if (res.data.promo_popup_privacy_url !== undefined) setPromoPopupPrivacyUrl(res.data.promo_popup_privacy_url)
          if (res.data.promo_popup_delay_seconds !== undefined) setPromoPopupDelaySeconds(res.data.promo_popup_delay_seconds)
          if (res.data.promo_popup_frequency_days !== undefined) setPromoPopupFrequencyDays(res.data.promo_popup_frequency_days)

          if (res.data.home_hero_slides) {
            try {
              const slides = JSON.parse(res.data.home_hero_slides)
              if (slides.rotationInterval !== undefined) setSlideRotationInterval(String(slides.rotationInterval))

               if (slides.men) {
                if (slides.men.active !== undefined) setSlideMenActive(!!slides.men.active)
                if (slides.men.title !== undefined) setSlideMenTitle(slides.men.title)
                if (slides.men.subtitle !== undefined) setSlideMenSubtitle(slides.men.subtitle)
                if (slides.men.image !== undefined) setSlideMenImage(slides.men.image)
                if (slides.men.imageAlt !== undefined) setSlideMenImageAlt(slides.men.imageAlt)
                if (slides.men.video !== undefined) setSlideMenVideo(slides.men.video)
                if (slides.men.videoFallback !== undefined) setSlideMenVideoFallback(slides.men.videoFallback)
                if (slides.men.buttonText !== undefined) setSlideMenButtonText(slides.men.buttonText)
                if (slides.men.shopLink !== undefined) setSlideMenShopLink(slides.men.shopLink)
                if (slides.men.topBarTag !== undefined) setSlideMenTopBarTag(slides.men.topBarTag)
              }

              if (slides.women) {
                if (slides.women.active !== undefined) setSlideWomenActive(!!slides.women.active)
                if (slides.women.title !== undefined) setSlideWomenTitle(slides.women.title)
                if (slides.women.subtitle !== undefined) setSlideWomenSubtitle(slides.women.subtitle)
                if (slides.women.image !== undefined) setSlideWomenImage(slides.women.image)
                if (slides.women.imageAlt !== undefined) setSlideWomenImageAlt(slides.women.imageAlt)
                if (slides.women.video !== undefined) setSlideWomenVideo(slides.women.video)
                if (slides.women.videoFallback !== undefined) setSlideWomenVideoFallback(slides.women.videoFallback)
                if (slides.women.buttonText !== undefined) setSlideWomenButtonText(slides.women.buttonText)
                if (slides.women.shopLink !== undefined) setSlideWomenShopLink(slides.women.shopLink)
                if (slides.women.topBarTag !== undefined) setSlideWomenTopBarTag(slides.women.topBarTag)
              }
            } catch(e) {}
          }

          if (res.data.home_community_tabs) {
            try {
              const tabs = JSON.parse(res.data.home_community_tabs)
              if (tabs.heights) {
                if (tabs.heights.label !== undefined) setTabHeightsLabel(tabs.heights.label)
                if (tabs.heights.heading !== undefined) setTabHeightsHeading(tabs.heights.heading)
                if (tabs.heights.description !== undefined) setTabHeightsDescription(tabs.heights.description)
                if (tabs.heights.image !== undefined) setTabHeightsImage(tabs.heights.image)
                if (tabs.heights.ctaText !== undefined) setTabHeightsCtaText(tabs.heights.ctaText)
                if (tabs.heights.ctaLink !== undefined) setTabHeightsCtaLink(tabs.heights.ctaLink)
              }
              if (tabs.fit) {
                if (tabs.fit.label !== undefined) setTabFitLabel(tabs.fit.label)
                if (tabs.fit.heading !== undefined) setTabFitHeading(tabs.fit.heading)
                if (tabs.fit.description !== undefined) setTabFitDescription(tabs.fit.description)
                if (tabs.fit.image !== undefined) setTabFitImage(tabs.fit.image)
                if (tabs.fit.ctaText !== undefined) setTabFitCtaText(tabs.fit.ctaText)
                if (tabs.fit.ctaLink !== undefined) setTabFitCtaLink(tabs.fit.ctaLink)
              }
              if (tabs.product) {
                if (tabs.product.label !== undefined) setTabProductLabel(tabs.product.label)
                if (tabs.product.heading !== undefined) setTabProductHeading(tabs.product.heading)
                if (tabs.product.description !== undefined) setTabProductDescription(tabs.product.description)
                if (tabs.product.video !== undefined) setTabProductVideo(tabs.product.video)
                if (tabs.product.poster !== undefined) setTabProductPoster(tabs.product.poster)
              }
              if (tabs.media) {
                if (tabs.media.figureWomen !== undefined) setPillarFigureWomen(tabs.media.figureWomen)
                if (tabs.media.figureMen1 !== undefined) setPillarFigureMen1(tabs.media.figureMen1)
                if (tabs.media.figureMen2 !== undefined) setPillarFigureMen2(tabs.media.figureMen2)
                if (tabs.media.figureMen3 !== undefined) setPillarFigureMen3(tabs.media.figureMen3)
                if (tabs.media.figureWomen1 !== undefined) setPillarFigureWomen1(tabs.media.figureWomen1)
                if (tabs.media.figureWomen2 !== undefined) setPillarFigureWomen2(tabs.media.figureWomen2)
                if (tabs.media.compareMenBefore !== undefined) setPillarCompareMenBefore(tabs.media.compareMenBefore)
                if (tabs.media.compareMenAfter !== undefined) setPillarCompareMenAfter(tabs.media.compareMenAfter)
                if (tabs.media.compareWomenBefore !== undefined) setPillarCompareWomenBefore(tabs.media.compareWomenBefore)
                if (tabs.media.compareWomenAfter !== undefined) setPillarCompareWomenAfter(tabs.media.compareWomenAfter)
              }
              if (tabs.purpose) {
                if (tabs.purpose.label !== undefined) setTabPurposeLabel(tabs.purpose.label)
                if (tabs.purpose.heading !== undefined) setTabPurposeHeading(tabs.purpose.heading)
                if (tabs.purpose.description !== undefined) setTabPurposeDescription(tabs.purpose.description)
                if (tabs.purpose.image !== undefined) setTabPurposeImage(tabs.purpose.image)
                if (tabs.purpose.ctaText !== undefined) setTabPurposeCtaText(tabs.purpose.ctaText)
                if (tabs.purpose.ctaLink !== undefined) setTabPurposeCtaLink(tabs.purpose.ctaLink)
              }
            } catch(e) {}
          }

          if (res.data.home_description !== undefined) setHomeDescription(res.data.home_description)

          if (res.data.home_style_sections) {
            try {
              const parsed = JSON.parse(res.data.home_style_sections)
              // Any `winter` key left in an older stored value is ignored here
              // and dropped on the next save.
              setStyleSections(prev => ({
                summer: mergeStyleSection(prev.summer, parsed?.summer),
              }))
            } catch(e) {}
          }

          // keepEmpty: a tile the admin added but has not uploaded to yet must
          // survive a reload here, even though the storefront drops it.
          if (res.data[HOME_ICONS_SETTING_KEY]) {
            setHomeIcons(parseHomeIcons(res.data[HOME_ICONS_SETTING_KEY], { keepEmpty: true }))
          }

          // keepEmpty so a message the admin just added survives a reload
          // before they have typed anything into it.
          if (res.data[ANNOUNCEMENT_BAR_SETTING_KEY]) {
            setAnnouncementBar(
              parseAnnouncementBar(res.data[ANNOUNCEMENT_BAR_SETTING_KEY], { keepEmpty: true })
            )
          }

          // parseHomeSections repairs the stored order itself — dropping keys
          // that no longer exist and slotting in sections added since — so an
          // absent or stale value simply comes back corrected.
          setHomeSections(parseHomeSections(res.data[HOME_SECTIONS_SETTING_KEY]))

          if (res.data[HOME_VIDEO_BANNERS_SETTING_KEY]) {
            setVideoBanners(
              parseHomeVideoBanners(res.data[HOME_VIDEO_BANNERS_SETTING_KEY], { keepEmpty: true })
            )
          }

          // keepEmpty: a row the admin added but has not uploaded to yet must
          // survive a reload here, even though the storefront drops it.
          if (res.data[HOME_REELS_SETTING_KEY]) {
            setHomeReels(parseHomeReels(res.data[HOME_REELS_SETTING_KEY], { keepEmpty: true }))
          }

          // Same keepEmpty deal: a row still being written has no products on it
          // yet, and the storefront is the only place that has to care.
          if (res.data[HOME_SHOWCASE_SETTING_KEY]) {
            setHomeShowcase(parseHomeShowcase(res.data[HOME_SHOWCASE_SETTING_KEY], { keepEmpty: true }))
          }

          // parseHeightsGuide already falls back field by field, so an absent or
          // malformed value simply leaves the defaults in place.
          if (res.data[HEIGHTS_GUIDE_SETTING_KEY]) {
            setHeightsGuide(parseHeightsGuide(res.data[HEIGHTS_GUIDE_SETTING_KEY]))
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // The product list is only read by the Flash Sale picker and the homepage
  // showcase rows, so it is fetched when one of those tabs is first opened
  // rather than on page load — it used to block the settings spinner behind a
  // second round trip nobody had asked for.
  useEffect(() => {
    if ((activeSettingsTab !== "flashsale" && activeSettingsTab !== "homepage") || productsLoaded) return

    let cancelled = false
    async function fetchProducts() {
      try {
        const res = await api.get("/admin/products?limit=100&view=picker")
        if (!cancelled && Array.isArray(res.data?.data)) {
          setAllProducts(res.data.data)
        }
      } catch (e) {
        console.error("Failed to fetch products", e)
      } finally {
        if (!cancelled) setProductsLoaded(true)
      }
    }
    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [activeSettingsTab, productsLoaded])

  // Same deal for the category list behind the seasonal style-section pickers —
  // only the Homepage tab reads it.
  useEffect(() => {
    if (activeSettingsTab !== "homepage" || categoriesLoaded) return

    let cancelled = false
    async function fetchCategories() {
      try {
        const res = await api.get("/admin/categories")
        if (!cancelled && Array.isArray(res.data)) {
          setAllCategories(flattenCategories(res.data))
        }
      } catch (e) {
        console.error("Failed to fetch categories", e)
      } finally {
        if (!cancelled) setCategoriesLoaded(true)
      }
    }
    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [activeSettingsTab, categoriesLoaded])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/admin/upload", formData)
      if (res.data && res.data.url) {
        setBrandLogoUrl(res.data.url)
      }
    } catch (error) {
      console.error("Logo upload failed:", error)
      Swal.fire({ text: "Failed to upload logo.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    try {
      setUploadingFavicon(true)
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/admin/upload", formData)
      if (res.data && res.data.url) {
        setBrandFaviconUrl(res.data.url)
      }
    } catch (error) {
      console.error("Favicon upload failed:", error)
      Swal.fire({ text: "Failed to upload favicon.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploadingFavicon(false)
    }
  }

  async function handleTabImageUpload(e: React.ChangeEvent<HTMLInputElement>, tabKey: "heights" | "fit" | "purpose") {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    try {
      setUploadingTabImage(true)
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/admin/upload", formData)
      if (res.data && res.data.url) {
        if (tabKey === "heights") setTabHeightsImage(res.data.url)
        else if (tabKey === "fit") setTabFitImage(res.data.url)
        else if (tabKey === "purpose") setTabPurposeImage(res.data.url)
      }
    } catch (error) {
      console.error(`Tab image upload failed for ${tabKey}:`, error)
      Swal.fire({ text: "Failed to upload image.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploadingTabImage(false)
    }
  }

  async function handleFieldFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrlState: React.Dispatch<React.SetStateAction<string>>,
    setLoadingState: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    try {
      setLoadingState(true)
      
      let res;
      // If the file is a video or larger than 4MB, stream it as raw binary to bypass Next.js API limits
      if (file.type.startsWith("video/") || file.size > 4 * 1024 * 1024) {
        const arrayBuffer = await file.arrayBuffer()
        res = await api.post(`/admin/upload?filename=${encodeURIComponent(file.name)}`, arrayBuffer, {
          headers: { "Content-Type": file.type }
        })
      } else {
        const formData = new FormData()
        formData.append("files", file)
        res = await api.post("/admin/upload", formData)
      }

      if (res.data && res.data.urls && res.data.urls.length > 0) {
        setUrlState(res.data.urls[0])
      }
    } catch (error) {
      console.error("Field file upload failed:", error)
      Swal.fire({ text: "Failed to upload file.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setLoadingState(false)
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()

    if (!rewardPointValue || isNaN(Number(rewardPointValue)) || Number(rewardPointValue) <= 0) {
      Swal.fire({ text: "Reward Point Value must be a valid positive number.", confirmButtonColor: "#18181b" })
      return
    }

    if (!rewardPointEarnRate || isNaN(Number(rewardPointEarnRate)) || Number(rewardPointEarnRate) <= 0) {
      Swal.fire({ text: "Reward Point Earn Rate must be a valid positive number.", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSaving(true)
      await api.post("/admin/settings", {
        reward_point_value: rewardPointValue,
        reward_point_earn_rate: rewardPointEarnRate,
        supported_currencies: JSON.stringify(currencies),
        brand_store_name: brandStoreName,
        brand_logo_url: brandLogoUrl,
        brand_favicon_url: brandFaviconUrl,
        brand_slogan: brandSlogan,
        contact_email: contactEmail,
        whatsapp_number: whatsappNumber,
        whatsapp_message: whatsappMessage,
        tawk_property_id: tawkPropertyId,
        tawk_widget_id: tawkWidgetId,
        social_facebook: socialFacebook,
        social_instagram: socialInstagram,
        social_youtube: socialYoutube,
        social_tiktok: socialTiktok,
        social_pinterest: socialPinterest,
        payment_cod_enabled: paymentCodEnabled,
        payment_cod_country: paymentCodCountry,
        payment_stripe_enabled: paymentStripeEnabled,
        payment_bkash_enabled: paymentBkashEnabled,
        payment_nagad_enabled: paymentNagadEnabled,
        payment_square_enabled: paymentSquareEnabled,
        seo_meta_title: seoMetaTitle,
        seo_meta_description: seoMetaDescription,
        google_site_verification: googleSiteVerification,
        facebook_domain_verification: facebookDomainVerification,
        gtm_id: gtmId,
        google_analytics_id: googleAnalyticsId,
        facebook_pixel_id: facebookPixelId,
        custom_head_scripts: customHeadScripts,
        flash_sale_enabled: flashSaleEnabled,
        flash_sale_title: flashSaleTitle,
        flash_sale_description: flashSaleDescription,
        flash_sale_end_date: flashSaleEndDate,
        flash_sale_products: JSON.stringify(flashSaleProducts),
        promo_popup_enabled: promoPopupEnabled,
        promo_popup_heading: promoPopupHeading,
        promo_popup_highlight: promoPopupHighlight,
        promo_popup_subheading: promoPopupSubheading,
        promo_popup_consent_text: promoPopupConsentText,
        promo_popup_button_text: promoPopupButtonText,
        promo_popup_code: promoPopupCode,
        promo_popup_success_heading: promoPopupSuccessHeading,
        promo_popup_success_text: promoPopupSuccessText,
        promo_popup_tab_label: promoPopupTabLabel,
        promo_popup_image_url: promoPopupImageUrl,
        promo_popup_show_shop_for: promoPopupShowShopFor,
        promo_popup_shop_for_options: promoPopupShopForOptions,
        promo_popup_terms_url: promoPopupTermsUrl,
        promo_popup_privacy_url: promoPopupPrivacyUrl,
        promo_popup_delay_seconds: promoPopupDelaySeconds,
        promo_popup_frequency_days: promoPopupFrequencyDays,
        home_hero_slides: JSON.stringify({
          rotationInterval: Number(slideRotationInterval) || 7000,
          men: {
            active: slideMenActive,
            title: slideMenTitle,
            subtitle: slideMenSubtitle,
            image: slideMenImage,
            imageAlt: slideMenImageAlt,
            video: slideMenVideo,
            videoFallback: slideMenVideoFallback,
            buttonText: slideMenButtonText,
            shopLink: slideMenShopLink,
            topBarTag: slideMenTopBarTag
          },
          women: {
            active: slideWomenActive,
            title: slideWomenTitle,
            subtitle: slideWomenSubtitle,
            image: slideWomenImage,
            imageAlt: slideWomenImageAlt,
            video: slideWomenVideo,
            videoFallback: slideWomenVideoFallback,
            buttonText: slideWomenButtonText,
            shopLink: slideWomenShopLink,
            topBarTag: slideWomenTopBarTag
          }
        }),
        home_community_tabs: JSON.stringify({
          heights: {
            label: tabHeightsLabel,
            heading: tabHeightsHeading,
            description: tabHeightsDescription,
            image: tabHeightsImage,
            ctaText: tabHeightsCtaText,
            ctaLink: tabHeightsCtaLink
          },
          fit: {
            label: tabFitLabel,
            heading: tabFitHeading,
            description: tabFitDescription,
            image: tabFitImage,
            ctaText: tabFitCtaText,
            ctaLink: tabFitCtaLink
          },
          purpose: {
            label: tabPurposeLabel,
            heading: tabPurposeHeading,
            description: tabPurposeDescription,
            image: tabPurposeImage,
            ctaText: tabPurposeCtaText,
            ctaLink: tabPurposeCtaLink
          },
          product: {
            label: tabProductLabel,
            heading: tabProductHeading,
            description: tabProductDescription,
            video: tabProductVideo,
            poster: tabProductPoster
          },
          media: {
            figureWomen: pillarFigureWomen,
            figureMen1: pillarFigureMen1,
            figureMen2: pillarFigureMen2,
            figureMen3: pillarFigureMen3,
            figureWomen1: pillarFigureWomen1,
            figureWomen2: pillarFigureWomen2,
            compareMenBefore: pillarCompareMenBefore,
            compareMenAfter: pillarCompareMenAfter,
            compareWomenBefore: pillarCompareWomenBefore,
            compareWomenAfter: pillarCompareWomenAfter
          }
        }),
        home_style_sections: JSON.stringify(styleSections),
        [HOME_REELS_SETTING_KEY]: JSON.stringify(homeReels),
        [HOME_VIDEO_BANNERS_SETTING_KEY]: JSON.stringify(videoBanners),
        [HOME_SECTIONS_SETTING_KEY]: JSON.stringify(homeSections),
        [ANNOUNCEMENT_BAR_SETTING_KEY]: JSON.stringify(announcementBar),
        [HOME_ICONS_SETTING_KEY]: JSON.stringify(homeIcons),
        [HOME_SHOWCASE_SETTING_KEY]: JSON.stringify(homeShowcase),
        home_description: homeDescription,
        [HEIGHTS_GUIDE_SETTING_KEY]: JSON.stringify(heightsGuide)
      })
      window.dispatchEvent(new Event("brand-settings-updated"))
      Swal.fire({ text: "Settings saved successfully!", confirmButtonColor: "#18181b", icon: "success" })
    } catch (error) {
      console.error("Failed to save settings", error)
      Swal.fire({ text: "Failed to save settings.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSaving(false)
    }
  }

  const fieldLabel = "text-[10px] font-black uppercase tracking-widest text-muted-foreground"
  const helpText = "text-[10px] text-muted-foreground mt-2"

  return {
    loading,
    setLoading,
    saving,
    setSaving,
    activeSettingsTab,
    setActiveSettingsTab,
    uploadingLogo,
    setUploadingLogo,
    uploadingFavicon,
    setUploadingFavicon,
    rewardPointValue,
    setRewardPointValue,
    rewardPointEarnRate,
    setRewardPointEarnRate,
    currencies,
    setCurrencies,
    brandStoreName,
    setBrandStoreName,
    brandLogoUrl,
    setBrandLogoUrl,
    brandFaviconUrl,
    setBrandFaviconUrl,
    brandSlogan,
    setBrandSlogan,
    contactEmail,
    setContactEmail,
    whatsappNumber,
    setWhatsappNumber,
    whatsappMessage,
    setWhatsappMessage,
    tawkPropertyId,
    setTawkPropertyId,
    tawkWidgetId,
    setTawkWidgetId,
    socialFacebook,
    setSocialFacebook,
    socialInstagram,
    setSocialInstagram,
    socialYoutube,
    setSocialYoutube,
    socialTiktok,
    setSocialTiktok,
    socialPinterest,
    setSocialPinterest,
    paymentCodEnabled,
    setPaymentCodEnabled,
    paymentCodCountry,
    setPaymentCodCountry,
    paymentStripeEnabled,
    setPaymentStripeEnabled,
    paymentBkashEnabled,
    setPaymentBkashEnabled,
    paymentNagadEnabled,
    setPaymentNagadEnabled,
    paymentSquareEnabled,
    setPaymentSquareEnabled,
    flashSaleEnabled,
    setFlashSaleEnabled,
    flashSaleTitle,
    setFlashSaleTitle,
    flashSaleDescription,
    setFlashSaleDescription,
    flashSaleEndDate,
    setFlashSaleEndDate,
    flashSaleProducts,
    setFlashSaleProducts,
    allProducts,
    setAllProducts,
    productsLoaded,
    setProductsLoaded,
    promoPopupEnabled,
    setPromoPopupEnabled,
    promoPopupHeading,
    setPromoPopupHeading,
    promoPopupHighlight,
    setPromoPopupHighlight,
    promoPopupSubheading,
    setPromoPopupSubheading,
    promoPopupConsentText,
    setPromoPopupConsentText,
    promoPopupButtonText,
    setPromoPopupButtonText,
    promoPopupCode,
    setPromoPopupCode,
    promoPopupSuccessHeading,
    setPromoPopupSuccessHeading,
    promoPopupSuccessText,
    setPromoPopupSuccessText,
    promoPopupTabLabel,
    setPromoPopupTabLabel,
    promoPopupImageUrl,
    setPromoPopupImageUrl,
    promoPopupShowShopFor,
    setPromoPopupShowShopFor,
    promoPopupShopForOptions,
    setPromoPopupShopForOptions,
    promoPopupTermsUrl,
    setPromoPopupTermsUrl,
    promoPopupPrivacyUrl,
    setPromoPopupPrivacyUrl,
    promoPopupDelaySeconds,
    setPromoPopupDelaySeconds,
    promoPopupFrequencyDays,
    setPromoPopupFrequencyDays,
    uploadingPromoPopupImage,
    setUploadingPromoPopupImage,
    seoMetaTitle,
    setSeoMetaTitle,
    seoMetaDescription,
    setSeoMetaDescription,
    googleSiteVerification,
    setGoogleSiteVerification,
    facebookDomainVerification,
    setfacebookDomainVerification,
    gtmId,
    setGtmId,
    googleAnalyticsId,
    setGoogleAnalyticsId,
    facebookPixelId,
    setfacebookPixelId,
    customHeadScripts,
    setCustomHeadScripts,
    activeEditTab,
    setActiveEditTab,
    slideRotationInterval,
    setSlideRotationInterval,
    slideMenActive,
    setSlideMenActive,
    slideMenTitle,
    setSlideMenTitle,
    slideMenSubtitle,
    setSlideMenSubtitle,
    slideMenImage,
    setSlideMenImage,
    slideMenImageAlt,
    setSlideMenImageAlt,
    slideMenVideo,
    setSlideMenVideo,
    slideMenVideoFallback,
    setSlideMenVideoFallback,
    slideMenButtonText,
    setSlideMenButtonText,
    slideMenShopLink,
    setSlideMenShopLink,
    slideMenTopBarTag,
    setSlideMenTopBarTag,
    slideWomenActive,
    setSlideWomenActive,
    slideWomenTitle,
    setSlideWomenTitle,
    slideWomenSubtitle,
    setSlideWomenSubtitle,
    slideWomenImage,
    setSlideWomenImage,
    slideWomenImageAlt,
    setSlideWomenImageAlt,
    slideWomenVideo,
    setSlideWomenVideo,
    slideWomenVideoFallback,
    setSlideWomenVideoFallback,
    slideWomenButtonText,
    setSlideWomenButtonText,
    slideWomenShopLink,
    setSlideWomenShopLink,
    slideWomenTopBarTag,
    setSlideWomenTopBarTag,
    homeDescription,
    setHomeDescription,
    heightsGuide,
    updateHeightsGuide,
    updateHeightsCell,
    addHeightsRow,
    removeHeightsRow,
    updateHeightsColumn,
    addHeightsColumn,
    removeHeightsColumn,
    updateHeightsModel,
    addHeightsModel,
    removeHeightsModel,
    styleSections,
    setStyleSections,
    updateStyleSection,
    toggleStyleCategory,
    styleEditTab,
    setStyleEditTab,
    allCategories,
    categoriesLoaded,
    activeCommunityEditTab,
    setActiveCommunityEditTab,
    uploadingTabImage,
    setUploadingTabImage,
    uploadingMenImage,
    setUploadingMenImage,
    uploadingMenVideo,
    setUploadingMenVideo,
    uploadingMenVideoFallback,
    setUploadingMenVideoFallback,
    uploadingWomenImage,
    setUploadingWomenImage,
    uploadingWomenVideo,
    setUploadingWomenVideo,
    uploadingWomenVideoFallback,
    setUploadingWomenVideoFallback,
    tabHeightsLabel,
    setTabHeightsLabel,
    tabHeightsHeading,
    setTabHeightsHeading,
    tabHeightsDescription,
    setTabHeightsDescription,
    tabHeightsImage,
    setTabHeightsImage,
    tabHeightsCtaText,
    setTabHeightsCtaText,
    tabHeightsCtaLink,
    setTabHeightsCtaLink,
    tabFitLabel,
    setTabFitLabel,
    tabFitHeading,
    setTabFitHeading,
    tabFitDescription,
    setTabFitDescription,
    tabFitImage,
    setTabFitImage,
    tabFitCtaText,
    setTabFitCtaText,
    tabFitCtaLink,
    setTabFitCtaLink,
    tabPurposeLabel,
    setTabPurposeLabel,
    tabPurposeHeading,
    setTabPurposeHeading,
    tabPurposeDescription,
    setTabPurposeDescription,
    tabPurposeImage,
    setTabPurposeImage,
    tabPurposeCtaText,
    setTabPurposeCtaText,
    tabPurposeCtaLink,
    setTabPurposeCtaLink,
    tabProductLabel,
    setTabProductLabel,
    tabProductHeading,
    setTabProductHeading,
    tabProductDescription,
    setTabProductDescription,
    tabProductVideo,
    setTabProductVideo,
    tabProductPoster,
    setTabProductPoster,
    pillarFigureWomen,
    setPillarFigureWomen,
    pillarFigureMen1,
    setPillarFigureMen1,
    pillarFigureMen2,
    setPillarFigureMen2,
    pillarFigureMen3,
    setPillarFigureMen3,
    pillarFigureWomen1,
    setPillarFigureWomen1,
    pillarFigureWomen2,
    setPillarFigureWomen2,
    pillarCompareMenBefore,
    setPillarCompareMenBefore,
    pillarCompareMenAfter,
    setPillarCompareMenAfter,
    pillarCompareWomenBefore,
    setPillarCompareWomenBefore,
    pillarCompareWomenAfter,
    setPillarCompareWomenAfter,
    homeIcons,
    updateHomeIcons,
    updateHomeIconTile,
    addHomeIconTile,
    removeHomeIconTile,
    moveHomeIconTile,
    announcementBar,
    updateAnnouncementBar,
    updateAnnouncementSlide,
    addAnnouncementSlide,
    removeAnnouncementSlide,
    moveAnnouncementSlide,
    homeSections,
    moveHomeSection,
    toggleHomeSection,
    resetHomeSections,
    videoBanners,
    updateVideoBanner,
    addVideoBanner,
    removeVideoBanner,
    moveVideoBanner,
    homeReels,
    updateHomeReelsSection,
    updateHomeReel,
    addHomeReel,
    removeHomeReel,
    moveHomeReel,
    homeShowcase,
    updateHomeShowcaseSection,
    updateHomeShowcaseRow,
    toggleHomeShowcaseProduct,
    addHomeShowcaseRow,
    removeHomeShowcaseRow,
    moveHomeShowcaseRow,
    handleLogoUpload,
    handleFaviconUpload,
    handleTabImageUpload,
    handleFieldFileUpload,
    handleSaveSettings,
    fieldLabel,
    helpText,
  }
}

type SettingsFormValue = ReturnType<typeof useSettingsFormState>

const SettingsFormContext = createContext<SettingsFormValue | null>(null)

export function SettingsFormProvider({ children }: { children: React.ReactNode }) {
  const value = useSettingsFormState()
  return <SettingsFormContext.Provider value={value}>{children}</SettingsFormContext.Provider>
}

export function useSettingsForm() {
  const ctx = useContext(SettingsFormContext)
  if (!ctx) throw new Error("useSettingsForm must be used inside <SettingsFormProvider>")
  return ctx
}
