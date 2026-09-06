"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import ProductCard from "../ProductCard";

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

export default function BestSellers({ products }: BestSellersProps) {
  const [activeTab, setActiveTab] = useState<Gender>("men");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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

  // Reference shows 12 cards per panel
  const visibleProducts = filteredProducts.slice(0, 12);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const el = scrollRef.current;
    if (!el) return;
    // Start each panel at the beginning (Previous disabled), then recompute as layout settles
    el.scrollLeft = 0;
    updateArrows();

    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    // Recompute when the track's size changes (e.g. product images finishing loading)
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    const imgs = Array.from(el.querySelectorAll("img"));
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", updateArrows, { once: true });
    });

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, activeTab]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Compute classes from state so the disabled (faded grey) look is guaranteed to win
  const arrowBtn = (disabled: boolean) =>
    `z-20 flex h-11 w-11 items-center justify-center rounded-full transition-all ${
      disabled
        ? "pointer-events-none bg-white/30 text-at-ink/35"
        : "cursor-pointer border border-at-ink/15 bg-white text-at-ink hover:bg-at-ink hover:text-white"
    }`;

  return (
    <section className="w-full py-[15px] md:py-5">
      {/* Title + tabs (padded) — heading left, Men/Women pill right */}
      <div className="mb-7 flex flex-col items-center gap-3 px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <SectionHeading title="This Month's Best Sellers" highlight="Best Sellers" highlightStyle="muted" />

        <div className="relative flex rounded-at-btn border border-[#CBCBCB]">
          <span
            className={`absolute bottom-[2px] top-[2px] w-[calc(50%-2px)] rounded-at-btn bg-at-ink transition-all duration-300 ease-in ${
              activeTab === "women" ? "left-[calc(50%)]" : "left-[2px]"
            }`}
          />
          {(["men", "women"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setActiveTab(g)}
              className={`relative z-10 min-w-[120px] cursor-pointer px-6 py-2.5 text-center text-[13px] font-semibold capitalize transition-colors duration-300 md:min-w-[150px] ${
                activeTab === g ? "text-white" : "text-at-muted"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal scroll-snap slider with floating white arrows */}
      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => handleScroll("left")}
          disabled={isMounted ? !canLeft : false}
          className={`absolute left-2 top-1/2 -translate-y-1/2 ${arrowBtn(isMounted ? !canLeft : false)}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => handleScroll("right")}
          disabled={isMounted ? !canRight : false}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${arrowBtn(isMounted ? !canRight : false)}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          key={activeTab}
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleProducts.map((prod, i) => (
            <div
              key={prod.id}
              className="at-card-up shrink-0 snap-start w-[calc((100%-11.25px)/2.25)] md:w-[calc((100%-21.25px)/4.25)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ProductCard product={prod} idPrefix="bestseller" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
