"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../ProductCard";

/**
 * A horizontal, snap-scrolling row of product cards with the Signature
 * arrow pair. BestSellers and NewArrivals both lay their cards out this way;
 * the arrows are returned separately so each section can place them in its
 * own heading row.
 */
export function useRail(deps: React.DependencyList = []) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateArrows, ...deps]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return {
    scrollRef,
    scroll,
    leftDisabled: isMounted ? !canLeft : false,
    rightDisabled: isMounted ? !canRight : false,
  };
}

export function RailArrows({
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  className = "",
}: {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  className?: string;
}) {
  const btn = (disabled: boolean) =>
    `grid h-[42px] w-[42px] place-items-center rounded-full border transition-colors ${
      disabled
        ? "pointer-events-none border-sg-line bg-white text-sg-faint"
        : "cursor-pointer border-sg-line bg-white text-sg-ink hover:border-sg-copper-400 hover:text-sg-copper-700"
    }`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button type="button" aria-label="Previous" onClick={onPrev} disabled={prevDisabled} className={btn(prevDisabled)}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Next" onClick={onNext} disabled={nextDisabled} className={btn(nextDisabled)}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function RailTrack({
  scrollRef,
  products,
  idPrefix,
  trackKey,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  products: any[];
  idPrefix: string;
  trackKey?: string;
}) {
  return (
    <div
      key={trackKey}
      ref={scrollRef}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 pt-1 sm:-mx-7 sm:px-7 lg:gap-5"
      style={{ scrollbarWidth: "none" }}
    >
      {products.map((product, i) => (
        <div
          key={product.id}
          className="at-card-up w-[calc((100%-16px)/1.7)] shrink-0 snap-start sm:w-[calc((100%-32px)/3)] lg:w-[calc((100%-60px)/4)]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <ProductCard product={product} idPrefix={idPrefix} />
        </div>
      ))}
    </div>
  );
}
