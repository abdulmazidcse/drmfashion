"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import ProductCard from "@/components/ProductCard";

interface Variant {
  id: string;
  size: string;
  color: string;
  length: string | null;
  stock: number;
  price: number | null;
  image?: string | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  featured: boolean;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
  variants: Variant[];
}

interface ProductShowcaseProps {
  title: string;
  highlight?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  products: Product[];
  /** GA4 list id — one per row, so the strips can be told apart in reports. */
  listId?: string;
}

/**
 * An editorial strip of products under a headline ("Our Bestselling Jeans"),
 * using the shared <ProductCard> so hover swatches, photo arrows and quick
 * add work here exactly as in the other product rows.
 */
export default function ProductShowcase({
  title,
  highlight,
  subtitle,
  ctaLabel,
  ctaHref,
  products,
  listId = "showcase",
}: ProductShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  // Assumed true until layout can be measured: the server cannot know whether
  // the track overflows, and starting "Next" disabled makes it flicker on hydrate.
  const [canRight, setCanRight] = useState(true);

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

    // Product shots settle after the row has already been measured once.
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    Array.from(el.querySelectorAll("img")).forEach((img) => {
      if (!img.complete) img.addEventListener("load", updateArrows, { once: true });
    });

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, products]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Whole cards only, with equal gutters either side (no half-card peeking
    // at the edge), so a click advances exactly one row of visible cards.
    const card = el.firstElementChild as HTMLElement | null;
    const cs = getComputedStyle(el);
    const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const step = card ? card.offsetWidth + 5 : inner;
    const amount = Math.max(1, Math.round((inner + 5) / step)) * step;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const arrowBtn = (disabled: boolean) =>
    `z-20 flex h-11 w-11 items-center justify-center rounded-full transition-all ${
      disabled
        ? "pointer-events-none bg-white/30 text-at-ink/35"
        : "cursor-pointer border border-at-ink/15 bg-white text-at-ink shadow-sm hover:bg-at-ink hover:text-white"
    }`;

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-(--site-max) py-[15px] md:py-5">
      <div className="mb-7 flex flex-col gap-3 px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <SectionHeading title={title} highlight={highlight} highlightStyle="muted" />
          {subtitle && <p className="text-[13px] font-light text-at-muted">{subtitle}</p>}
        </div>

        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="self-start text-[12px] font-bold uppercase tracking-widest text-at-ink underline underline-offset-4 hover:text-at-muted md:self-auto"
          >
            {ctaLabel}
          </Link>
        )}
      </div>

      {/* Gutter lives on this wrapper, not the scroller: padding inside an
          overflow box still shows content scrolled into it, which left a sliver
          of the next card visible beside the arrow. */}
      <div className="relative px-6 lg:px-8">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => handleScroll("left")}
          disabled={!canLeft}
          className={`absolute left-2 top-[38%] -translate-y-1/2 ${arrowBtn(!canLeft)}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => handleScroll("right")}
          disabled={!canRight}
          className={`absolute right-2 top-[38%] -translate-y-1/2 ${arrowBtn(!canRight)}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product, i) => (
            // The same card as every other product row (colour swatches on
            // hover, photo arrows, the "+" quick add), so the sections behave
            // alike; only the row around it is this component's own.
            <div
              key={product.id}
              className="at-card-up shrink-0 snap-start w-[calc((100%-5px)/2)] md:w-[calc((100%-15px)/4)] xl:w-[calc((100%-20px)/5)] 3xl:w-[calc((100%-25px)/6)] 4xl:w-[calc((100%-30px)/7)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ProductCard product={product} idPrefix={listId} listId={listId} listName={title} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
