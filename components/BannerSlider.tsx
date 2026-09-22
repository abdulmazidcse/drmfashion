"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import BannerCard from "./BannerCard";
import type { ActiveBanner } from "@/lib/banners";

const AUTOPLAY_MS = 5000;

/**
 * The home_top promo banners, sliding one at a time instead of the static
 * grid PromoBanners otherwise renders. Built on the same scroll-snap track
 * pattern as components/home/ProductRail.tsx — one full-width slide per
 * banner, native touch-swipe for free, autoplay layered on top.
 *
 * Only ever mounted with 2+ banners (see PromoBanners.tsx) — a single banner
 * stays the plain static hero strip, which needs none of this.
 */
export default function BannerSlider({ banners }: { banners: ActiveBanner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior });
  }, []);

  // Keeps `active` in sync whether the move came from autoplay, an arrow/dot
  // click, or the visitor swiping by hand — one source of truth either way.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!el.clientWidth) return;
        setActive(Math.round(el.scrollLeft / el.clientWidth));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Autoplay. Paused while hovered/touched/focused so a visitor reaching for
  // a banner's button doesn't have the slide change out from under them —
  // same intent as VideoBanner/Reels pausing off-screen, just gated on
  // pointer presence instead of scroll position.
  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const t = setTimeout(() => {
      scrollToIndex((active + 1) % count);
    }, AUTOPLAY_MS);

    return () => clearTimeout(t);
  }, [active, paused, count, scrollToIndex]);

  return (
    <div
      className="group/slider relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="w-full shrink-0 snap-center">
            <BannerCard banner={banner} hero />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous banner"
        onClick={() => scrollToIndex((active - 1 + count) % count)}
        className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover/slider:opacity-100 sm:h-11 sm:w-11"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next banner"
        onClick={() => scrollToIndex((active + 1) % count)}
        className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover/slider:opacity-100 sm:h-11 sm:w-11"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 sm:bottom-4">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            aria-label={`Go to banner ${i + 1}`}
            aria-current={i === active}
            onClick={() => scrollToIndex(i)}
            className={`pointer-events-auto h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
