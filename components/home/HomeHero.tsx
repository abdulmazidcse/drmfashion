"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HeroVideo from "./HeroVideo";
import HeroHighlightCard, { type HeroHighlight } from "./HeroHighlightCard";
import TrustBadges from "../TrustBadges";
import type { HeroSlideItem } from "@/lib/homeHeroSlides";

interface HomeHeroProps {
  /** Already filtered to active slides with an image or video — see lib/homeHeroSlides.ts. */
  slides: HeroSlideItem[];
  /** Milliseconds between auto-rotations when there's more than one slide; 0 disables it. */
  rotationInterval?: number;
  highlight?: HeroHighlight | null;
}

/**
 * Signature hero — an admin-managed list of slides (Admin → Settings →
 * Homepage → Hero Slider Settings), rotating through them when there's more
 * than one and a rotation interval is set. A single slide renders as a plain
 * static card; zero slides render nothing (only reachable if an admin
 * empties the list and saves — parseHomeHeroSlides otherwise guarantees at
 * least the two built-in defaults).
 */
export default function HomeHero({ slides, rotationInterval = 0, highlight }: HomeHeroProps) {
  // More than one slide: dots + crossfade machinery, regardless of autoplay.
  const canBrowse = slides.length > 1;
  // Autoplay is the narrower case — only while there's something to browse
  // *and* the admin hasn't set the interval to 0. Turning it off still
  // leaves the dots working; it only stops the timer.
  const autoplaying = canBrowse && rotationInterval > 0;

  const [activeIndex, setActiveIndex] = useState(0);
  // True while the pointer (or keyboard focus) is on the card — a visitor
  // reaching for a CTA shouldn't have the slide change out from under them.
  const [paused, setPaused] = useState(false);

  // Same "remaining budget survives a pause" timer technique as
  // components/home/PillarsCarousel.tsx and components/BannerSlider.tsx.
  const remainingRef = useRef(rotationInterval);

  useEffect(() => {
    remainingRef.current = rotationInterval;
  }, [activeIndex, rotationInterval]);

  useEffect(() => {
    if (!autoplaying || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const startedAt = Date.now();
    const t = setTimeout(() => {
      setActiveIndex(i => (i + 1) % slides.length);
    }, remainingRef.current);

    return () => {
      clearTimeout(t);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [activeIndex, paused, autoplaying, slides.length]);

  if (slides.length === 0) return null;

  // A single slide never advances `activeIndex`, so this is always 0 there;
  // with more than one it's just clamped defensively against a stale value.
  const displayIndex = canBrowse ? activeIndex % slides.length : 0;
  const shown = slides[displayIndex];

  return (
    <section className="bg-sig-cream pb-3 pt-8">
      <div className="sig-wrap">
        <div
          // The media box is held at ~3:2 on every screen so one upload size
          // (1800×1200, see the admin hint) fills it edge to edge: stacked
          // below xl it is aspect-[3/2] outright; side by side, its column is
          // 1.25fr and the row height scales at 35vw, which keeps it near 3:2
          // from 1366px up to 2560px.
          //
          // min-h only matters once copy and media sit side by side at xl: it
          // keeps that row tall enough for the image column. Applied
          // unconditionally it forced the mobile grid (copy and media
          // stacked in two auto rows) to stretch to fill it, which the copy
          // row's `justify-center` turned into a large blank gap below the
          // button rather than a shorter, tighter section.
          className="grid overflow-hidden rounded-[26px] bg-sig-card shadow-sig xl:min-h-[clamp(520px,35vw,900px)] xl:grid-cols-[1fr_1.25fr] lg:rounded-sig-lg"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >

          {/* ── Copy ── */}
          {/* order-2 below lg: media (the actual banner) is the first thing a
              phone visitor sees, copy follows underneath it. lg: restores DOM
              order — copy left, media right — since the grid-cols split only
              takes effect there. */}
          <div className="order-2 flex flex-col justify-center px-6 py-6 sm:px-14 sm:py-16 xl:order-1 xl:py-10 2xl:py-16">
            {/* Every slide's copy is mounted in the same grid cell and
                crossfaded — CSS Grid (not position:absolute) so the column
                still sizes itself to the current slide's content instead of
                collapsing, the same trick PillarsCarousel's text column uses.
                With rotation off only the shown slide need render at all. */}
            <div className="grid">
              {(canBrowse ? slides : [shown]).map((slide, i) => (
                <div
                  key={canBrowse ? i : 0}
                  className={`col-start-1 row-start-1 flex flex-col items-start transition-opacity duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] ${
                    !canBrowse || i === displayIndex ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  aria-hidden={canBrowse && i !== displayIndex}
                >
                  {slide.topBarTag && (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sig-aqua-50 px-[15px] py-2 text-xs font-bold tracking-[0.02em] text-sig-aqua-700">
                      ◆ {slide.topBarTag}
                    </span>
                  )}

                  <h1 className="mb-3 mt-4 text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] text-sig-ink sm:mb-[18px] sm:mt-5 sm:text-[clamp(38px,4.4vw,60px)] xl:text-[clamp(40px,3vw,64px)]">
                    {slide.title}
                  </h1>

                  <p className="max-w-[42ch] text-[14px] leading-[1.65] text-sig-soft sm:text-base sm:leading-[1.75]">
                    {slide.subtitle}
                  </p>

                  {slide.buttonText && slide.shopLink && (
                    <div className="mt-5 flex flex-wrap gap-3 sm:mt-8">
                      <Link
                        href={slide.shopLink}
                        tabIndex={!canBrowse || i === displayIndex ? undefined : -1}
                        className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-sig-copper-600 px-[30px] py-[15px] text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(160,99,47,0.85)] transition-all duration-200 hover:-translate-y-px hover:bg-sig-copper-500"
                      >
                        {slide.buttonText} →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canBrowse && (
              <div className="mt-4 flex gap-2 sm:mt-6">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Show slide ${i + 1}`}
                    aria-current={i === displayIndex}
                    onClick={() => setActiveIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === displayIndex ? "w-6 bg-sig-copper-600" : "w-1.5 bg-sig-line hover:bg-sig-copper-400"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* The same promises the value-props strip further down the page
                makes — repeated here because this is where the decision to keep
                scrolling gets made, and read from the one setting so the two
                cannot drift apart. */}
            <TrustBadges variant="hero" />
          </div>

          {/* ── Media ── */}
          {/* Mobile stacks media above copy in one column (the `order-1`
              above puts it first in visual order despite following copy in
              the DOM, so lg:'s side-by-side columns keep their original
              left-to-right source order), so this box's own size (not the
              grid row) decides its height. A fixed min-h alone
              made it nearly square on most phones — much narrower than a
              landscape photo — so a cropping fit cut hard off the left/right
              edges. Deliberately no min-h alongside the aspect-ratio: on a
              narrow phone a floor height wins over the ratio-computed one,
              which quietly makes the box taller/narrower than intended and
              re-introduces the same side-crop. aspect-[3/2] alone matches the
              3:2 a camera/product photo typically ships at (not 16:9, which
              is video-shaped); lg: hands sizing back to the grid row once
              side-by-side columns apply. HeroVideo renders with
              object-cover so the photo always fills the box with no blank
              bands; the admin hint asks for a 3:2 upload so the crop stays
              a thin edge strip. */}
          <div className="relative order-1 aspect-[3/2] bg-sig-cream xl:order-2 xl:aspect-auto xl:min-h-0">
            <HeroVideo
              key={displayIndex}
              src={shown.video}
              poster={shown.image}
              alt={shown.imageAlt || shown.title}
              priority
            />

            {/* Float card: a real product, passed down from the page's existing
                best-seller query rather than fetched again here. Constant
                across slides — it isn't per-slide data. */}
            {highlight && <HeroHighlightCard highlight={highlight} />}
          </div>

        </div>
      </div>
    </section>
  );
}
