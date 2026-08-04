"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

interface RecentlyViewedProps {
  currentProductId: string;
}

export default function RecentlyViewed({ currentProductId }: RecentlyViewedProps) {
  const [viewedProducts, setViewedProducts] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    // Load from local storage
    const stored = localStorage.getItem("recently_viewed");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out current product to avoid showing what they are currently viewing
        const filtered = parsed.filter((p: any) => p.id !== currentProductId).slice(0, 12);
        setViewedProducts(filtered);
      } catch (err) {
        console.error("Failed to parse recently viewed products", err);
      }
    }
  }, [currentProductId]);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
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
  }, [updateArrows, viewedProducts]);

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

  if (viewedProducts.length === 0) return null;

  return (
    <section className="w-full py-[15px] md:py-5">
      <div className="mb-7 px-6 lg:px-8">
        <h2 className="at-heading text-at-subheading text-at-ink text-left">
          Recently Viewed
        </h2>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => handleScroll("left")}
          disabled={!canLeft}
          className={`absolute left-2 top-1/2 -translate-y-1/2 ${arrowBtn(!canLeft)}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => handleScroll("right")}
          disabled={!canRight}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${arrowBtn(!canRight)}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {viewedProducts.map((prod, i) => (
            <div
              key={prod.id}
              className="at-card-up shrink-0 snap-start min-w-[calc((100%-11.25px)/2.25)] md:min-w-[calc((100%-21.25px)/4.25)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ProductCard product={prod} idPrefix="rv" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
