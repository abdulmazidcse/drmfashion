"use client";

import Link from "next/link";
import Image from "next/image";
import FooterEmailSignup from "./FooterEmailSignup";
import FooterSocialIcons from "./FooterSocialIcons";
import { useSettings } from "@/providers/SettingsProvider";

interface Category {
  id: string;
  name: string;
  slug: string;
}

/**
 * Signature — the footer for the copper/aqua storefront.
 *
 * Two blocks on the cream ground: the newsletter as its own rounded card, then
 * a white slab holding the brand column and four link columns.
 *
 * The signup lives here rather than in a section of its own on the homepage.
 * In the reference it is the last card before the footer, and putting it inside
 * <footer> renders identically — a card on cream, directly above the slab —
 * while keeping it on every page instead of the homepage alone, which is where
 * the Open Grid footer already had it.
 *
 * Presentational only: <Footer> resolves the categories and renders the support
 * bubble, so switching designs never touches data fetching.
 */
export default function FooterSignature({ categories }: { categories: Category[] }) {
  const { storeName, settings } = useSettings();
  const year = new Date().getFullYear();

  const logoSrc = settings["brand_logo_url"] || "/logo.svg";
  const logoIsSvg = /\.svg(\?|$)/i.test(logoSrc);

  const tagline =
    settings["brand_slogan"]?.trim() ||
    `Tailored apparel for tall frames, from ${storeName}.`;

  // As data so the four columns stay one map rather than four near-identical
  // blocks. "Shop" is the only one that depends on the database.
  const columns = [
    {
      title: "Shop",
      links: [
        ...categories.slice(0, 4).map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
        { href: "/shop", label: "All Products" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/pages/help-center", label: "Help Centre" },
        { href: "/track-order", label: "Track Order" },
        { href: "/pages/returns-exchanges", label: "Returns" },
        { href: "/pages/size-charts", label: "Size Charts" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About Us" },
        { href: "/journal", label: "Journal" },
        { href: "/pages/contact-support", label: "Contact" },
        { href: "/reviews", label: "Reviews" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/pages/privacy-policy", label: "Privacy" },
        { href: "/pages/terms-of-use", label: "Terms" },
        { href: "/pages/shipping-policy", label: "Shipping" },
        { href: "/pages/accessibility-statement", label: "Accessibility" },
      ],
    },
  ];

  return (
    <>
      {/* ── Newsletter card ── */}
      <section className="bg-sig-cream pb-[70px] pt-2">
        <div className="sig-wrap">
          <div className="grid items-center gap-11 rounded-[26px] border border-sig-line bg-sig-card p-7 shadow-sig sm:p-14 lg:grid-cols-2 lg:rounded-sig-lg">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sig-copper-600">
                Stay in the loop
              </span>
              <h2 className="my-3 text-[28px] font-extrabold leading-[1.12] tracking-[-0.03em] text-sig-ink sm:text-[34px]">
                Get 15% off your first order.
              </h2>
              <p className="text-[15px] leading-[1.7] text-sig-soft">
                Early access to drops, restock alerts and fit guides. One email a week,
                unsubscribe whenever.
              </p>
            </div>

            <div>
              <FooterEmailSignup variant="signature" />
              <small className="mt-3.5 block text-[12.5px] text-sig-soft/80">
                No spam, ever. We never share your details.
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* ── Link slab ── */}
      <footer className="relative z-10 border-t border-sig-line bg-sig-card pb-6 pt-14">
        <div className="sig-wrap">
          <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div>
              <Link href="/" className="inline-block transition-opacity hover:opacity-90">
                <Image
                  src={logoSrc}
                  alt={storeName}
                  width={144}
                  height={48}
                  className="h-11 w-auto max-w-[9rem] object-contain"
                  unoptimized={logoIsSvg}
                />
              </Link>
              <p className="mt-[18px] max-w-[32ch] text-sm leading-[1.75] text-sig-soft">
                {tagline}
              </p>
              <div className="mt-5">
                <FooterSocialIcons variant="signature" />
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.title}>
                <h6 className="mb-4 text-xs font-extrabold uppercase tracking-[0.13em] text-sig-ink">
                  {col.title}
                </h6>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-sig-soft transition-colors hover:text-sig-copper-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-11 flex flex-wrap justify-between gap-4 border-t border-sig-line pt-5.5 text-[13px] text-sig-soft">
            <span>
              &copy; {year} {storeName}. All rights reserved.
            </span>
            <span>
              Developed by{" "}
              <a
                href="https://tallplus.co"
                className="font-semibold text-sig-copper-700 underline decoration-sig-copper-200 underline-offset-4 transition-colors hover:decoration-sig-copper-700"
              >
                TallPlus
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
