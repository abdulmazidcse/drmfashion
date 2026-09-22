"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HeroVideo from "./HeroVideo";
import HeroHighlightCard, { type HeroHighlight } from "./HeroHighlightCard";
import TrustBadges from "../TrustBadges";

interface SlideConfig {
  active?: boolean;
  video?: string;
  videoFallback?: string;
  image?: string;
  /** Alt text for the poster; empty falls back to the slide title. */
  imageAlt?: string;
  title?: string;
  subtitle?: string;
  shopLink?: string;
  buttonText?: string;
  /** Optional second CTA. Both fields must be filled for it to render. */
  shopLink2?: string;
  buttonText2?: string;
  topBarTag?: string;
}

interface HomeHeroProps {
  slides?: {
    men?: SlideConfig;
    women?: SlideConfig;
    /**
     * Milliseconds between auto-rotations when both slides are active; 0
     * disables rotation (Admin → Settings → Homepage — "Rotation Animation
     * Interval", already saved, previously never read here).
     */
    rotationInterval?: number;
  } | null;
  highlight?: HeroHighlight | null;
}

/**
 * Signature hero — a split card that rotates between the Men and Women
 * slides when both are active and a rotation interval is set, and a single
 * static card otherwise.
 *
 * With rotation off (interval 0, or only one slide active) this still
 * behaves exactly as the single-card design did before: the lead slide
 * supplies the copy and media, and the ghost button beside the primary CTA
 * carries the other slide's call to action, so configuring both slides in
 * Admin still drives what's on screen even without motion.
 */
export default function HomeHero({ slides, highlight }: HomeHeroProps) {
  const isMenActive = slides?.men?.active !== false;
  const isWomenActive = slides?.women?.active !== false;
  const rotationInterval = Number(slides?.rotationInterval) || 0;

  // A slide only plays a video when one is configured. The bundled defaults used
  // to sit at the end of this chain, which made "no video" impossible to express:
  // clearing the field in Settings simply fell through to /videos/fashion.mp4.
  // Empty now means empty, and the slide shows its poster image alone.
  const menSlide = {
    active: isMenActive,
    video: slides?.men?.video?.trim() || slides?.men?.videoFallback?.trim() || "",
    posterAlt: slides?.men?.imageAlt?.trim() || "",
    poster: slides?.men?.image || "/images/hero.jpg",
    title: slides?.men?.title || "FINALLY, CLOTHES THAT FIT.",
    subtitle: slides?.men?.subtitle || "Designed specifically for tall men. Proportions perfected.",
    buttonText: slides?.men?.buttonText || "Shop Men",
    shopLink: slides?.men?.shopLink || "/shop",
    buttonText2: slides?.men?.buttonText2?.trim() || "",
    shopLink2: slides?.men?.shopLink2?.trim() || "",
    topBarTag: slides?.men?.topBarTag || "Made for Tall"
  };

  const womenSlide = {
    active: isWomenActive,
    video: slides?.women?.video?.trim() || slides?.women?.videoFallback?.trim() || "",
    posterAlt: slides?.women?.imageAlt?.trim() || "",
    poster: slides?.women?.image || "/images/olaszkolda-fashion-10318918.jpg",
    title: slides?.women?.title || "ELEGANCE IN EVERY INCH.",
    subtitle: slides?.women?.subtitle || "Tailored specifically for tall women. Modern style with perfect length.",
    buttonText: slides?.women?.buttonText || "Shop Women",
    shopLink: slides?.women?.shopLink || "/shop",
    buttonText2: slides?.women?.buttonText2?.trim() || "",
    shopLink2: slides?.women?.shopLink2?.trim() || "",
    topBarTag: slides?.women?.topBarTag || "Made for Tall"
  };

  const activeSlides = [menSlide, womenSlide].filter(s => s.active);

  if (activeSlides.length === 0) {
    // If both are toggled off, default back to showing both as fallback
    menSlide.active = true;
    womenSlide.active = true;
    activeSlides.push(menSlide, womenSlide);
  }

  const rotating = activeSlides.length === 2 && rotationInterval > 0;

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
    if (!rotating || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const startedAt = Date.now();
    const t = setTimeout(() => {
      setActiveIndex(i => (i + 1) % activeSlides.length);
    }, remainingRef.current);

    return () => {
      clearTimeout(t);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [activeIndex, paused, rotating, activeSlides.length]);

  // Not rotating always means "show the first slide" — `activeIndex` simply
  // stops advancing (the timer effect above no-ops while `!rotating`), so
  // ignoring it here is enough; no reset effect needed.
  const displayIndex = rotating ? activeIndex % activeSlides.length : 0;
  const lead = activeSlides[displayIndex];
  // The other slide, when there is one — carries the ghost CTA whether or not
  // rotation is on, same as before: both slides still reach the visitor.
  const secondary = activeSlides.length > 1 ? activeSlides[(displayIndex + 1) % activeSlides.length] : null;

  /**
   * The ghost button beside the primary CTA.
   *
   * The lead slide's own second button wins when Settings has both its label
   * and its link — an explicit choice about where this card should send people
   * second. With that left blank the slot falls back to what it has always
   * shown: the other slide's call to action.
   */
  const ghostCta =
    lead.buttonText2 && lead.shopLink2
      ? { buttonText: lead.buttonText2, shopLink: lead.shopLink2 }
      : secondary;

  return (
    <section className="bg-sig-cream pb-3 pt-8">
      <div className="sig-wrap">
        <div
          className="grid min-h-[520px] overflow-hidden rounded-[26px] bg-sig-card shadow-sig lg:grid-cols-[1fr_1.02fr] lg:rounded-sig-lg"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >

          {/* ── Copy ── */}
          <div className="flex flex-col justify-center px-7 py-12 sm:px-14 sm:py-16">
            {/* Every active slide's copy is mounted in the same grid cell and
                crossfaded — CSS Grid (not position:absolute) so the column
                still sizes itself to the current slide's content instead of
                collapsing, the same trick PillarsCarousel's text column uses. */}
            <div className="grid">
              {activeSlides.map((slide, i) => (
                <div
                  key={i}
                  className={`col-start-1 row-start-1 flex flex-col items-start transition-opacity duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] ${
                    i === displayIndex ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  aria-hidden={i !== displayIndex}
                >
                  {slide.topBarTag && (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sig-aqua-50 px-[15px] py-2 text-xs font-bold tracking-[0.02em] text-sig-aqua-700">
                      ◆ {slide.topBarTag}
                    </span>
                  )}

                  <h1 className="mb-[18px] mt-5 text-[38px] font-extrabold leading-[1.04] tracking-[-0.035em] text-sig-ink sm:text-[clamp(38px,4.4vw,60px)]">
                    {slide.title}
                  </h1>

                  <p className="max-w-[42ch] text-base leading-[1.75] text-sig-soft">
                    {slide.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={slide.shopLink}
                      tabIndex={i === displayIndex ? undefined : -1}
                      className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-sig-copper-600 px-[30px] py-[15px] text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(160,99,47,0.85)] transition-all duration-200 hover:-translate-y-px hover:bg-sig-copper-500"
                    >
                      {slide.buttonText} →
                    </Link>

                    {i === displayIndex && ghostCta && (
                      <Link
                        href={ghostCta.shopLink}
                        className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-sig-line bg-sig-card px-[30px] py-[15px] text-sm font-bold text-sig-ink transition-colors duration-200 hover:border-sig-copper-400 hover:text-sig-copper-700"
                      >
                        {ghostCta.buttonText}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {rotating && (
              <div className="mt-6 flex gap-2">
                {activeSlides.map((slide, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Show ${slide.title}`}
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
          <div className="relative min-h-[340px] lg:min-h-0">
            <HeroVideo
              key={displayIndex}
              src={lead.video}
              poster={lead.poster}
              alt={lead.posterAlt || lead.title}
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
