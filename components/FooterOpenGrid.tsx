"use client";

import Link from "next/link";
import FooterEmailSignup from "./FooterEmailSignup";
import FooterSocialIcons from "./FooterSocialIcons";
import { useSettings } from "@/providers/SettingsProvider";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * Ruled Grid — the current storefront footer.
 *
 * A white card on a light ground. The signup opens as a full-width band with the
 * form inline on the right; a rule closes it, the four link groups sit in a ruled
 * grid below, and another rule opens the base. Column dividers are a step lighter
 * than the two horizontal rules so the grid reads as one field rather than four
 * boxes.
 *
 * Because the columns are divided by rules rather than by gutters, spacing here is
 * padding inside each cell — there is no grid `gap`, or the lines would float in
 * the middle of empty space instead of sitting between the columns.
 *
 * Presentational only — <Footer> resolves the categories and renders the
 * support bubble, so switching designs never touches data fetching.
 */
export default function FooterOpenGrid({ categories }: { categories: Category[] }) {
  const { storeName } = useSettings();
  const year = new Date().getFullYear();

  const colHeading = "text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-950 mb-5";
  const colLink = "text-[15px] text-zinc-500 hover:text-zinc-950 transition-colors";
  const legalLink = "text-[11px] uppercase tracking-[0.14em] text-zinc-400 hover:text-zinc-950 transition-colors";

  // As data, so the divider rules can be driven off the index instead of being
  // hand-written onto four separate blocks.
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
      ],
    },
    {
      title: "About Us",
      links: [
        { href: "/about", label: "About Our Brand" },
        { href: "/journal", label: "Journal" },
      ],
    },
  ];

  return (
    <footer className="w-full bg-white text-zinc-900 border-t border-zinc-200 z-10 relative">
      {/* Full-bleed: no card and no centred column. The content sits straight on
          the page surface and runs to the viewport edges; the top rule is what
          separates the footer from the page, a job the card border used to do. */}
      <div className="px-6 sm:px-8 lg:px-12">

          {/* Opening band — headline left, the whole form inline on the right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end gap-y-8 gap-x-12 pt-14 pb-12 border-b border-zinc-200">
            <h3 className="text-[28px] md:text-[34px] font-normal text-zinc-950 leading-[1.12] tracking-[-0.025em] max-w-[13em]">
              Sign up for our emails &amp; get 15% off your first order.
            </h3>

            <FooterEmailSignup variant="open" />
          </div>

          {/* Ruled link deck */}
          <div className="grid grid-cols-2 md:grid-cols-4">
            {columns.map((col, i) => (
              <div
                key={col.title}
                className={cn(
                  "py-10 border-zinc-100",
                  // Mobile: two columns, so a rule after every left-hand cell and
                  // under the first row.
                  i % 2 === 0 ? "pr-5 border-r" : "pl-5",
                  i < 2 && "border-b md:border-b-0",
                  // Desktop: a rule between all four, none after the last.
                  "md:px-8 md:border-r md:first:pl-0 md:last:pr-0 md:last:border-r-0"
                )}
              >
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 py-7 border-t border-zinc-200">
            <FooterSocialIcons variant="open" />
            <span className="text-[13px] text-zinc-400 text-center md:text-left">
              &copy; {year} {storeName}. All rights reserved.
              <span className="mx-2 text-zinc-300" aria-hidden="true">·</span>
              Developed by{" "}
              <a
                href="https://tallplus.co"
                className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950 transition-colors"
              >
                TallPlus
              </a>
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/pages/privacy-policy" className={legalLink}>Privacy Policy</Link>
              <Link href="/pages/terms-of-use" className={legalLink}>Terms of Use</Link>
              <Link href="/pages/accessibility-statement" className={legalLink}>Accessibility Statement</Link>
            </div>
          </div>

      </div>
    </footer>
  );
}
