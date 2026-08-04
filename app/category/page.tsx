import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, ArrowRight, Sparkles, Tag, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getStoreName } from "@/lib/settings";
import { footerCategories } from "@/lib/utils";

export async function generateMetadata() {
  const storeName = await getStoreName();
  return {
    title: `Designer Collections & Categories | Luxury ${storeName}`,
    description: "Browse our handpicked collections of luxury outerwear, premium dresses, designer accessories, and elite footwear.",
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
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* HERO BANNER */}
      <section className="relative w-full h-[320px] sm:h-[400px] flex items-center justify-center overflow-hidden bg-brand-ink">
        <div className="absolute inset-0 w-full h-full bg-brand-ink-soft" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
        <div className="relative z-10 text-center text-white px-6 max-w-2xl">
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-faint mb-3 block">
            World of Luxury
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase mb-4 leading-none text-white">
            Our Collections
          </h1>
          <p className="text-white/80 text-sm sm:text-base font-light leading-relaxed max-w-lg mx-auto">
            Discover curated luxury fashion, premium textiles, and signature seasonal pieces designed to elevate your wardrobe.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
        {/* BREADCRUMB */}
        <div className="text-[10px] text-faint font-bold uppercase tracking-[0.14em] mb-10 flex items-center gap-2">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-soft">Categories</span>
        </div>

        {rootCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-6">
              <ShoppingBag className="w-7 h-7 text-faint" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Categories Found</h3>
            <p className="text-faint text-sm font-light mb-6">We are setting up our luxury catalog right now.</p>
            <Link href="/" className="bg-brand-600 rounded-full text-white px-8 py-3 text-xs font-bold tracking-[0.14em] uppercase hover:bg-brand-700 transition-colors">
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
                  className={`flex flex-col lg:flex-row gap-8 lg:gap-12 items-center border-b border-line pb-16 last:border-0 last:pb-0 ${
                    isEven ? "" : "lg:flex-row-reverse"
                  }`}
                >
                  {/* Category Image Card */}
                  <div className="w-full lg:w-1/2 group relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] overflow-hidden bg-line shadow-sm border border-line">
                    {heroImage && (
                      <img
                        src={heroImage}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Floating Product Count Badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-foreground">
                        {totalProducts} {totalProducts === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                  </div>

                  {/* Category Details & Subcategories */}
                  <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-faint">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold tracking-[0.14em] uppercase">Collection</span>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-foreground leading-none">
                        {category.name}
                      </h2>
                    </div>

                    <p className="text-soft text-sm font-light leading-relaxed">
                      Explore the meticulously designed range of {category.name.toLowerCase()} featuring elite craftsmanship, dynamic styling, and custom tailoring for a premium fit.
                    </p>

                    {/* Subcategories Grid/List */}
                    {category.children.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-faint">
                          Refined Sub-Collections
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {category.children.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/category/${category.slug}?sub=${sub.slug}`}
                              className="text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-2 border border-line bg-cream hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all rounded-full"
                            >
                              {sub.name}
                              <span className="ml-1.5 text-faint group-hover:text-white/80 font-normal">
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
                        className="inline-flex items-center gap-2 bg-brand-600 rounded-full text-white px-8 py-3.5 text-xs font-bold tracking-[0.14em] uppercase hover:bg-brand-700 transition-colors shadow-md group"
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
      <section className="w-full py-16 bg-cream border-t border-line">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <Sparkles className="w-6 h-6 mx-auto text-soft" />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase text-foreground">
            Uncompromising Excellence
          </h2>
          <p className="text-soft text-xs sm:text-sm font-light leading-relaxed max-w-xl mx-auto">
            Every piece curated across our collections adheres to strict standards of material quality, ethical manufacturing, and high-end design aesthetics to ensure your ultimate satisfaction.
          </p>
        </div>
      </section>

      <Footer categories={footerCategories(rootCategories)} />
    </div>
  );
}

