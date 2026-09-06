import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, ArrowRight, Sparkles, Tag, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getStoreName } from "@/lib/settings";
import { footerCategories } from "@/lib/utils";
import { categoryImageAlt, categoryImageCaption } from "@/lib/imageMeta";

export async function generateMetadata() {
  const storeName = await getStoreName();
  return {
    title: `Designer Collections & Categories | Luxury ${storeName}`,
    description: "Browse our handpicked collections of luxury outerwear, premium dresses, designer accessories, and elite footwear.",
    alternates: { canonical: "/category" },
  };
}

export default async function CategoriesPage() {
  // The page only ever renders counts, so ask the database for counts. This used
  // to fetch the id of every published product on every root category *and*
  // every child, then call `.length` on the arrays.
  const rootCategories = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
      imageAlt: true,
      imageCaption: true,
      description: true,
      _count: { select: { products: { where: { published: true } } } },
      children: {
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: { where: { published: true } } } },
        },
      },
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">
      <Header />

      {/* HERO BANNER */}
      <section className="relative w-full h-[320px] sm:h-[400px] flex items-center justify-center overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 w-full h-full bg-zinc-900" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
        <div className="relative z-10 text-center text-white px-6 max-w-2xl">
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-zinc-300 mb-3 block">
            World of Luxury
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase mb-4 leading-none text-white">
            Our Collections
          </h1>
          <p className="text-zinc-200 text-sm sm:text-base font-light leading-relaxed max-w-lg mx-auto">
            Discover curated luxury fashion, premium textiles, and signature seasonal pieces designed to elevate your wardrobe.
          </p>
        </div>
      </section>

      <main className="max-w-[1600px] mx-auto px-6 py-12 w-full flex-1">
        {/* BREADCRUMB */}
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-10 flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-800 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-zinc-800 transition-colors">Shop</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-700">Categories</span>
        </div>

        {rootCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
              <ShoppingBag className="w-7 h-7 text-zinc-450" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Categories Found</h3>
            <p className="text-zinc-400 text-sm font-light mb-6">We are setting up our luxury catalog right now.</p>
            <Link href="/" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
              Return Home
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {rootCategories.map((category, index) => {
              const heroImage = category.image || "";

              // Calculate total products in this hierarchy
              const directProductCount = category._count.products;
              const childProductCount = category.children.reduce(
                (sum, child) => sum + child._count.products,
                0
              );
              const totalProducts = directProductCount + childProductCount;

              // Alternating layout for high-end boutique feel
              const isEven = index % 2 === 0;

              return (
                <div
                  key={category.id}
                  className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-center border-b border-zinc-100 pb-16 last:border-0 last:pb-0 ${
                    isEven ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Category Image Card — a <figure> so an editor's caption
                      has somewhere to sit; the card keeps its own aspect box
                      inside, since the caption must not eat into the picture. */}
                  <figure className="w-full lg:w-1/2">
                  <div className="group relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] overflow-hidden bg-zinc-150 shadow-sm border border-zinc-100">
                    {heroImage && (
                      <img
                        src={heroImage}
                        alt={categoryImageAlt({
                          custom: category.imageAlt,
                          name: category.name,
                          kind: "tile",
                        })}
                        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Floating Product Count Badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-950">
                        {totalProducts} {totalProducts === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                  </div>
                  {categoryImageCaption(category.imageCaption) && (
                    <figcaption className="mt-3 text-xs font-light leading-relaxed text-zinc-500">
                      {categoryImageCaption(category.imageCaption)}
                    </figcaption>
                  )}
                  </figure>

                  {/* Category Details & Subcategories */}
                  <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold tracking-widest uppercase">Collection</span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-zinc-900 leading-none">
                        {category.name}
                      </h2>
                    </div>

                    <p className="text-zinc-500 text-sm font-light leading-relaxed">
                      Explore the meticulously designed range of {category.name.toLowerCase()} featuring elite craftsmanship, dynamic styling, and custom tailoring for a premium fit.
                    </p>

                    {/* Subcategories Grid/List */}
                    {category.children.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Refined Sub-Collections
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {category.children.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/category/${category.slug}?sub=${sub.slug}`}
                              className="text-[10px] font-bold tracking-widest uppercase px-4 py-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all rounded-sm"
                            >
                              {sub.name}
                              <span className="ml-1.5 text-zinc-400 group-hover:text-zinc-200 font-normal">
                                ({sub._count.products})
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main CTA */}
                    <div className="pt-4">
                      <Link
                        href={`/category/${category.slug}`}
                        className="inline-flex items-center gap-2 bg-zinc-950 text-white px-8 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors shadow-md group"
                      >
                        Explore All {category.name}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* BRAND VALUES / STATEMENT */}
      <section className="w-full py-16 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <Sparkles className="w-6 h-6 mx-auto text-zinc-700" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase text-zinc-900">
            Uncompromising Excellence
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-light leading-relaxed max-w-xl mx-auto">
            Every piece curated across our collections adheres to strict standards of material quality, ethical manufacturing, and high-end design aesthetics to ensure your ultimate satisfaction.
          </p>
        </div>
      </section>

      <Footer categories={footerCategories(rootCategories)} />
    </div>
  );
}

