"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../ProductCard";
import SectionHead from "./SectionHead";

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
    `z-20 grid h-11 w-11 place-items-center rounded-full transition-all ${
      disabled
        ? 'pointer-events-none border border-line bg-white/60 text-faint'
        : 'cursor-pointer sg-card sg-raise text-foreground hover:bg-brand-600 hover:border-brand-600 hover:text-white'
    }`;

  if (visibleProducts.length === 0) return null;

  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
      <SectionHead
        kicker="Just landed"
        title="New arrivals"
        lead="The freshest additions to the collection, added this week."
        href="/shop?sort=newest"
      />

      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => handleScroll("left")}
          disabled={isMounted ? !canLeft : false}
          className={`absolute -left-3 top-[38%] -translate-y-1/2 ${arrowBtn(isMounted ? !canLeft : false)}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => handleScroll("right")}
          disabled={isMounted ? !canRight : false}
          className={`absolute -right-3 top-[38%] -translate-y-1/2 ${arrowBtn(isMounted ? !canRight : false)}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleProducts.map((product, i) => (
            <div
              key={product.id}
              className="at-card-up shrink-0 snap-start min-w-[calc((100%-16px)/2.15)] md:min-w-[calc((100%-48px)/4)]"
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
