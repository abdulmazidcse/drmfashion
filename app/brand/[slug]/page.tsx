import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ViewItemListTracker from "@/components/ViewItemListTracker";
import BrandLogo from "@/components/BrandLogo";
import { getStoreName } from "@/lib/settings";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { PRODUCT_GRID_COLS } from "@/lib/collectionView";
import { footerCategories, formatImageUrl, stripScriptTags } from "@/lib/utils";

/**
 * /brand/<slug> — every published product of one brand. Reached from the
 * homepage brand slider and /brands.
 */

const PER_PAGE = 35; // 5 full rows at 7 across, 7 at 5 across

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

async function findBrand(slug: string) {
  return prisma.brand.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, image: true, description: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [brand, storeName] = await Promise.all([findBrand(slug), getStoreName()]);
  if (!brand) return { title: `Brand not found | ${storeName}` };
  const plain = (brand.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: `${brand.name} | ${storeName}`,
    description: plain.slice(0, 160) || `Shop ${brand.name} at ${storeName}.`,
    alternates: { canonical: `/brand/${brand.slug}` },
    openGraph: brand.image ? { images: [formatImageUrl(brand.image)] } : undefined,
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, { page: rawPage }] = await Promise.all([params, searchParams]);
  const brand = await findBrand(slug);
  if (!brand) notFound();

  const page = Math.max(1, parseInt(rawPage || "1", 10) || 1);
  const where = { brandId: brand.id, published: true, deletedAt: null };

  const [categories, total, products] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 4,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page > totalPages) notFound();
  const listId = `brand-${brand.slug}`;
  const pageHref = (p: number) => (p === 1 ? `/brand/${brand.slug}` : `/brand/${brand.slug}?page=${p}`);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-950 antialiased">
      <Header />

      <section className="w-full bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-(--site-max) flex-col gap-8 px-6 py-12 sm:px-8 md:flex-row md:items-center md:py-16">
          <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-4 md:h-36 md:w-36">
            <BrandLogo src={brand.image} name={brand.name} className="max-h-full max-w-full object-contain" fallbackClassName="text-center text-sm font-black uppercase tracking-widest text-zinc-900" />
          </div>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <Link href="/" className="transition-colors hover:text-white">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link href="/brands" className="transition-colors hover:text-white">Brands</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-zinc-300">{brand.name}</span>
            </nav>
            <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">{brand.name}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {total} product{total === 1 ? "" : "s"}
            </p>
            {brand.description && (
              <div
                className="page-content mt-5 max-w-3xl text-sm leading-relaxed text-zinc-300 [&_*]:!text-zinc-300"
                dangerouslySetInnerHTML={{ __html: stripScriptTags(brand.description) }}
              />
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-(--site-max) flex-1 px-4 py-12 sm:px-8">
        {products.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-400">No products from {brand.name} yet. Check back soon.</p>
        ) : (
          <>
            <ViewItemListTracker listId={listId} listName={brand.name} products={products} />
            <div className={`grid ${PRODUCT_GRID_COLS} gap-4 sm:gap-6`}>
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  idPrefix={listId}
                  listId={listId}
                  listName={brand.name}
                  priority={page === 1 && idx < 4}
                />
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="inline-flex h-10 items-center gap-1 rounded-full border border-zinc-200 px-4 text-xs font-bold uppercase tracking-wider hover:border-zinc-950">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
            )}
            <span className="px-3 text-xs font-semibold text-zinc-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="inline-flex h-10 items-center gap-1 rounded-full border border-zinc-200 px-4 text-xs font-bold uppercase tracking-wider hover:border-zinc-950">
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </nav>
        )}
      </main>

      <Footer categories={footerCategories(categories)} />
    </div>
  );
}
