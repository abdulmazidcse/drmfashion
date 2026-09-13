import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./css/design-system.css";

// No `weight` list on purpose: it is a variable font, so omitting it makes
// next/font fetch one variable woff2 covering the whole 100–900 range instead of
// a separate static file per weight. Every `font-light`…`font-black` utility
// still resolves — it just stops costing an extra render-blocking request each.
//
// One family for the whole app now. It was already the admin typeface
// (--font-admin) and is the face the Signature storefront design is drawn in,
// so the storefront's separate Outfit download bought nothing but a second
// render-blocking request. `preload` is back on for the same reason: it is on
// the critical path of every page rather than the dashboard's alone.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});
import { getStoreName, getSettings, getPublicSettings, baseCurrencyCode } from "@/lib/settings";
import { siteUrl } from "@/lib/siteUrl";
import { formatImageUrl } from "@/lib/utils";
import { absoluteImageUrl } from "@/lib/imageMeta";
import { getExchangeRates } from "@/lib/exchangeRates";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  const settings = await getSettings();
  const favicon = settings.brand_favicon_url || "/favicon.ico";
  const googleVerify = settings.google_site_verification;
  const fbVerify = settings.facebook_domain_verification;
  // Editable from Settings → SEO. The old hardcoded "<store> | Modern Apparel"
  // came to 26 characters, below the ~30 search engines show in full.
  const title =
    settings.seo_meta_title?.trim() ||
    `${storeName} | Tall Men's & Women's Clothing`;
  const description =
    settings.seo_meta_description?.trim() ||
    `High-end contemporary fashion tailored for modern individuals. Shop the latest collections of premium apparel at ${storeName}.`;

  /**
   * The picture Facebook, Instagram, WhatsApp and the rest show when a link is
   * shared. Without it a scraper falls back to the first <img> on the page —
   * which here is the header's 40px country flag, blown up into the blurry
   * banner that was appearing on every shared link that was not a product.
   *
   * Products, journal posts and CMS pages set their own; this is the default
   * everything else inherits. `openGraph.url` is deliberately left out: set
   * here it would be inherited, and every route would claim "/" as its address.
   */
  const configuredShare = absoluteImageUrl(
    formatImageUrl(settings.seo_share_image?.trim() || ""),
    siteUrl()
  );
  // Named here rather than left to the opengraph-image file convention, which
  // only covers the segment it sits in: without this /shop, /men, /women and
  // every category page shared with no picture at all.
  const shareImage = configuredShare
    ? { url: configuredShare }
    : {
        url: `${siteUrl()}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${storeName} share card`,
      };

  return {
    // Required for Next to resolve the relative canonical/OG URLs each page
    // sets; without it no canonical tag is emitted at all.
    //
    // Baked in at build time for statically rendered routes, so a build that
    // runs without NEXT_PUBLIC_APP_URL ships whatever this resolves to — which
    // is why production never falls back to localhost.
    metadataBase: new URL(siteUrl()),
    title,
    description,
    icons: {
      icon: favicon,
    },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: storeName,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
    verification: {
      google: googleVerify || undefined,
      other: fbVerify ? {
        "facebook-domain-verification": [fbVerify],
      } : undefined,
    },
  };
}

import { CurrencyProvider } from "@/providers/CurrencyProvider";
import { SettingsProvider } from "@/providers/SettingsProvider";
import AnnouncementBar from "@/components/AnnouncementBar";
import { ANNOUNCEMENT_BAR_SETTING_KEY, parseAnnouncementBar } from "@/lib/announcementBar";
import { ColorsProvider } from "@/providers/ColorsProvider";
import { organizationSchema, webSiteSchema } from "@/lib/structuredData";
import JsonLd from "@/components/JsonLd";
import { getStoreColors } from "@/lib/colors";
import PromoDrawer from "@/components/PromoDrawer";
import TawkChat from "@/components/TawkChat";
import PageViewTracker from "@/components/PageViewTracker";
import { Suspense } from "react";
import Script from "next/script";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Public variant: same cached read, plus the storefront defaults, since this
  // object is what SettingsProvider hands to client components.
  //
  // Rates come along for the ride: CurrencyProvider used to fetch them from a
  // third-party API in the browser before it could resolve any price. Redis-cached
  // for an hour and fail-soft, so this costs one upstream call per hour at most.
  // Colours ride along too: product cards resolve a swatch from a colour name,
  // and the table is small, shared by every visitor and Redis-cached.
  const [settings, exchangeRates, storeColors] = await Promise.all([
    getPublicSettings(),
    getExchangeRates(),
    getStoreColors(),
  ]);

  // Everything analytics runs through this one container (Admin → Settings →
  // SEO). Empty means no tracking is installed at all.
  const gtmId = settings.gtm_id?.trim();

  // Orders are stored in the base currency, so that is what GA4 must be told —
  // reporting whatever currency the visitor happened to be browsing in would
  // make revenue incomparable between sessions.
  const baseCurrency = baseCurrencyCode(settings);

  // Site-wide strip above the header. Parsed here rather than in the
  // component so a malformed stored value never reaches the browser.
  const announcementBar = parseAnnouncementBar(settings[ANNOUNCEMENT_BAR_SETTING_KEY]);

  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col font-sans`}>
        {gtmId && (
          <>
            {/* The array has to exist before anything can push to it. Product
                pages fire view_item on mount, which can beat the container
                script; queueing into a plain array means GTM picks those up
                when it loads instead of them being dropped. */}
            <Script id="datalayer-init" strategy="beforeInteractive">
              {`window.dataLayer = window.dataLayer || [];
                window.__STORE_CURRENCY__ = ${JSON.stringify(baseCurrency)};`}
            </Script>

            <Script id="gtm-container" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
            </Script>

            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>

            {/* Suspense keeps useSearchParams from making every page dynamic. */}
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
          </>
        )}

        {/* Custom head scripts from settings — injected into <head> by next/script (beforeInteractive) */}
        {settings.custom_head_scripts && (
          <Script id="custom-head-scripts" strategy="beforeInteractive">
            {`
              (function() {
                const temp = document.createElement('div');
                temp.innerHTML = \`${settings.custom_head_scripts.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                Array.from(temp.childNodes).forEach(node => {
                  if (node.nodeType === 1) {
                    if (node.tagName === 'SCRIPT') {
                      const script = document.createElement('script');
                      Array.from(node.attributes).forEach(attr => script.setAttribute(attr.name, attr.value));
                      script.innerHTML = node.innerHTML;
                      document.head.appendChild(script);
                    } else {
                      document.head.appendChild(node.cloneNode(true));
                    }
                  }
                });
              })();
            `}
          </Script>
        )}
        {/* Site-wide identity. Emitted once here rather than per page so the
            graph has a single Organization and WebSite node to reference. */}
        <JsonLd
          data={[
            organizationSchema(settings.brand_store_name || "TallPlus", settings.brand_logo_url),
            webSiteSchema(settings.brand_store_name || "TallPlus"),
          ]}
        />
        {announcementBar.active && announcementBar.slides.length > 0 && (
          <AnnouncementBar config={announcementBar} />
        )}

        <SettingsProvider initialSettings={settings}>
          <ColorsProvider colors={storeColors}>
            <CurrencyProvider rates={exchangeRates}>
              {children}
            </CurrencyProvider>
          </ColorsProvider>
          {/* Storefront-only: the drawer opts itself out of /admin, auth and checkout. */}
          <PromoDrawer />
          <TawkChat />
        </SettingsProvider>

        {/* Google Analytics — only when GTM is NOT in use. With a container
            installed, GA4 is configured inside GTM instead; loading gtag here as
            well would make every page_view count twice. */}
        {settings.google_analytics_id && !gtmId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.google_analytics_id}');
              `}
            </Script>
          </>
        )}

        {/* Facebook Pixel */}
        {settings.facebook_pixel_id && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.facebook_pixel_id}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
