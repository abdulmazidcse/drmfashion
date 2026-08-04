"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  children?: Category[];
}

interface TrendingCategoriesSliderProps {
  categories: Category[];
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  "luxury-outerwear": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  "high-end-dresses": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  "elite-footwear": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  "designer-accessories": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  "mens-clothing": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  "womens-clothing": "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
  default: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
};

function isWomenCategory(category: Category) {
  const value = `${category.slug} ${category.name}`.toLowerCase();
  return value.includes("women") || value.includes("womens") || value.includes("ladies");
}

function isMenCategory(category: Category) {
  const value = `${category.slug} ${category.name}`.toLowerCase();
  return !isWomenCategory(category) && (value.includes("men") || value.includes("mens"));
}

function uniqueCategories(categories: Category[]) {
  const seen = new Set<string>();

  return categories.filter((category) => {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}

export default function TrendingCategoriesSlider({ categories }: TrendingCategoriesSliderProps) {
  const [activeTab, setActiveTab] = useState<"men" | "women">("men");
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabCategories = useMemo(() => {
    const matchingRoots = categories.filter(activeTab === "men" ? isMenCategory : isWomenCategory);
    const categorySet = matchingRoots.flatMap((category) => [
      category,
      ...(category.children?.length ? category.children : []),
    ]);

    const unique = uniqueCategories(categorySet.length > 0 ? categorySet : categories);
    return unique.slice(0, 6);
  }, [activeTab, categories]);

  const handleScroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-faint block mb-1">
            Explore The Edit
          </span>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground uppercase">
            Trending <span className="font-extrabold text-foreground">Tall Categories</span>
          </h2>
        </div>

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

      <div className="relative group/carousel w-full">
        <button
          onClick={() => handleScroll("left")}
          className="hidden sm:flex absolute left-[-20px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white border border-line shadow-md items-center justify-center text-soft hover:bg-cream hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
        </button>

        <button
          onClick={() => handleScroll("right")}
          className="hidden sm:flex absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white border border-line shadow-md items-center justify-center text-soft hover:bg-cream hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/carousel:opacity-100 duration-300 cursor-pointer"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-5 h-5 stroke-[1.5]" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-smooth w-full py-2 px-1 no-scrollbar snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabCategories.map((category) => {
            const image = category.image || CATEGORY_FALLBACK_IMAGES[category.slug] || CATEGORY_FALLBACK_IMAGES.default;

            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group/card relative min-w-[220px] sm:min-w-[260px] lg:min-w-[290px] aspect-[3/4] overflow-hidden bg-cream border border-line shadow-sm snap-start"
              >
                <img
                  src={image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-faint block mb-1">
                    {category.children?.length ? `${category.children.length} styles` : "Trending Now"}
                  </span>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide leading-tight">{category.name}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase border-b border-white pb-0.5 mt-4">
                    Shop Now <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
