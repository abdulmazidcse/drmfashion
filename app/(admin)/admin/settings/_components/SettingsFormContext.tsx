"use client"

import { createContext, useContext, useEffect, useState } from "react"
import api from "@/lib/axios"
import Swal from "sweetalert2"

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
  const [brandSlogan, setBrandSlogan] = useState("Free shipping over ৳5,000 · 30-day easy returns")
  const [contactEmail, setContactEmail] = useState("support@store.local")

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
  const [googleSiteVerification, setGoogleSiteVerification] = useState("")
  const [facebookDomainVerification, setfacebookDomainVerification] = useState("")
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("")
  const [facebookPixelId, setfacebookPixelId] = useState("")
  const [customHeadScripts, setCustomHeadScripts] = useState("")

  // Homepage Hero Slider Settings
  const [activeEditTab, setActiveEditTab] = useState<"men" | "women">("men")
  const [slideRotationInterval, setSlideRotationInterval] = useState("7000")

  const [slideMenActive, setSlideMenActive] = useState(true)
  const [slideMenTitle, setSlideMenTitle] = useState("FINALLY, CLOTHES THAT FIT.")
  const [slideMenSubtitle, setSlideMenSubtitle] = useState("Designed specifically for men up to 7'1\". Proportions perfected for vertical precision.")
  const [slideMenImage, setSlideMenImage] = useState("/images/men_hero.png")
  const [slideMenVideo, setSlideMenVideo] = useState("/videos/men.mp4")
  const [slideMenVideoFallback, setSlideMenVideoFallback] = useState("/videos/fashion.mp4")
  const [slideMenButtonText, setSlideMenButtonText] = useState("Shop Men")
  const [slideMenShopLink, setSlideMenShopLink] = useState("/shop")
  const [slideMenTopBarTag, setSlideMenTopBarTag] = useState("New season")

  const [slideWomenActive, setSlideWomenActive] = useState(true)
  const [slideWomenTitle, setSlideWomenTitle] = useState("Elegance in every inch.")
  const [slideWomenSubtitle, setSlideWomenSubtitle] = useState("Contemporary womenswear with a considered drape and a precise length.")
  const [slideWomenImage, setSlideWomenImage] = useState("/images/olaszkolda-fashion-10318918.jpg")
  const [slideWomenVideo, setSlideWomenVideo] = useState("/videos/women.mp4")
  const [slideWomenVideoFallback, setSlideWomenVideoFallback] = useState("/videos/main-side-video.mp4")
  const [slideWomenButtonText, setSlideWomenButtonText] = useState("Shop Women")
  const [slideWomenShopLink, setSlideWomenShopLink] = useState("/shop")
  const [slideWomenTopBarTag, setSlideWomenTopBarTag] = useState("New season")

  // Homepage Community Tabs Settings
  const [activeCommunityEditTab, setActiveCommunityEditTab] = useState<"heights" | "fit" | "purpose">("heights")
  const [uploadingTabImage, setUploadingTabImage] = useState(false)

  // Homepage slide upload states
  const [uploadingMenImage, setUploadingMenImage] = useState(false)
  const [uploadingMenVideo, setUploadingMenVideo] = useState(false)
  const [uploadingMenVideoFallback, setUploadingMenVideoFallback] = useState(false)
  const [uploadingWomenImage, setUploadingWomenImage] = useState(false)
  const [uploadingWomenVideo, setUploadingWomenVideo] = useState(false)
  const [uploadingWomenVideoFallback, setUploadingWomenVideoFallback] = useState(false)

  const [tabHeightsLabel, setTabHeightsLabel] = useState("Our Fit")
  const [tabHeightsHeading, setTabHeightsHeading] = useState("Three lengths, one standard.")
  const [tabHeightsDescription, setTabHeightsDescription] = useState("Every style is graded in short, regular and long. Each pattern is adjusted vertically so the waist, elbows and knees land exactly where they should.")
  const [tabHeightsImage, setTabHeightsImage] = useState("/images/men_hero.png")
  const [tabHeightsCtaText, setTabHeightsCtaText] = useState("Explore the fit")
  const [tabHeightsCtaLink, setTabHeightsCtaLink] = useState("/about")

  const [tabFitLabel, setTabFitLabel] = useState("Our Fit")
  const [tabFitHeading, setTabFitHeading] = useState("Proportions, Perfected.")
  const [tabFitDescription, setTabFitDescription] = useState("Standard grading just adds width. We adjust every single measurement—sleeve length, torso length, shoulder width, and rise—to create a tailored fit that respects your height without being baggy.")
  const [tabFitImage, setTabFitImage] = useState("/images/pants.png")
  const [tabFitCtaText, setTabFitCtaText] = useState("Explore Fit Guide")
  const [tabFitCtaLink, setTabFitCtaLink] = useState("/about")

  const [tabPurposeLabel, setTabPurposeLabel] = useState("Our Purpose")
  const [tabPurposeHeading, setTabPurposeHeading] = useState("We're All About Community.")
  const [tabPurposeDescription, setTabPurposeDescription] = useState("We know the frustration of searching endlessly for clothing that fits—and coming up short. What started as one family's workshop in Dhaka has grown into a community with a shared standard for fit.")
  const [tabPurposeImage, setTabPurposeImage] = useState("/images/community.png")
  const [tabPurposeCtaText, setTabPurposeCtaText] = useState("Learn More")
  const [tabPurposeCtaLink, setTabPurposeCtaLink] = useState("/about")

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

          if (res.data.google_site_verification !== undefined) setGoogleSiteVerification(res.data.google_site_verification)
          if (res.data.facebook_domain_verification !== undefined) setfacebookDomainVerification(res.data.facebook_domain_verification)
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
        }
      } catch (error) {
        console.error("Failed to fetch settings", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // The product list is only ever read by the Flash Sale picker, so it is
  // fetched when that tab is first opened rather than on page load — it used to
  // block the settings spinner behind a second round trip nobody had asked for.
  useEffect(() => {
    if (activeSettingsTab !== "flashsale" || productsLoaded) return

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
        google_site_verification: googleSiteVerification,
        facebook_domain_verification: facebookDomainVerification,
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
          }
        })
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
    googleSiteVerification,
    setGoogleSiteVerification,
    facebookDomainVerification,
    setfacebookDomainVerification,
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
