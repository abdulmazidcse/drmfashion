import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getStoreName } from "@/lib/settings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingBag, ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ViewItemListTracker from "@/components/ViewItemListTracker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { footerCategories, formatImageUrl, formatProductUrls, stripScriptTags } from "@/lib/utils";
import { VIEW_GRID_CLASS, VIEW_IMAGE_SIZES } from "@/lib/collectionView";

export const revalidate = 300;

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

/** Active and inside its schedule window — the same test the public API applies. */
function isLive(c: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  return c.active && (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now);
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, collection] = await Promise.all([
    getStoreName(),
    prisma.collection.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        description: true,
        metaTitle: true,
        metaDescription: true,
        active: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  if (!collection || !isLive(collection, new Date())) {
    return { title: `Collection Not Found | ${storeName}` };
  }

  // Admin overrides win; otherwise fall back to the collection's own copy.
  // `description` is rich text from the editor, so its tags are stripped before
  // it can go in a meta tag.
  const fallbackDescription = collection.description
    ? collection.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
    : "";

  return {
    title: collection.metaTitle
      ? `${collection.metaTitle} | ${storeName}`
      : `${collection.name} | ${storeName}`,
    description:
      collection.metaDescription ||
      fallbackDescription ||
      `Shop the ${collection.name} collection at ${storeName}.`,
    alternates: { canonical: `/collection/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const now = new Date();

  const [collection, navCategories] = await Promise.all([
    prisma.collection.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        bannerImage: true,
        metaDescription: true,
        active: true,
        startsAt: true,
        endsAt: true,
        products: {
          where: { product: { published: true, deletedAt: null } },
          orderBy: { sortOrder: "asc" },
          select: { product: { select: PRODUCT_CARD_SELECT } },
        },
      },
    }),
    // Nav list + <Footer>; the render reads name/slug off each.
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!collection || !isLive(collection, now)) notFound();

  const products = collection.products.map((row) => formatProductUrls(row.product));
  const heroImage = formatImageUrl(collection.bannerImage);
  const descriptionHtml = stripScriptTags(collection.description);
  const listId = `collection_${collection.slug}`;

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">
      <Header />

      {/* COLLECTION HEADER — banner artwork when there is one, plain type otherwise. */}
      {heroImage ? (
        <section className="relative w-full overflow-hidden bg-zinc-900">
          {/* In normal flow, not absolute: the image is what gives the banner
              its height, so whatever the admin uploads is shown whole. */}
          <img src={heroImage} alt={collection.name} className="block h-auto w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[1600px] px-6 pb-8 sm:pb-12">
            <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Link href="/" className="text-white/60 hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3 text-white/40" />
              <Link href="/collection" className="text-white/60 hover:text-white transition-colors">Collections</Link>
              <ChevronRight className="h-3 w-3 text-white/40" />
              <span className="text-white">{collection.name}</span>
            </nav>
            <h1 className="mb-3 text-4xl font-extrabold uppercase leading-none tracking-tight text-white sm:text-6xl">
              {collection.name}
            </h1>
            {collection.metaDescription && (
              <p className="max-w-xl text-sm font-light leading-relaxed text-zinc-200">
                {collection.metaDescription}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-[1600px] px-6 pb-4 pt-10">
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Link href="/" className="text-zinc-400 hover:text-zinc-800 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 text-zinc-300" />
            <Link href="/collection" className="text-zinc-400 hover:text-zinc-800 transition-colors">Collections</Link>
            <ChevronRight className="h-3 w-3 text-zinc-300" />
            <span className="text-zinc-700">{collection.name}</span>
          </nav>
          <h1 className="text-2xl font-extrabold uppercase leading-none tracking-tight text-zinc-950 sm:text-3xl">
            {collection.name}
          </h1>
          {collection.metaDescription && (
            <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-zinc-500">
              {collection.metaDescription}
            </p>
          )}
        </section>
      )}

      <main className="max-w-[1600px] mx-auto px-6 py-10 w-full flex-1">
        <div className="min-w-0">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            {products.length} {products.length === 1 ? "item" : "items"}
          </p>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                <ShoppingBag className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Products Yet</h3>
              <p className="text-zinc-400 text-sm font-light mb-6">
                We&apos;re adding new items to this collection soon.
              </p>
              <Link href="/shop" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
                Browse All Products
              </Link>
            </div>
          ) : (
            <>
              <ViewItemListTracker listId={listId} listName={collection.name} products={products} />
              <div className={`grid ${VIEW_GRID_CLASS.default}`}>
                {products.map((product, idx) => (
                  // First grid row is above the fold — opt it out of lazy loading.
                  <ProductCard
                    key={product.id}
                    product={product}
                    idPrefix="collection"
                    listId={listId}
                    listName={collection.name}
                    priority={idx < 3}
                    sizes={VIEW_IMAGE_SIZES.default}
                  />
                ))}
              </div>
            </>
          )}

          {/* Collection copy, under the grid — it is SEO/reading material, so it
              sits after the products rather than pushing them down. Rich text
              from the admin editor, same as the category page. */}
          {descriptionHtml && (
            <section className="mt-16 pt-10 border-t border-zinc-100">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-950 mb-5">
                About {collection.name}
              </h2>
              <div
                className="page-content max-w-none font-light"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </section>
          )}
        </div>
      </main>

      <Footer categories={footerCategories(navCategories)} />
    </div>
  );
}
