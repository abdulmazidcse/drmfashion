"use client";

import Link from "next/link";
import FooterEmailSignup from "./FooterEmailSignup";
import FooterSocialIcons from "./FooterSocialIcons";
import { useSettings } from "@/providers/SettingsProvider";

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * Signature footer — a white slab closing the cream page.
 *
 * The signup band sits on top inside the same slab (not a separate section) so
 * the page ends on one shape rather than two, and the link deck below it is a
 * plain gutter grid: no rules, because the surrounding white already separates
 * it from the page.
 *
 * Presentational only — <Footer> resolves the categories and renders the support
 * bubble, so switching designs never touches data fetching.
 */
export default function FooterSignature({ categories }: { categories: Category[] }) {
  const { storeName } = useSettings();
  const year = new Date().getFullYear();

  const colHeading = "text-[12px] font-extrabold uppercase tracking-[0.13em] mb-4";
  const colLink = "text-[14px] text-soft hover:text-brand-700 transition-colors";
  const legalLink = "text-[13px] text-soft hover:text-brand-700 transition-colors";

  const columns = [
    {
      title: "Shop",
      links: [
        ...categories.slice(0, 4).map(c => ({ href: `/category/${c.slug}`, label: c.name })),
        { href: "/shop", label: "All Products" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/pages/help-center", label: "Help Center" },
        { href: "/pages/contact-support", label: "Contact Us" },
        { href: "/track-order", label: "Track My Order" },
        { href: "/pages/returns-exchanges", label: "Returns & Exchanges" },
        { href: "/pages/shipping-policy", label: "Shipping" },
        { href: "/pages/size-charts", label: "Size Charts" },
      ],
    },
    {
      title: "Discover",
      links: [
        { href: "/account", label: "Account" },
        { href: "/wishlist", label: "Wishlist" },
        { href: "/cart", label: "Cart" },
        { href: "/gift-cards", label: "Gift Cards" },
      ],
    },
    {
      title: "About Us",
      links: [
        { href: "/about", label: "About Our Brand" },
        { href: "/journal", label: "Journal" },
        { href: "/pages/privacy-policy", label: "Privacy Policy" },
      ],
    },
  ];

  return (
    <footer className="w-full bg-surface border-t border-line mt-6">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-7">

        {/* Signup band */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-y-8 gap-x-14 pt-14 pb-12 border-b border-line">
          <h3 className="text-[28px] md:text-[34px] font-extrabold leading-[1.12] max-w-[15ch]">
            Sign up for our emails &amp; get 15% off your first order.
          </h3>

          <FooterEmailSignup variant="open" />
        </div>

        {/* Link deck */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10 py-12">
          <div className="col-span-2 md:col-span-1">
            <span className="text-[17px] font-extrabold tracking-tight">{storeName}</span>
            <p className="text-soft text-[14px] leading-relaxed mt-3 max-w-[30ch]">
              Premium apparel with a tailored fit. Designed and made in Dhaka.
            </p>
            <div className="mt-5">
              <FooterSocialIcons variant="open" />
            </div>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <h4 className={colHeading}>{col.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(link => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className={colLink}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Base */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-7 border-t border-line">
          <span className="text-[13px] text-soft">
            &copy; {year} {storeName}. All rights reserved.
            <span className="mx-2 text-line" aria-hidden="true">·</span>
            Developed by{" "}
            <a
              href="https://zayantit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand-700 hover:text-brand-600 transition-colors"
            >
              Jayant IT
            </a>
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/pages/privacy-policy" className={legalLink}>Privacy Policy</Link>
            <Link href="/pages/terms-of-use" className={legalLink}>Terms of Use</Link>
            <Link href="/pages/accessibility-statement" className={legalLink}>Accessibility</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
