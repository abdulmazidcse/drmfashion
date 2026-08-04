"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
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

interface BestSellersSliderProps {
  products: Product[];
}

export default function BestSellersSlider({ products }: BestSellersSliderProps) {
  const [activeTab, setActiveTab] = useState<"men" | "women">("men");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter products dynamically
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

  // Smooth scroll handler
  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const cardWidth = 336; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === "left" ? -cardWidth : cardWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full relative">
      
      {/* 1. Header with dynamic tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground uppercase">
            This Month's <span className="font-extrabold text-foreground">Best Sellers</span>
          </h2>
        </div>
        
        {/* Custom Segmented Tabs */}
        <div className="flex border border-line rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setActiveTab("men")}
            className={`px-8 py-2.5 text-xs font-bold tracking-[0.14em] uppercase cursor-pointer transition-all duration-300 ${
              activeTab === "men"
                ? "bg-brand-ink text-white"
                : "bg-white text-faint hover:text-foreground"
            }`}
          >
            Men
          </button>
          <button
            onClick={() => setActiveTab("women")}
            className={`px-8 py-2.5 text-xs font-bold tracking-[0.14em] uppercase cursor-pointer transition-all duration-300 border-l border-line ${
              activeTab === "women"
                ? "bg-brand-ink text-white"
                : "bg-white text-faint hover:text-foreground"
            }`}
          >
            Women
          </button>
        </div>
      </div>

      {/* 2. Carousel Container */}
      <div className="relative group/carousel w-full">
        
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-line shadow-md flex items-center justify-center text-soft hover:bg-cream hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-line shadow-md flex items-center justify-center text-soft hover:bg-cream hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 stroke-[1.5]" />
        </button>

        {/* Horizontal Slider Wrapper */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scroll-smooth w-full py-2 px-1 no-scrollbar cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filteredProducts.map((prod) => {
            return (
              <div key={prod.id} className="min-w-[290px] sm:min-w-[320px] max-w-[320px] flex-shrink-0">
                <ProductCard product={prod} idPrefix="bestseller" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
