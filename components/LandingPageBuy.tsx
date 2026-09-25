"use client";

import Image from "next/image";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import type { TaxSettings } from "@/lib/tax";
import OrderRender, {
  type LandingProduct,
  type PaymentSettings,
  type ShippingSettings,
} from "@/components/landing/sections/OrderRender";

interface LandingPageBuyProps {
  heading: string;
  subheading: string;
  bannerImage: string;
  products: LandingProduct[];
  showLowStockNotice: boolean;
  payments: PaymentSettings;
  shipping: ShippingSettings;
  tax: TaxSettings;
}

/**
 * The customer's own picks from a curated set of products, added straight into
 * the site's normal cart (`lib/cart.ts`) via the exact "Add to Cart" every
 * product page uses. The order form (delivery + payment, same fields as
 * /buy/[slug]'s QuickBuy) lives inline further down this same page instead of
 * behind a separate /checkout navigation or a view switch — products and
 * checkout are both always on the page together once something's in the cart.
 *
 * This is the fixed-template page for landing pages saved before the
 * section-based builder existed (see lib/landing/sections.ts's
 * legacySections/LEGACY_THEME). The actual product grid + checkout is
 * `OrderRender`, shared with the builder's "order" section so there's one
 * implementation of the bKash/Stripe/Square checkout, not two.
 */
export default function LandingPageBuy({
  heading,
  subheading,
  bannerImage,
  products,
  showLowStockNotice,
  payments,
  shipping,
  tax,
}: LandingPageBuyProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950">
      <Header />

      {bannerImage && (
        <div className="relative w-full aspect-[16/9] sm:aspect-[2.5/1] lg:aspect-[3/1] bg-zinc-100">
          <Image src={bannerImage} alt={heading} fill className="object-cover" priority />
        </div>
      )}

      <main className="flex-1">
        <OrderRender
          heading={heading}
          subheading={subheading}
          buttonText="Place Order"
          products={products}
          showLowStockNotice={showLowStockNotice}
          payments={payments}
          shipping={shipping}
          tax={tax}
        />
      </main>

      <Footer />
    </div>
  );
}
