import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { getStoreName } from "@/lib/settings";
import { footerCategories } from "@/lib/utils";

/** /brands — every brand, each linking to its own page (/brand/<slug>). */

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName();
  return {
    title: `Brands | ${storeName}`,
    description: `Shop by brand at ${storeName}.`,
    alternates: { canonical: "/brands" },
  };
}

export default async function BrandsPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 4,
    }),
    prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: { select: { products: { where: { published: true, deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-950 antialiased">
      <Header />

      <section className="w-full bg-zinc-950 text-white">
        <div className="mx-auto max-w-(--site-max) px-6 py-12 sm:px-8 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <Link href="/" className="transition-colors hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-zinc-300">Brands</span>
          </nav>
          <h1 className="text-3xl font-black uppercase tracking-tight md:text-5xl">Our Brands</h1>
          <p className="mt-3 text-sm text-zinc-400">
            {brands.length} brand{brands.length === 1 ? "" : "s"} · pick one to see its full range.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-(--site-max) flex-1 px-4 py-12 sm:px-8">
        {brands.length === 0 ? (
          <p className="py-20 text-center text-sm text-zinc-400">No brands yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 transition-all hover:-translate-y-0.5 hover:border-zinc-950 hover:shadow-lg"
              >
                <div className="grid aspect-[4/3] place-items-center bg-zinc-50 p-6">
                  <BrandLogo
                    src={brand.image}
                    name={brand.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    fallbackClassName="text-center text-lg font-black uppercase tracking-widest text-zinc-900"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3">
                  <span className="truncate text-sm font-bold">{brand.name}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{brand._count.products}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer categories={footerCategories(categories)} />
    </div>
  );
}
