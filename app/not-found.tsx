import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, PackageSearch, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { footerCategories } from "@/lib/utils";

/**
 * Site-wide 404, in the storefront's own design (cream ground, white card,
 * copper call to action) instead of Next's bare black-and-white default — so a
 * mistyped or retired link (e.g. the old /about pages) still lands somewhere
 * that looks like the shop and offers a way back in.
 */

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default async function NotFound() {
  // Root categories feed both the footer and the "shop by category" chips.
  // Fail-soft: a database hiccup must not turn a 404 into a 500.
  const categories = await prisma.category
    .findMany({
      where: { parentId: null, deletedAt: null, slug: { not: "gift-cards" } },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 6,
    })
    .catch(() => []);

  const helpLinks = [
    { href: "/shop", label: "Shop all products", icon: ShoppingBag },
    { href: "/track-order", label: "Track an order", icon: PackageSearch },
    { href: "/pages/contact-support", label: "Contact support", icon: LifeBuoy },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-sig-cream font-sans text-sig-ink antialiased">
      <Header />

      <main className="flex-1">
        <section className="sig-wrap py-10 sm:py-16">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[26px] bg-sig-card px-6 py-12 text-center shadow-sig sm:px-14 sm:py-16 lg:rounded-sig-lg">
            <span className="inline-flex items-center gap-2 rounded-full bg-sig-aqua-50 px-[15px] py-2 text-xs font-bold tracking-[0.02em] text-sig-aqua-700">
              ◆ Error 404
            </span>

            <p
              aria-hidden
              className="mt-6 text-[96px] font-extrabold leading-none tracking-[-0.06em] text-sig-copper-600 sm:text-[140px]"
            >
              404
            </p>

            <h1 className="mt-4 text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[38px]">
              We couldn&apos;t find that page.
            </h1>
            <p className="mx-auto mt-4 max-w-[46ch] text-[14px] leading-[1.7] text-sig-soft sm:text-base">
              The link may be old, or the page may have moved. Head back to the homepage or pick up
              where you left off below.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-sig-copper-600 px-[30px] py-[15px] text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(160,99,47,0.85)] transition-all duration-200 hover:-translate-y-px hover:bg-sig-copper-500"
              >
                Back to Home <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-sig-line bg-sig-card px-[30px] py-[15px] text-sm font-bold text-sig-ink transition-colors hover:border-sig-copper-400"
              >
                Continue Shopping
              </Link>
            </div>

            {categories.length > 0 && (
              <div className="mt-10 border-t border-sig-line pt-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-sig-soft">Shop by category</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/category/${c.slug}`}
                      className="rounded-full border border-sig-line bg-sig-cream px-4 py-2 text-[13px] font-semibold text-sig-ink transition-colors hover:border-sig-copper-400 hover:bg-sig-copper-50"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {helpLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-sig border border-sig-line bg-sig-card px-5 py-4 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-sig-copper-200 hover:shadow-sig"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sig-copper-50 text-sig-copper-700">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
                <ArrowRight className="ml-auto h-4 w-4 text-sig-soft transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer categories={footerCategories(categories.slice(0, 4))} />
    </div>
  );
}
