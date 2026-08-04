"use client";

import Link from "next/link";
import FooterEmailSignup from "./FooterEmailSignup";
import FooterSocialIcons from "./FooterSocialIcons";

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * The original storefront footer, kept intact for comparison.
 *
 * White ground, signup on the left, a 2×2 block of link groups on the right,
 * social icons and legal links along the bottom.
 *
 * Presentational only — <Footer> resolves the categories and renders the
 * support bubble, so switching designs never touches data fetching.
 */
export default function FooterClassic({ categories }: { categories: Category[] }) {
  return (
    <footer className="w-full bg-white text-foreground pt-16 pb-12 z-10 relative">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">

          {/* Brand column */}
          <div className="flex flex-col pr-0 md:pr-12">
            <FooterEmailSignup variant="classic" />
          </div>

          {/* Menu columns — 2x2 grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-12">

            {/* Support */}
            <div>
              <h4 className="text-lg font-bold text-foreground mb-2.5">Support</h4>
              <ul className="text-[15px] font-medium text-soft">
                <li><Link href="/pages/help-center" className="hover:text-brand-700 transition-colors">Help Center</Link></li>
                <li><Link href="/pages/contact-support" className="hover:text-brand-700 transition-colors">Contact Us</Link></li>
                <li><Link href="/track-order" className="hover:text-brand-700 transition-colors">Track My Order</Link></li>
                <li><Link href="/pages/returns-exchanges" className="hover:text-brand-700 transition-colors">Returns &amp; Exchanges</Link></li>
                <li><Link href="/pages/shipping-policy" className="hover:text-brand-700 transition-colors">Shipping</Link></li>
                <li><Link href="/pages/size-charts" className="hover:text-brand-700 transition-colors">Size Charts</Link></li>
              </ul>
            </div>

            {/* Discover */}
            <div>
              <h4 className="text-lg font-bold text-foreground mb-2.5">Discover</h4>
              <ul className="text-[15px] font-medium text-soft">
                <li><Link href="/account" className="hover:text-brand-700 transition-colors">Account</Link></li>
                <li><Link href="/wishlist" className="hover:text-brand-700 transition-colors">Wishlist</Link></li>
                <li><Link href="/cart" className="hover:text-brand-700 transition-colors">Cart</Link></li>
              </ul>
            </div>

            {/* About Us */}
            <div>
              <h4 className="text-lg font-bold text-foreground mb-2.5">About Us</h4>
              <ul className="text-[15px] font-medium text-soft">
                <li><Link href="/about" className="hover:text-brand-700 transition-colors">About Our Brand</Link></li>
                <li><Link href="/journal" className="hover:text-brand-700 transition-colors">Journal</Link></li>
              </ul>
            </div>

            {/* Shop */}
            <div>
              <h4 className="text-lg font-bold text-foreground mb-2.5">Shop</h4>
              <ul className="text-[15px] font-medium text-soft">
                {categories.slice(0, 4).map(c => (
                  <li key={c.id}>
                    <Link href={`/category/${c.slug}`} className="hover:text-brand-700 transition-colors">{c.name}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/shop" className="hover:text-brand-700 transition-colors">All Products</Link>
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Copyright section */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-faint gap-4">
          <FooterSocialIcons variant="classic" />
          <div className="flex space-x-6">
            <Link href="/pages/privacy-policy" className="text-[13px] hover:text-brand-700 transition-colors uppercase">Privacy Policy</Link>
            <Link href="/pages/terms-of-use" className="text-[13px] hover:text-brand-700 transition-colors uppercase">Terms of Use</Link>
            <Link href="/pages/accessibility-statement" className="text-[13px] hover:text-brand-700 transition-colors uppercase">Accessibility Statement</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
