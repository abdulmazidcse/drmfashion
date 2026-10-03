"use client";

import React, { useState } from "react";
import ProductCard from "../ProductCard";
import SigSectionHead from "./SigSectionHead";

interface Variant {
  id: string;
  size: string;
  color: string;
  length: string | null;
  stock: number;
  price: number | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  /** Not rendered — listing queries no longer select it. */
  description?: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  featured: boolean;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
  variants: Variant[];
  /** From the category tree (see app/page.tsx); null when under neither root. */
  gender?: "men" | "women" | null;
}

interface BestSellersProps {
  products: Product[];
}

type Gender = "men" | "women";

/** Show a card only when it falls within two rows at the current column count. */
function twoRowVisibility(i: number) {
  if (i < 8) return "";
  if (i < 10) return "hidden xl:block";
  if (i < 12) return "hidden 3xl:block";
  return "hidden 4xl:block";
}

/**
 * The best-seller row, as a grid rather than the horizontal scroller it used to
 * be. Two rows at the shared per-screen count: the reference lays this section out as a
 * static grid, and a scroller hides most of its stock behind a gesture on the
 * one section of the page where the products have earned their place.
 */
export default function BestSellers({ products }: BestSellersProps) {
  const [activeTab, setActiveTab] = useState<Gender>("men");

  // Each tab shows only its own gender. No fallback to the other tab's
  // products: an empty tab says so instead (the brief: Women → "upcoming").
  const filteredProducts = products.filter((prod) => prod.gender === activeTab);

  // Two full rows at the shared per-screen count (4 / 5 / 6 / 7 per row), so
  // up to 14 are rendered; cards beyond two rows at the current breakpoint
  // stay hidden (see twoRowVisibility).
  const visibleProducts = filteredProducts.slice(0, 14);

  return (
    <section className="bg-sig-cream pb-12 pt-2.5 lg:pb-[70px]">
      <div className="sig-wrap">
        <SigSectionHead
          kicker="Trending now"
          title="This month's best sellers"
          subtitle="Ranked by what actually sold this month — sizes move fast."
        >
          <div className="flex gap-1 rounded-full border border-sig-line bg-sig-card p-1.5">
            {(["men", "women"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setActiveTab(g)}
                className={`cursor-pointer rounded-full px-6 py-2 text-[13px] font-semibold capitalize transition-colors duration-200 ${
                  activeTab === g
                    ? "bg-sig-ink text-white"
                    : "text-sig-soft hover:bg-sig-copper-50 hover:text-sig-ink"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </SigSectionHead>

        {visibleProducts.length === 0 && (
          <div className="grid place-items-center rounded-sig border border-dashed border-sig-line bg-sig-card px-6 py-16 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-sig-copper-600">Coming soon</p>
            <p className="mt-2 text-lg font-bold text-sig-ink">
              {activeTab === "women" ? "Our women's collection is on its way." : "New best sellers are on their way."}
            </p>
            <p className="mt-1 text-sm text-sig-soft">Check back shortly — new pieces are being added.</p>
          </div>
        )}

        {/* Re-mounted on tab change so the staggered reveal replays. */}
        <div key={activeTab} className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 gap-4 lg:gap-5">
          {visibleProducts.map((prod, i) => (
            <div key={prod.id} className={`at-card-up ${twoRowVisibility(i)}`} style={{ animationDelay: `${i * 60}ms` }}>
              <ProductCard
                product={prod}
                idPrefix="bestseller"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1800px) 25vw, 17vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
