import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { footerCategories } from "@/lib/utils";


const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "featured", label: "Featured" },
];

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const subSlug = typeof sp.sub === "string" ? sp.sub : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";

  // Both reads are independent — they were sequential awaits. `children` used to
  // drag in the id of every published product beneath each child, none of which
  // this page reads.
  const [category, navCategories] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            // The subcategory pills show a count. Previously every matching
            // product id was fetched so the render could call `.length`.
            _count: { select: { products: { where: { published: true } } } },
          },
        },
        parent: { select: { name: true, slug: true } },
      },
    }),
    // Nav list + <Footer>; the render reads name/slug off each.
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!category) notFound();

  // Resolve which sub is active
  const activeSubcategory = subSlug
    ? category.children.find((c) => c.slug === subSlug)
    : null;

  // Collect category IDs to include in product filter
  const categoryIds = activeSubcategory
    ? [activeSubcategory.id]
    : [category.id, ...category.children.map((c) => c.id)];

  // Build orderBy
  const orderBy =
    sort === "price-asc"
      ? { basePrice: "asc" as const }
      : sort === "price-desc"
      ? { basePrice: "desc" as const }
      : sort === "featured"
      ? { featured: "desc" as const }
      : { createdAt: "desc" as const };

  // Fetch products
  const products = await prisma.product.findMany({
    where: {
      published: true,
      categoryId: { in: categoryIds },
    },
    select: PRODUCT_CARD_SELECT,
    orderBy,
    take: 48,
  });

  const heroImage = category.image || "";

  return (
    <div className="flex flex-col min-h-screen">

      <Header />

      {/* HERO BANNER */}
      <section className="relative w-full h-[320px] sm:h-[420px] flex items-end overflow-hidden bg-brand-ink-soft">
        {heroImage && (
          <img
            src={heroImage}
            alt={category.name}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-50 scale-105 hover:scale-100 transition-transform duration-1000"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12 w-full">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-faint mb-2 block">
            {category.parent ? `${category.parent.name} / ` : ""}{category.name}
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase text-white leading-none mb-3">
            {category.name}
          </h1>
          <p className="text-faint text-sm font-light">
            {products.length} {products.length === 1 ? "item" : "items"} in this collection
          </p>
        </div>
      </section>

      {/* SUBCATEGORY PILLS (if any children) */}
      {category.children.length > 0 && (
        <div className="bg-cream border-b border-line">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 overflow-x-auto scrollbar-none">
            <Link
              href={`/category/${slug}${sort !== "newest" ? `?sort=${sort}` : ""}`}
              className={`flex-shrink-0 text-[10px] font-bold tracking-[0.14em] uppercase px-5 py-2.5 border transition-all ${
                !activeSubcategory
                  ? "bg-brand-600 rounded-full text-white border-brand-600"
                  : "bg-white text-soft border-line hover:border-brand-600 hover:text-brand-700"
              }`}
            >
              All {category.name}
            </Link>
            {category.children.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${slug}?sub=${sub.slug}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                className={`flex-shrink-0 text-[10px] font-bold tracking-[0.14em] uppercase px-5 py-2.5 border transition-all ${
                  activeSubcategory?.id === sub.id
                    ? "bg-brand-600 rounded-full text-white border-brand-600"
                    : "bg-white text-soft border-line hover:border-brand-600 hover:text-brand-700"
                }`}
              >
                {sub.name}
                <span className="ml-1.5 opacity-50 font-normal">({sub._count.products})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">

        {/* BREADCRUMB */}
        <div className="text-[10px] text-faint font-bold uppercase tracking-[0.14em] mb-8 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          {category.parent && (
            <>
              <Link href={`/category/${category.parent.slug}`} className="hover:text-foreground transition-colors">
                {category.parent.name}
              </Link>
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
            </>
          )}
          <span className="text-soft">{activeSubcategory?.name || category.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* SIDEBAR */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div className="sticky top-24 space-y-8">

              {/* Sort */}
              <div>
                <h3 className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-foreground mb-3 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3 h-3" /> Sort By
                </h3>
                <ul className="space-y-1">
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <Link
                        href={`/category/${slug}?sort=${opt.value}${subSlug ? `&sub=${subSlug}` : ""}`}
                        className={`flex items-center gap-2 text-xs py-2 px-3 transition-all border-l-2 ${
                          sort === opt.value
                            ? "border-brand-600 bg-cream text-foreground font-bold"
                            : "border-transparent text-soft hover:text-brand-700 hover:border-brand-300"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full border border-current flex-shrink-0 flex items-center justify-center">
                          {sort === opt.value && <span className="w-1 h-1 rounded-full bg-brand-ink block" />}
                        </span>
                        {opt.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other Categories */}
              <div>
                <h3 className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-foreground mb-3">Browse More</h3>
                <ul className="space-y-1">
                  {navCategories
                    .filter((c) => c.slug !== slug)
                    .map((cat) => (
                      <li key={cat.id}>
                        <Link
                          href={`/category/${cat.slug}`}
                          className="text-xs py-2 px-3 border-l-2 border-transparent text-soft hover:text-brand-700 hover:border-brand-300 transition-all block uppercase tracking-wider"
                        >
                          {cat.name}
                        </Link>
                      </li>
                    ))}
                  <li>
                    <Link
                      href="/shop"
                      className="text-xs py-2 px-3 border-l-2 border-transparent text-faint hover:text-brand-700 hover:border-brand-300 transition-all block uppercase tracking-wider"
                    >
                      All Products →
                    </Link>
                  </li>
                </ul>
              </div>

            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1 min-w-0">

            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-line">
              <p className="text-xs text-faint font-light">
                Showing <span className="font-bold text-soft">{products.length}</span> products
                {activeSubcategory && (
                  <span className="text-faint"> in <strong className="text-soft">{activeSubcategory.name}</strong></span>
                )}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-faint uppercase tracking-[0.14em]">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-6">
                  <ShoppingBag className="w-7 h-7 text-faint" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Products Yet</h3>
                <p className="text-faint text-sm font-light mb-6">
                  We&apos;re adding new items to this category soon.
                </p>
                <Link href="/shop" className="bg-brand-600 rounded-full text-white px-8 py-3 text-xs font-bold tracking-[0.14em] uppercase hover:bg-brand-700 transition-colors">
                  Browse All Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                {products.map((product, idx) => (
                  // First grid row is above the fold — opt it out of lazy loading.
                  <ProductCard key={product.id} product={product} idPrefix="category" priority={idx < 3} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer categories={footerCategories(navCategories)} />
    </div>
  );
};
