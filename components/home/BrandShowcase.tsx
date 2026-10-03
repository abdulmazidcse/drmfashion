"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface HomeBrand {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
}

/**
 * Homepage "Our brands" band: copy on the left, the brand logos on the right
 * as a slow, continuous slider (paused on hover) once there are enough to
 * fill the row; fewer than that sit still in a grid. Every logo opens the
 * brand's own page.
 */
export default function BrandShowcase({ brands }: { brands: HomeBrand[] }) {
  const count = brands.length;
  const slide = count >= 4;
  // The track is the list twice, translated by half its width per loop, so the
  // seam never shows. Speed scales with the count so each logo moves alike.
  const duration = `${Math.max(20, count * 4)}s`;

  const tile = (brand: HomeBrand, key: string, hidden = false) => (
    <Link
      key={key}
      href={`/brand/${brand.slug}`}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className="group flex h-28 w-44 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 transition-colors hover:border-white/40 hover:bg-white/10 sm:h-32 sm:w-52"
    >
      <span className="grid h-14 w-full place-items-center">
        <BrandLogo
          src={brand.image}
          name={brand.name}
          className="max-h-14 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          fallbackClassName="text-center text-sm font-black uppercase tracking-widest text-white"
        />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {brand.productCount} product{brand.productCount === 1 ? "" : "s"}
      </span>
    </Link>
  );

  return (
    <section className="w-full overflow-hidden bg-zinc-950 text-white">
      <div className="mx-auto grid max-w-(--site-max) grid-cols-1 items-center gap-10 px-6 py-14 sm:px-8 md:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="max-w-xl">
          <span className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-400">Our Brand Collection</span>
          <h2 className="at-heading mb-4 text-at-subheading">
            {count > 1 ? `${count} Premium Brands` : count === 1 ? "Our Premium Brand" : "Premium Brands"}
          </h2>
          <p className="mb-6 text-sm font-light leading-relaxed text-zinc-300 sm:text-base">
            We partner with the world&apos;s finest labels. Every piece in our collection is carefully selected, authenticity-verified, and crafted to the highest standards of luxury fashion.
          </p>
          <div className="mb-8 flex flex-wrap items-center gap-6 text-sm text-zinc-300">
            <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-white" /> Authentic Items</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-white" /> Quality Assured</span>
          </div>
          <Link
            href={count === 1 ? `/brand/${brands[0].slug}` : "/brands"}
            className="inline-flex items-center gap-2 rounded-at-btn bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-at-ink shadow-lg transition-colors hover:bg-white/90"
          >
            {count === 1 ? `Shop ${brands[0].name}` : "Shop All Brands"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {count === 0 ? null : slide ? (
          <div
            className="group/marquee relative min-w-0 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
          >
            <div
              className="flex w-max gap-4 [animation:brand-marquee_var(--d)_linear_infinite] group-hover/marquee:[animation-play-state:paused] motion-reduce:[animation:none]"
              style={{ ["--d" as string]: duration }}
            >
              {brands.map((b) => tile(b, b.id))}
              {brands.map((b) => tile(b, `${b.id}-dup`, true))}
            </div>
            <style>{`@keyframes brand-marquee { from { transform: translateX(0) } to { transform: translateX(calc(-50% - 0.5rem)) } }`}</style>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
            {brands.map((b) => tile(b, b.id))}
          </div>
        )}
      </div>
    </section>
  );
}
