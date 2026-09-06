import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ViewItemListTracker from "@/components/ViewItemListTracker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromoBanners from "@/components/PromoBanners";

import { getStoreName } from "@/lib/settings";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { footerCategories } from "@/lib/utils";
import { getGenderCategory } from "@/lib/categoryTree";

export async function generateMetadata() {
  const storeName = await getStoreName();
  return {
    title: `Women | ${storeName} — Tall Women's Fashion`,
    description: `Shop tall women's clothing at ${storeName}. Tops, dresses, leggings, jeans, and activewear designed for women 5'9" – 6'6".`,
    alternates: { canonical: "/women" },
  };
}



export default async function WomenPage() {
  // Three independent reads — they were three sequential awaits.
  // `categories` feeds <Footer> and nothing else: it used to pull every root
  // category's children *and the id of every published product under each* to
  // render four links.
  const [categories, womenCategory] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    getGenderCategory("women"),
  ]);

  // Products have to wait on the category tree — they are scoped to it.
  const womenCategoryIds = womenCategory?.categoryIds ?? [];
  const productScope = {
    published: true,
    deletedAt: null,
    categoryId: { in: womenCategoryIds },
  };

  const products = womenCategoryIds.length
    ? await prisma.product.findMany({
        where: { ...productScope, featured: true },
        select: PRODUCT_CARD_SELECT,
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : [];

  const allProducts = products.length === 0 && womenCategoryIds.length
    ? await prisma.product.findMany({
        where: productScope,
        select: PRODUCT_CARD_SELECT,
        orderBy: { createdAt: "desc" },
        take: 8,
      })
    : products;

  const collections = (womenCategory?.collections || []).slice(0, 4);
  const heroImage = womenCategory?.image || "";

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">
      <Header />

      {/* ── HERO ── */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex items-end overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt="Women's Collection"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-[1600px] mx-auto px-8 pb-16 w-full">
          <span className="text-[10px] font-bold tracking-[0.35em] uppercase text-zinc-300 block mb-3">
            Designed for Height · 5&apos;9&quot; – 6&apos;6&quot;
          </span>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight uppercase text-white leading-none mb-6">
            Women
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base font-light max-w-md mb-8">
            Premium fashion built for tall women. Every inseam, every silhouette — perfectly proportioned.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-white text-zinc-950 px-8 py-4 text-[11px] font-black tracking-[0.2em] uppercase hover:bg-zinc-100 transition-colors"
          >
            Shop All Women&apos;s <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PromoBanners position="women_top" />

      {/* ── BREADCRUMB ── */}
      <div className="max-w-[1600px] mx-auto px-8 py-5 w-full">
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-800 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-700">Women</span>
        </div>
      </div>

      {/* ── COLLECTIONS GRID ── */}
      <section className="max-w-[1600px] mx-auto px-8 pb-20 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-1">Explore</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Shop by Category</h2>
          </div>
          <Link href="/shop" className="hidden sm:flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-zinc-500 hover:text-zinc-950 transition-colors">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/category/${col.slug}`}
              className="group relative aspect-[3/4] overflow-hidden bg-zinc-100 block"
            >
              {col.image && (
                <img
                  src={col.image}
                  alt={col.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              )}
              <div className={`absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent`} />
              <div className="absolute bottom-0 left-0 p-5">
                <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-300 block mb-1">
                  Collection
                </span>
                <span className="text-white font-black text-lg uppercase leading-tight block">
                  {col.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/70 mt-2 group-hover:text-white transition-colors">
                  Shop Now <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PROMO BANNER ── */}
      <section className="bg-zinc-950 text-white py-16 px-8 text-center mb-20">
        <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-zinc-400 mb-3">Limited Time</p>
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4">
          All Tops — 25% Off
        </h2>
        <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          Shop our full range of tops, now at 25% off. Built tall, made premium.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-3 border border-white text-white px-8 py-4 text-[11px] font-black tracking-[0.2em] uppercase hover:bg-white hover:text-zinc-950 transition-colors"
        >
          Shop the Sale <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="max-w-[1600px] mx-auto px-8 pb-24 w-full">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-1">Curated for You</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Featured Pieces</h2>
          </div>
          <Link href="/shop" className="hidden sm:flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-zinc-500 hover:text-zinc-950 transition-colors">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {allProducts.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-sm">No products yet. Check back soon.</p>
          </div>
        ) : (
          <>
          <ViewItemListTracker listId="women" listName="Women" products={allProducts} />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {allProducts.map((product, idx) => (
              // First grid row is above the fold — opt it out of lazy loading.
              <ProductCard key={product.id} product={product} idPrefix="women" listId="women" listName="Women" priority={idx < 4} />
            ))}
          </div>
          </>
        )}

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-zinc-950 text-white px-10 py-4 text-[11px] font-black tracking-[0.2em] uppercase hover:bg-zinc-800 transition-colors"
          >
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer categories={footerCategories(categories)} />
    </div>
  );
}

