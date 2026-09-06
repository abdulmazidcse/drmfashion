"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

interface NewArrivalsProps {
  products: Product[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const visibleProducts = products.slice(0, 12);

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
    updateArrows();

    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

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
  }, [updateArrows]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const arrowBtn = (disabled: boolean) =>
    `z-20 flex h-11 w-11 items-center justify-center rounded-full transition-all ${
      disabled
        ? "pointer-events-none bg-white/30 text-at-ink/35"
        : "cursor-pointer border border-at-ink/15 bg-white text-at-ink hover:bg-at-ink hover:text-white"
    }`;

  if (visibleProducts.length === 0) return null;

  return (
    <section className="w-full py-[15px] md:py-5">
      <div className="mb-7 flex flex-col items-start gap-3 px-6 sm:flex-row sm:items-end sm:justify-between lg:px-8">
        <div>
          <h2 className="at-heading text-at-subheading text-at-ink text-left">New Arrivals</h2>
          <p className="text-zinc-550 text-sm mt-1 font-light">The freshest additions to our collection — just landed.</p>
        </div>
        <Link href="/shop?sort=newest" className="text-xs font-bold tracking-widest uppercase text-zinc-950 hover:text-zinc-600 transition-colors flex items-center gap-1 group shrink-0">
          View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

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
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleProducts.map((product, i) => (
            <div
              key={product.id}
              className="at-card-up shrink-0 snap-start w-[calc((100%-11.25px)/2.25)] md:w-[calc((100%-21.25px)/4.25)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ProductCard product={product} idPrefix="new-arrival" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
