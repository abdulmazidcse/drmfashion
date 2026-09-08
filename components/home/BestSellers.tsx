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
}

interface BestSellersProps {
  products: Product[];
}

type Gender = "men" | "women";

/**
 * The best-seller row, as a grid rather than the horizontal scroller it used to
 * be. Two rows of four on a desktop: the reference lays this section out as a
 * static grid, and a scroller hides most of its stock behind a gesture on the
 * one section of the page where the products have earned their place.
 */
export default function BestSellers({ products }: BestSellersProps) {
  const [activeTab, setActiveTab] = useState<Gender>("men");

  // Men/women split — heuristic copied verbatim from BestSellersSlider (data logic unchanged)
  let filteredProducts = products.filter((prod) => {
    const categorySlug = prod.category?.slug || "";
    const titleLower = prod.title.toLowerCase();

    if (activeTab === "men") {
      return (
        categorySlug === "mens-clothing" ||
        categorySlug.includes("mens-") ||
        categorySlug.includes("men") ||
        titleLower.includes("men") ||
        titleLower.includes("fleece") ||
        titleLower.includes("shirt") ||
        titleLower.includes("shorts") ||
        titleLower.includes("jeans") ||
        titleLower.includes("tees") ||
        titleLower.includes("pants")
      );
    } else {
      return (
        categorySlug === "womens-clothing" ||
        categorySlug.includes("womens-") ||
        categorySlug.includes("women") ||
        titleLower.includes("women") ||
        titleLower.includes("dress") ||
        titleLower.includes("trenchcoat") ||
        titleLower.includes("sneakers") ||
        titleLower.includes("overcoat") ||
        titleLower.includes("shirt") ||
        titleLower.includes("shorts") ||
        titleLower.includes("jeans") ||
        titleLower.includes("tees") ||
        titleLower.includes("pants")
      );
    }
  });

  // Fallback if no products matched the filter
  if (filteredProducts.length === 0 && products.length > 0) {
    if (activeTab === "men") {
      filteredProducts = products.slice(0, Math.ceil(products.length / 2));
    } else {
      filteredProducts = products.slice(Math.ceil(products.length / 2));
    }
  }
  if (filteredProducts.length === 0) {
    filteredProducts = products;
  }

  // Two full rows of the four-column grid.
  const visibleProducts = filteredProducts.slice(0, 8);

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

        {/* Re-mounted on tab change so the staggered reveal replays. */}
        <div key={activeTab} className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {visibleProducts.map((prod, i) => (
            <div key={prod.id} className="at-card-up" style={{ animationDelay: `${i * 60}ms` }}>
              <ProductCard
                product={prod}
                idPrefix="bestseller"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
