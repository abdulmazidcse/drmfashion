import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getStoreName } from "@/lib/settings";
import { footerCategories, formatImageUrl } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  return {
    title: `Collections | ${storeName}`,
    description: `Browse curated collections at ${storeName} — hand-picked edits of the season's pieces.`,
    alternates: { canonical: "/collection" },
  };
}

export default async function CollectionsPage() {
  const now = new Date();

  // Only live collections: active, and inside their schedule window. The count
  // is of products a shopper can actually open, not of every row attached.
  const [collections, navCategories] = await Promise.all([
    prisma.collection.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        featured: true,
        _count: {
          select: { products: { where: { product: { published: true, deletedAt: null } } } },
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

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">
      <Header />

      <main className="max-w-[1600px] mx-auto px-6 py-10 w-full flex-1">
        {/* BREADCRUMB */}
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
        >
          <Link href="/" className="text-zinc-400 hover:text-zinc-800 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3 text-zinc-300" />
          <span className="text-zinc-700">Collections</span>
        </nav>

        <h1 className="text-2xl font-extrabold uppercase leading-none tracking-tight text-zinc-950 sm:text-3xl">
          Collections
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-zinc-500">
          Curated edits, hand-picked for the season.
        </p>

        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
              <Layers className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Collections Yet</h3>
            <p className="text-zinc-400 text-sm font-light mb-6">
              We&apos;re putting together new edits soon.
            </p>
            <Link href="/shop" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
            {collections.map((c) => {
              const tile = formatImageUrl(c.image);
              const count = c._count.products;
              return (
                <Link key={c.id} href={`/collection/${c.slug}`} className="group block">
                  <div className="relative aspect-[5/6] overflow-hidden rounded-sm bg-zinc-100">
                    {tile ? (
                      <img
                        src={tile}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs font-bold uppercase leading-snug tracking-wide text-zinc-400">
                        {c.name}
                      </span>
                    )}
                    {c.featured && (
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-950">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-bold uppercase tracking-wide text-zinc-950 transition-colors group-hover:text-zinc-600">
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-light text-zinc-500">
                    {count} {count === 1 ? "item" : "items"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer categories={footerCategories(navCategories)} />
    </div>
  );
}
