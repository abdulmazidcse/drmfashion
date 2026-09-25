import Header from "@/components/HeaderClient"
import Footer from "@/components/Footer"
import type { Section, LandingTheme } from "@/lib/landing/sections"
import { whatsappLink } from "@/lib/landing/sections"
import { PADDING_CLASS, WIDTH_CLASS, sectionColors } from "@/components/landing/shared"
import type { LandingProduct, PaymentSettings, ShippingSettings } from "@/components/landing/sections/OrderRender"
import type { TaxSettings } from "@/lib/tax"

import HeroRender from "@/components/landing/sections/HeroRender"
import HeadlineRender from "@/components/landing/sections/HeadlineRender"
import TextRender from "@/components/landing/sections/TextRender"
import ImageRender from "@/components/landing/sections/ImageRender"
import GalleryRender from "@/components/landing/sections/GalleryRender"
import VideoRender from "@/components/landing/sections/VideoRender"
import FeaturesRender from "@/components/landing/sections/FeaturesRender"
import CountdownRender from "@/components/landing/sections/CountdownRender"
import PricingRender from "@/components/landing/sections/PricingRender"
import CtaRender from "@/components/landing/sections/CtaRender"
import FaqRender from "@/components/landing/sections/FaqRender"
import SpacerRender from "@/components/landing/sections/SpacerRender"
import HtmlRender from "@/components/landing/sections/HtmlRender"
import OrderRender from "@/components/landing/sections/OrderRender"

const BANGLA_FONT = "'Noto Sans Bengali', 'Hind Siliguri', system-ui, sans-serif"

interface LandingRendererProps {
  sections: Section[]
  theme: LandingTheme
  products: LandingProduct[]
  showLowStockNotice: boolean
  payments: PaymentSettings
  shipping: ShippingSettings
  tax: TaxSettings
}

export default function LandingRenderer({
  sections,
  theme,
  products,
  showLowStockNotice,
  payments,
  shipping,
  tax,
}: LandingRendererProps) {
  const wa = whatsappLink(theme.whatsapp)

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: theme.pageBg, color: theme.text, fontFamily: theme.font === "bangla" ? BANGLA_FONT : undefined }}
    >
      {theme.showHeader && <Header />}

      <main className="flex-1">
        {sections
          .filter((s) => !s.hidden)
          .map((s) => (
            <div key={s.id} style={sectionColors(s.style, theme)} className={PADDING_CLASS[s.style.padding]}>
              <div className={`mx-auto ${s.type === "order" ? "" : WIDTH_CLASS[theme.width]}`}>
                {s.type === "hero" && <HeroRender data={s.data} theme={theme} />}
                {s.type === "headline" && <HeadlineRender data={s.data} theme={theme} />}
                {s.type === "text" && <TextRender data={s.data} />}
                {s.type === "image" && <ImageRender data={s.data} />}
                {s.type === "gallery" && <GalleryRender data={s.data} />}
                {s.type === "video" && <VideoRender data={s.data} />}
                {s.type === "features" && <FeaturesRender data={s.data} theme={theme} />}
                {s.type === "countdown" && <CountdownRender id={s.id} data={s.data} theme={theme} />}
                {s.type === "pricing" && <PricingRender data={s.data} theme={theme} />}
                {s.type === "cta" && <CtaRender data={s.data} theme={theme} />}
                {s.type === "faq" && <FaqRender data={s.data} />}
                {s.type === "spacer" && <SpacerRender data={s.data} />}
                {s.type === "html" && <HtmlRender data={s.data} />}
                {s.type === "order" && (
                  <OrderRender
                    heading={s.data.heading}
                    subheading={s.data.subheading}
                    buttonText={s.data.buttonText}
                    products={products}
                    showLowStockNotice={showLowStockNotice}
                    payments={payments}
                    shipping={shipping}
                    tax={tax}
                  />
                )}
              </div>
            </div>
          ))}
      </main>

      {theme.stickyButton && (
        <a
          href="#order"
          className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center py-3.5 text-sm font-black uppercase tracking-widest sm:hidden"
          style={{ backgroundColor: theme.accent, color: theme.accentText }}
        >
          {theme.stickyButtonText}
        </a>
      )}

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105"
          style={{ backgroundColor: "#25D366", color: "#fff" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
          </svg>
        </a>
      )}

      {theme.showFooter && <Footer />}
    </div>
  )
}
