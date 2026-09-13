import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromoBanners from "@/components/PromoBanners";
import ShopProductList from "@/components/ShopProductList";
import { productSearchFilter } from "@/lib/search";
import { getStoreName } from "@/lib/settings";
import { swatchStyle } from "@/lib/colorStyle";
import { fetchWithCache } from "@/lib/redis";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { footerCategories } from "@/lib/utils";

/** Sidebar tree and the colour/size filter lists — catalogue shape, not per-visitor. */
const SHOP_FACETS_TTL = 300;


const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "bestseller", label: "Best Sellers" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "featured", label: "Featured" },
];

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;
  const storeName = await getStoreName();
  
  if (categorySlug) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (category) {
      return {
        title: `Shop ${category.name} | ${storeName}`,
        description: `Explore our premium collection of ${category.name}. High-end contemporary fashion tailored for modern individuals.`,
        // Filter/sort params produce endless URL variants of the same listing,
        // so every one of them points back at the bare category listing.
        alternates: { canonical: `/shop?category=${category.slug}` },
      };
    }
  }

  return {
    title: `Shop All Collections | ${storeName}`,
    description: `Explore the full ${storeName} collection. High-end contemporary fashion tailored for modern individuals.`,
    alternates: { canonical: "/shop" },
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams;
  const categorySlug = typeof sp.category === "string" ? sp.category : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const query = typeof sp.query === "string" ? sp.query : "";
  const size = typeof sp.size === "string" ? sp.size : undefined;
  const color = typeof sp.color === "string" ? sp.color : undefined;
  const minPrice = typeof sp.minPrice === "string" && !isNaN(Number(sp.minPrice)) ? Number(sp.minPrice) : undefined;
  const maxPrice = typeof sp.maxPrice === "string" && !isNaN(Number(sp.maxPrice)) ? Number(sp.maxPrice) : undefined;
  const sale = typeof sp.sale === "string" ? sp.sale : undefined;

  // The sidebar (category tree + counts), the swatch/size filters and the active
  // category are independent of one another, so they go out together instead of
  // as a chain of five sequential awaits.
  //
  // The tree and the filter lists are the same for every visitor and change only
  // when the catalogue does, so they sit behind a short Redis TTL.
  const [categories, availableSizes, availableColors, activeCategory] = await Promise.all([
    fetchWithCache(
      "shop:categoryTree:v1",
      async () => {
        // One grouped count for the whole catalogue, rolled up per subtree in
        // memory. This used to be a `product.count()` per root category — an
        // extra round trip for every row in the sidebar.
        const [rootCategories, counts] = await Promise.all([
          prisma.category.findMany({
            where: { parentId: null },
            select: {
              id: true,
              name: true,
              slug: true,
              children: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  children: { select: { id: true, slug: true } },
                },
              },
            },
          }),
          prisma.product.groupBy({
            by: ["categoryId"],
            where: { published: true, deletedAt: null },
            _count: { _all: true },
          }),
        ]);

        const countByCategoryId = new Map(
          counts.map((row) => [row.categoryId, row._count._all])
        );

        return rootCategories.map((cat) => {
          let totalProducts = countByCategoryId.get(cat.id) ?? 0;
          cat.children.forEach((child) => {
            totalProducts += countByCategoryId.get(child.id) ?? 0;
            child.children.forEach((grandchild) => {
              totalProducts += countByCategoryId.get(grandchild.id) ?? 0;
            });
          });
          return { ...cat, totalProducts };
        });
      },
      SHOP_FACETS_TTL
    ),
    fetchWithCache(
      "shop:sizes:v1",
      () => prisma.size.findMany({ select: { id: true, name: true } }),
      SHOP_FACETS_TTL
    ),
    fetchWithCache(
      "shop:colors:v1",
      // `swatchStyle` reads type/value/value2/angle/image; `name` labels the link.
      () =>
        prisma.color.findMany({
          select: {
            id: true,
            name: true,
            type: true,
            value: true,
            value2: true,
            angle: true,
            image: true,
          },
        }),
      SHOP_FACETS_TTL
    ),
    categorySlug
      ? prisma.category.findUnique({
          where: { slug: categorySlug },
          select: {
            id: true,
            name: true,
            image: true,
            children: {
              select: { id: true, children: { select: { id: true } } },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  // Collect matching category IDs (include children and grandchildren)
  let categoryIds: string[] | undefined = undefined;
  if (activeCategory) {
    categoryIds = [activeCategory.id];
    activeCategory.children.forEach((c) => {
      categoryIds!.push(c.id);
      if (c.children) {
        c.children.forEach((gc) => categoryIds!.push(gc.id));
      }
    });
  }

  // Build orderBy from sort param
  const orderBy =
    sort === "price-asc"
      ? { basePrice: "asc" as const }
      : sort === "price-desc"
      ? { basePrice: "desc" as const }
      : sort === "bestseller"
      ? { reviews: { _count: "desc" as const } }
      : sort === "featured"
      ? { featured: "desc" as const }
      : { createdAt: "desc" as const };

  // Fetch filtered products
  const products = await prisma.product.findMany({
    where: {
      published: true,
      deletedAt: null,
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      // Shares its matcher with the header's suggestion panel, so "View All
      // Results" lands on the same set the panel was previewing.
      ...(productSearchFilter(query) ?? {}),
      ...(size || color
        ? {
            variants: {
              some: {
                ...(size ? { size: size } : {}),
                ...(color ? { color: color } : {}),
              },
            },
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            basePrice: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(sale === "true" ? { discountPrice: { not: null } } : {}),
    },
    select: PRODUCT_CARD_SELECT,
    orderBy,
    // `ShopProductList` renders 8 at a time. 120 rows of full product objects
    // rode along in the RSC payload so that a visitor who never scrolled paid
    // for 112 of them; PRODUCT_CARD_SELECT is what makes this size reasonable.
    take: 120,
  });

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">

      <Header />

      {/* HERO BANNER */}
      <section className="relative w-full h-[280px] sm:h-[360px] flex items-center justify-center overflow-hidden bg-zinc-950">
        {activeCategory?.image ? (
          <img
            src={activeCategory.image}
            alt={activeCategory.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-zinc-900" />
        )}
        <div className="relative z-10 text-center text-white px-6">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-300 mb-3 block">
            {activeCategory ? activeCategory.name : "The Full Collection"}
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase mb-4 leading-none">
            {activeCategory ? activeCategory.name : "Shop All"}
          </h1>
          <p className="text-zinc-300 text-sm font-light max-w-lg mx-auto">
            {products.length} {products.length === 1 ? "item" : "items"} available
            {query ? ` for "${query}"` : ""}
          </p>
        </div>
      </section>

      <PromoBanners position="shop_top" />

      <main className="max-w-[1600px] mx-auto px-6 py-12 w-full flex-1">

        {/* BREADCRUMB */}
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-800 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {activeCategory ? (
            <>
              <Link href="/shop" className="hover:text-zinc-800 transition-colors">Shop</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-zinc-700">{activeCategory.name}</span>
            </>
          ) : (
            <span className="text-zinc-700">Shop All</span>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* SIDEBAR FILTERS */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-8 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-8 scrollbar-thin scrollbar-thumb-zinc-200">

              {/* Search */}
              <div>
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3">Search</h3>
                <form method="GET" action="/shop" className="relative">
                  {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
                  {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
                  <input
                    type="text"
                    name="query"
                    defaultValue={query}
                    placeholder="Search products…"
                    className="w-full border border-zinc-200 px-4 py-2.5 text-xs bg-white focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all pr-10"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3">Categories</h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/shop"
                      className={`flex items-center justify-between text-xs py-2 px-3 transition-all border-l-2 ${
                        !categorySlug
                          ? "border-zinc-950 bg-zinc-50 text-zinc-950 font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-950 hover:border-zinc-300"
                      }`}
                    >
                      <span className="uppercase tracking-wider">All Products</span>
                      <span className="text-zinc-400 text-[10px]">{products.length > 0 && !categorySlug ? products.length : ""}</span>
                    </Link>
                  </li>
                  {categories.map((cat) => {
                    const isExpanded = 
                      categorySlug === cat.slug || 
                      cat.children.some(c => c.slug === categorySlug || c.children.some(gc => gc.slug === categorySlug));
                    
                    return (
                    <li key={cat.id}>
                      <Link
                        href={`/shop?category=${cat.slug}${sort !== "newest" ? `&sort=${sort}` : ""}${query ? `&query=${query}` : ""}`}
                        className={`flex items-center justify-between text-xs py-2 px-3 transition-all border-l-2 ${
                          categorySlug === cat.slug || isExpanded
                            ? "border-zinc-950 bg-zinc-50 text-zinc-950 font-bold"
                            : "border-transparent text-zinc-500 hover:text-zinc-950 hover:border-zinc-300"
                        }`}
                      >
                        <span className="uppercase tracking-wider">{cat.name}</span>
                        <span className="text-zinc-400 text-[10px]">{cat.totalProducts}</span>
                      </Link>
                      {/* Subcategories */}
                      {isExpanded && cat.children.length > 0 && (
                        <ul className="pl-4 mt-1 space-y-0.5">
                          {cat.children.map((sub) => {
                            const isSubActive = categorySlug === sub.slug || sub.children.some(gc => gc.slug === categorySlug);
                            return (
                            <li key={sub.id}>
                              <Link
                                href={`/shop?category=${sub.slug}`}
                                className={`text-[10px] uppercase tracking-wider py-1 px-3 block transition-colors ${
                                  isSubActive ? "text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-800"
                                }`}
                              >
                                {sub.name}
                              </Link>
                            </li>
                          )})}
                        </ul>
                      )}
                    </li>
                  )})}
                </ul>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3" /> Sort By
                </h3>
                <ul className="space-y-1">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <Link
                        href={`/shop?sort=${opt.value}${categorySlug ? `&category=${categorySlug}` : ""}${query ? `&query=${query}` : ""}`}
                        className={`flex items-center gap-2 text-xs py-2 px-3 transition-all border-l-2 ${
                          sort === opt.value
                            ? "border-zinc-950 bg-zinc-50 text-zinc-950 font-bold"
                            : "border-transparent text-zinc-500 hover:text-zinc-950 hover:border-zinc-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full border border-current flex-shrink-0 flex items-center justify-center">
                          {sort === opt.value && <span className="w-1 h-1 rounded-full bg-zinc-950 block" />}
                        </span>
                        {opt.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Colors */}
              {availableColors.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3">Colors</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((c) => {
                      const isSelected = color === c.name;
                      return (
                        <Link
                          key={c.id}
                          href={`/shop?${new URLSearchParams({
                            ...(categorySlug ? { category: categorySlug } : {}),
                            ...(sort !== "newest" ? { sort } : {}),
                            ...(query ? { query } : {}),
                            ...(size ? { size } : {}),
                            ...(isSelected ? {} : { color: c.name }),
                          }).toString()}`}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                            isSelected ? "border-zinc-950 scale-110 shadow-sm" : "border-zinc-200 hover:scale-105"
                          }`}
                          style={swatchStyle(c)}
                          title={c.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {availableSizes.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3 mt-8">Sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((s) => {
                      const isSelected = size === s.name;
                      return (
                        <Link
                          key={s.id}
                          href={`/shop?${new URLSearchParams({
                            ...(categorySlug ? { category: categorySlug } : {}),
                            ...(sort !== "newest" ? { sort } : {}),
                            ...(query ? { query } : {}),
                            ...(color ? { color } : {}),
                            ...(isSelected ? {} : { size: s.name }),
                          }).toString()}`}
                          className={`px-3 py-1 text-[10px] font-bold uppercase transition-all border rounded-sm cursor-pointer ${
                            isSelected ? "bg-zinc-950 text-white border-zinc-950" : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                          }`}
                        >
                          {s.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3 mt-8">Price Range</h3>
                <form method="GET" action="/shop" className="flex items-center gap-2">
                  {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
                  {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
                  {query && <input type="hidden" name="query" value={query} />}
                  {size && <input type="hidden" name="size" value={size} />}
                  {color && <input type="hidden" name="color" value={color} />}
                  
                  <input
                    type="number"
                    name="minPrice"
                    defaultValue={minPrice}
                    placeholder="Min"
                    min="0"
                    className="w-full border border-zinc-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                  />
                  <span className="text-zinc-400">-</span>
                  <input
                    type="number"
                    name="maxPrice"
                    defaultValue={maxPrice}
                    placeholder="Max"
                    min="0"
                    className="w-full border border-zinc-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                  />
                  <button type="submit" className="bg-zinc-950 text-white p-2 hover:bg-zinc-800 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Active Filters */}
              {(categorySlug || query || size || color || minPrice !== undefined || maxPrice !== undefined) && (
                <div>
                  <h3 className="text-[10px] font-black tracking-widest uppercase text-zinc-950 mb-3">Active Filters</h3>
                  <div className="flex flex-wrap gap-2">
                    {categorySlug && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(size ? { size } : {}),
                          ...(color ? { color } : {}),
                          ...(minPrice !== undefined ? { minPrice: minPrice.toString() } : {}),
                          ...(maxPrice !== undefined ? { maxPrice: maxPrice.toString() } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        {activeCategory?.name || categorySlug} ✕
                      </Link>
                    )}
                    {query && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(size ? { size } : {}),
                          ...(color ? { color } : {}),
                          ...(minPrice !== undefined ? { minPrice: minPrice.toString() } : {}),
                          ...(maxPrice !== undefined ? { maxPrice: maxPrice.toString() } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        "{query}" ✕
                      </Link>
                    )}
                    {color && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(size ? { size } : {}),
                          ...(minPrice !== undefined ? { minPrice: minPrice.toString() } : {}),
                          ...(maxPrice !== undefined ? { maxPrice: maxPrice.toString() } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        Color: {color} ✕
                      </Link>
                    )}
                    {size && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(color ? { color } : {}),
                          ...(minPrice !== undefined ? { minPrice: minPrice.toString() } : {}),
                          ...(maxPrice !== undefined ? { maxPrice: maxPrice.toString() } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        Size: {size} ✕
                      </Link>
                    )}
                    {(minPrice !== undefined || maxPrice !== undefined) && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(color ? { color } : {}),
                          ...(size ? { size } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        Price: {minPrice !== undefined ? `$${minPrice}` : "$0"} - {maxPrice !== undefined ? `$${maxPrice}` : "Max"} ✕
                      </Link>
                    )}
                    {query && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(size ? { size } : {}),
                          ...(color ? { color } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        &quot;{query}&quot; ✕
                      </Link>
                    )}
                    {size && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(color ? { color } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        Size: {size} ✕
                      </Link>
                    )}
                    {color && (
                      <Link
                        href={`/shop?${new URLSearchParams({
                          ...(categorySlug ? { category: categorySlug } : {}),
                          ...(sort !== "newest" ? { sort } : {}),
                          ...(query ? { query } : {}),
                          ...(size ? { size } : {}),
                        }).toString()}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-950 text-white px-3 py-1.5 hover:bg-zinc-700 transition-colors"
                      >
                        Color: {color} ✕
                      </Link>
                    )}
                  </div>
                </div>
              )}

            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1 min-w-0">

            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
              <p className="text-xs text-zinc-400 font-light">
                Showing <span className="font-bold text-zinc-700">{products.length}</span> products
              </p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters active</span>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-7 h-7 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Products Found</h3>
                <p className="text-zinc-400 text-sm font-light mb-6">Try adjusting your filters or search term.</p>
                <Link href="/shop" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
                  Clear All Filters
                </Link>
              </div>
            ) : (
              <ShopProductList initialProducts={products} query={query} />
            )}
          </div>
        </div>
      </main>

      <Footer categories={footerCategories(categories)} />
    </div>

  );
}

