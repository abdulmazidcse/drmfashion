import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ViewItemListTracker from "@/components/ViewItemListTracker";
import { getStoreName } from "@/lib/settings";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { PRODUCT_GRID_COLS } from "@/lib/collectionView";
import { upcomingWhere } from "@/lib/upcoming";
import { footerCategories } from "@/lib/utils";

/**
 * /upcoming — every product marked "Upcoming" in admin whose launch date (if
 * any) has not passed yet. They are shown with a Coming Soon badge and cannot
 * be added to the cart; once launched they drop off this page and appear in
 * the shop by themselves.
 */

// Launch dates are compared with "now", so the page must not be frozen at build.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  return {
    title: `Coming Soon | ${storeName}`,
    description: `Upcoming products at ${storeName} — take a first look before they launch.`,
    alternates: { canonical: "/upcoming" },
  };
}

export default async function UpcomingPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 4,
    }),
    prisma.product.findMany({
      where: { published: true, deletedAt: null, ...upcomingWhere() },
      select: PRODUCT_CARD_SELECT,
      orderBy: [{ launchDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    }),
  ]);

  const listId = "upcoming";

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-950 antialiased">
      <Header />

      <section className="w-full bg-zinc-950 text-white">
        <div className="mx-auto max-w-(--site-max) px-6 py-12 sm:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <Link href="/" className="transition-colors hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-300">Coming Soon</span>
          </nav>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">Coming Soon</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400 sm:text-[15px]">
            New pieces on the way. Take a first look now — they&apos;ll be available to order as soon as they launch.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-(--site-max) flex-1 px-4 py-12 sm:px-8">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-400">Nothing announced right now — check back soon.</p>
            <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-full bg-zinc-950 px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-zinc-800">
              Shop current collection
            </Link>
          </div>
        ) : (
          <>
            <ViewItemListTracker listId={listId} listName="Coming Soon" products={products} />
            <div className={`grid ${PRODUCT_GRID_COLS} gap-4 sm:gap-6`}>
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  idPrefix={listId}
                  listId={listId}
                  listName="Coming Soon"
                  priority={idx < 4}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <Footer categories={footerCategories(categories)} />
    </div>
  );
}
