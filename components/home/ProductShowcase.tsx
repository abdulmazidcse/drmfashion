"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { useCurrency } from "@/providers/CurrencyProvider";
import { productImageAlt } from "@/lib/imageMeta";
import { trackSelectItem } from "@/lib/analytics";

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
  featured?: boolean;
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
 * An editorial strip of products under a headline ("Our Bestselling Jeans").
 *
 * Deliberately not <ProductCard>: this row is a shop-window, so the card is
 * just the photograph, the name, the colourway line and the price — no quick
 * add, no wishlist heart, no badges competing with the picture.
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
  const { formatPrice } = useCurrency();
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
    const amount = el.clientWidth * 0.8;
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
    <section className="w-full py-[15px] md:py-5">
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

      <div className="relative">
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
          {products.map((product, i) => {
            const colors = Array.from(
              new Set(product.variants.map((v) => v.color).filter(Boolean))
            );
            const primaryColor = colors[0] || "";
            const extraColors = colors.length - 1;
            const colorLabel = primaryColor
              ? extraColors > 0
                ? `${primaryColor}, +${extraColors} ${extraColors === 1 ? "color" : "colors"}`
                : primaryColor
              : "";

            // The second shot is whatever colourway photo the product carries
            // first — enough for a hover swap, and it costs no extra query.
            const hoverImage =
              product.variants.find((v) => v.image?.trim() && v.image !== product.thumbnail)?.image ||
              null;

            const price = product.discountPrice ?? product.basePrice;
            const hasDiscount =
              product.discountPrice != null && product.discountPrice < product.basePrice;

            return (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                id={`${listId}-${product.id}`}
                onClick={() =>
                  trackSelectItem(listId, title, {
                    item_id: product.id,
                    item_name: product.title,
                    price,
                    item_brand: product.brand?.name,
                    item_category: product.category?.name,
                  })
                }
                className="at-card-up group flex shrink-0 snap-start flex-col w-[calc((100%-11.25px)/2.25)] md:w-[calc((100%-21.25px)/4.25)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-3/4 w-full overflow-hidden bg-[#F0F0F0]">
                  <Image
                    src={product.thumbnail}
                    alt={productImageAlt({
                      title: product.title,
                      brand: product.brand?.name,
                      color: primaryColor,
                    })}
                    fill
                    sizes="(max-width: 768px) 45vw, 24vw"
                    className={`object-cover transition-opacity duration-500 ${
                      hoverImage ? "group-hover:opacity-0" : ""
                    }`}
                  />
                  {hoverImage && (
                    <Image
                      src={hoverImage}
                      alt=""
                      aria-hidden
                      fill
                      sizes="(max-width: 768px) 45vw, 24vw"
                      className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1 px-1 pt-3">
                  <h3 className="text-[14px] font-bold leading-snug text-at-ink group-hover:underline">
                    {product.title}
                  </h3>
                  {colorLabel && (
                    <p className="text-[13px] font-light text-at-muted">{colorLabel}</p>
                  )}
                  <p className="flex items-baseline gap-2 text-[14px] font-bold text-at-ink">
                    {formatPrice(price)}
                    {hasDiscount && (
                      <span className="text-[12px] font-light text-at-muted line-through">
                        {formatPrice(product.basePrice)}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
