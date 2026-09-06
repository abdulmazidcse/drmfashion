"use client";

import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

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

interface FeaturedProductsSliderProps {
  products: Product[];
}

function matchesTab(product: Product, activeTab: "men" | "women") {
  const categorySlug = product.category?.slug || "";
  const searchValue = `${categorySlug} ${product.category?.name || ""} ${product.title}`.toLowerCase();

  if (activeTab === "men") {
    return (
      searchValue.includes("mens") ||
      searchValue.includes("men") ||
      searchValue.includes("shirt") ||
      searchValue.includes("fleece")
    );
  }

  return (
    searchValue.includes("womens") ||
    searchValue.includes("women") ||
    searchValue.includes("dress") ||
    searchValue.includes("trenchcoat") ||
    searchValue.includes("sneakers") ||
    searchValue.includes("overcoat")
  );
}

export default function FeaturedProductsSlider({ products }: FeaturedProductsSliderProps) {
  const [activeTab, setActiveTab] = useState<"men" | "women">("men");
  const scrollRef = useRef<HTMLDivElement>(null);

  const featuredProducts = products.filter((product) => product.featured);
  const productPool = featuredProducts.length > 0 ? featuredProducts : products;
  const filteredProducts = productPool.filter((product) => matchesTab(product, activeTab));
  const visibleProducts = filteredProducts.length > 0 ? filteredProducts : productPool;

  const handleScroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -336 : 336,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400 block mb-1">
            Curated Picks
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 uppercase">
            Featured <span className="font-extrabold text-zinc-800">Products</span>
          </h2>
        </div>

        <div className="flex border border-zinc-300 rounded-sm overflow-hidden shadow-sm">
          <button
            onClick={() => setActiveTab("men")}
            className={`px-8 py-2.5 text-xs font-bold tracking-widest uppercase cursor-pointer transition-all duration-300 ${
              activeTab === "men"
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-400 hover:text-zinc-800"
            }`}
          >
            Men
          </button>
          <button
            onClick={() => setActiveTab("women")}
            className={`px-8 py-2.5 text-xs font-bold tracking-widest uppercase cursor-pointer transition-all duration-300 border-l border-zinc-200 ${
              activeTab === "women"
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-400 hover:text-zinc-800"
            }`}
          >
            Women
          </button>
        </div>
      </div>

      <div className="relative group/carousel w-full">
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center text-zinc-700 hover:bg-zinc-50 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll featured products left"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
        </button>

        <button
          onClick={() => handleScroll("right")}
          className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center text-zinc-700 hover:bg-zinc-50 hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll featured products right"
        >
          <ChevronRight className="w-6 h-6 stroke-[1.5]" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scroll-smooth w-full py-2 px-1 no-scrollbar cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {visibleProducts.map((product) => (
            <div key={product.id} className="min-w-[290px] sm:min-w-[320px] max-w-[320px] flex-shrink-0">
              {/* Fixed-width carousel slot, so the card's viewport-relative
                  default would over- or under-fetch depending on the screen. */}
              <ProductCard product={product} idPrefix="featured" sizes="320px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
