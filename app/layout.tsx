import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./css/design-system.css";

// One family for the whole site now: the Signature storefront and the admin both
// set Plus Jakarta Sans, so the second face Outfit used to supply is gone and
// with it one render-blocking font request on every storefront page.
//
// No `weight` list on purpose: it's a variable font, so omitting it fetches one
// woff2 covering 100–900 rather than a static file per weight. Every
// `font-light`…`font-extrabold` utility still resolves.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});
import { getStoreName, getSettings, getPublicSettings } from "@/lib/settings";
import { getExchangeRates } from "@/lib/exchangeRates";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  const settings = await getSettings();
  const favicon = settings.brand_favicon_url || "/favicon.ico";
  const googleVerify = settings.google_site_verification;
  const fbVerify = settings.facebook_domain_verification;
  return {
    title: `${storeName} | Modern Apparel`,
    description: `High-end contemporary fashion tailored for modern individuals. Shop the latest collections of premium apparel at ${storeName}.`,
    icons: {
      icon: favicon,
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
import PromoDrawer from "@/components/PromoDrawer";
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
  const [settings, exchangeRates] = await Promise.all([
    getPublicSettings(),
    getExchangeRates(),
  ]);

  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className={`min-h-full flex flex-col font-sans`}>
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
        <SettingsProvider initialSettings={settings}>
          <CurrencyProvider rates={exchangeRates}>
            {children}
          </CurrencyProvider>
          {/* Storefront-only: the drawer opts itself out of /admin, auth and checkout. */}
          <PromoDrawer />
        </SettingsProvider>

        {/* Google Analytics */}
        {settings.google_analytics_id && (
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
