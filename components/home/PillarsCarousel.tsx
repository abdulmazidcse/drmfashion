"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ImageCompare from "./ImageCompare";

type Gender = "men" | "women";

// Same shape as the admin-managed `home_community_tabs` Setting
// (written by app/(admin)/admin/settings, previously consumed by CommunitySection)
interface TabContent {
  label: string;
  heading: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

/** The product slide plays a video rather than showing a still. */
interface ProductTabContent extends TabContent {
  video: string;
  poster: string;
}

/**
 * Imagery that belongs to the carousel as a whole rather than to one tab: the
 * figure beside the height picker and the two before/after pairs behind the
 * comparison slider.
 */
interface PillarsMedia {
  figureMen?: string;
  figureWomen?: string;
  /**
   * One cut-out per height range, lined up side by side on the heights slide.
   * Each should be framed so the model fills more of the frame the taller the
   * range is — that framing is what makes the row read as a height ladder.
   * Any slot left empty falls back to the single figure above.
   */
  figureMen1?: string;
  figureMen2?: string;
  figureMen3?: string;
  figureWomen1?: string;
  figureWomen2?: string;
  compareMenBefore?: string;
  compareMenAfter?: string;
  compareWomenBefore?: string;
  compareWomenAfter?: string;
}

interface PillarsCarouselProps {
  initialTabs?: {
    heights?: TabContent;
    fit?: TabContent;
    purpose?: TabContent;
    product?: Partial<ProductTabContent>;
    media?: PillarsMedia;
  } | null;
}

interface SizeOption {
  id: string;
  range: string;
  name: string;
  height: string;
  inseam: string;
  /**
   * How tall the measuring rule beside the figure is drawn, as a percentage of
   * the media box. It grows with the range, so the bracket itself reads as the
   * height being described rather than being decoration around the numbers.
   */
  bracket: number;
}

// All media below are stand-ins from public/ — swap in the store's own photography.
const SIZES: Record<Gender, SizeOption[]> = {
  men: [
    { id: "men-1", range: "6' - 6'3\"", name: "Semi Tall", height: "6' 0\" - 6' 3\"", inseam: "34\"", bracket: 51 },
    { id: "men-2", range: "6'3\" - 6'7\"", name: "Tall", height: "6' 3\" - 6' 7\"", inseam: "36\"", bracket: 54 },
    { id: "men-3", range: "6'8\" - 7'1\"", name: "Extra Tall", height: "6' 8\" - 7' 1\"", inseam: "38\" - 40\"", bracket: 58 },
  ],
  women: [
    { id: "women-1", range: "5'9\" - 6'1\"", name: "Tall", height: "5' 9\" - 6' 1\"", inseam: "Up to 36\"", bracket: 54 },
    { id: "women-2", range: "6'2\" - 6'6\"", name: "Extra Tall", height: "6' 2\" - 6' 6\"", inseam: "36\" and up", bracket: 58 },
  ],
};

/**
 * Layout of the heights slide, shared by the figures and the measuring rule.
 *
 * Every range gets a third of the media box. At rest the figures fill the row
 * left to right (a two-range gender is centred by starting half a slot in);
 * picking one slides them all into the right-hand slot, where only the chosen
 * one stays visible. The rule then rises into the gap the others left behind.
 */
const SLOT = 100 / 3;
const FIGURE_TRANSITION = "transition-all duration-700 ease-[cubic-bezier(0.7,0,0.3,1)]";
/** Clears the size buttons pinned at the bottom of the media box. */
const FLOOR = "bottom-[76px] md:bottom-[90px]";
/** Clears the gender toggle pinned at the top of the media box. */
const CEILING = "top-[90px] md:top-[110px]";
// `top` + `bottom` alone don't stretch an <img> — replaced elements size from
// their intrinsic ratio unless height is explicit, so an explicit calc'd
// height (matching the CEILING/FLOOR offsets above) is required to actually
// fill the space between the toggle and the size buttons.
const FIGURE_HEIGHT = "h-[calc(100%-166px)] md:h-[calc(100%-200px)]";

function slotLeft(index: number, count: number) {
  return (index + (count === 2 ? 0.5 : 0)) * SLOT;
}

const FIGURES: Record<Gender, string> = {
  men: "/images/men_hero.png",
  women: "/images/women_hero.png",
};

const COMPARE: Record<Gender, { before: string; after: string }> = {
  men: { before: "/images/hero.jpg", after: "/images/olaszkolda-fashion-10318918.jpg" },
  women: { before: "/images/women_hero.png", after: "/images/fashion-show-1746622_1280.jpg" },
};

// Fallbacks when the `home_community_tabs` Setting is missing or partial
const DEFAULT_SLIDES = [
  {
    label: "Our Heights",
    duration: 4000,
    heading: "Designed For Real Heights.",
    body:
      "Made specifically for height, our clothing is designed to fit tall men and women. Each piece is functionally built in multiple tall lengths so you don't have to compromise on fit.",
    cta: { text: "Learn More", href: "/shop" },
    type: "sizes" as const,
  },
  {
    label: "Our Fit",
    duration: 10000,
    heading: "The Tall Fit, Perfected.",
    body:
      "We're serious about fit. We spend thousands of hours measuring real people, collecting feedback, and working with skilled manufacturers to create the best fit possible.",
    cta: { text: "Learn More", href: "/shop" },
    type: "compare" as const,
  },
  {
    label: "Our Purpose",
    duration: 10000,
    heading: "We're All About Community.",
    body:
      "We know the frustration of searching endlessly for clothing that fits — and coming up short. What started as one family's mission to solve fit challenges has grown into a global community with a shared vision.",
    cta: { text: "Learn More", href: "/shop" },
    type: "image" as const,
    image: "/images/community.png",
  },
  {
    label: "Our Product",
    duration: 10000,
    heading: "Intentional Design.",
    body:
      "Every garment is created with purpose, whether it's a request from our community or a suggestion from our seasoned design team.",
    cta: null,
    type: "video" as const,
    video: "/videos/main-side-video.mp4",
    poster: "/images/hero.jpg",
  },
];

const darkBtn =
  "inline-flex h-10 min-w-[150px] items-center justify-center rounded-at-btn border border-at-ink bg-at-ink px-[15px] text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-at-ink";

function GenderToggle({
  gender,
  onChange,
}: {
  gender: Gender;
  onChange: (g: Gender) => void;
}) {
  return (
    <div className="relative z-10 flex rounded-at-btn bg-white">
      <span
        className={`absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-6px)] rounded-at-btn bg-at-ink transition-transform duration-300 ease-in ${
          gender === "women" ? "translate-x-[calc(100%+6px)]" : ""
        }`}
      />
      {(["men", "women"] as Gender[]).map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`relative z-10 min-w-[120px] cursor-pointer p-2.5 text-center text-[13px] font-semibold capitalize transition-colors duration-300 ${
            gender === g ? "text-white" : "text-at-muted"
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

type Slide = (typeof DEFAULT_SLIDES)[number];

// Per-field fallback (|| not spread) so empty admin fields fall back to defaults
function mergeSlide(slide: Slide, tab?: TabContent | null): Slide {
  if (!tab) return slide;
  return {
    ...slide,
    label: tab.label || slide.label,
    heading: tab.heading || slide.heading,
    body: tab.description || slide.body,
    cta:
      slide.cta && {
        text: tab.ctaText || slide.cta.text,
        href: tab.ctaLink || slide.cta.href,
      },
    ...("image" in slide && tab.image ? { image: tab.image } : {}),
  } as Slide;
}

export default function PillarsCarousel({ initialTabs }: PillarsCarouselProps) {
  // Reference starts on slide 1 (Our Fit)
  const [activeSlide, setActiveSlide] = useState(1);
  const [gender, setGender] = useState<Gender>("men");
  const [activeSize, setActiveSize] = useState<string | null>(null);
  /** True while the pointer (or keyboard focus) is inside the media column. */
  const [paused, setPaused] = useState(false);

  // Every slide comes from the `home_community_tabs` Setting, falling back
  // field by field to DEFAULT_SLIDES.
  const product = DEFAULT_SLIDES[3];
  const productTab = initialTabs?.product;
  const allSlides = [
    mergeSlide(DEFAULT_SLIDES[0], initialTabs?.heights),
    mergeSlide(DEFAULT_SLIDES[1], initialTabs?.fit),
    mergeSlide(DEFAULT_SLIDES[2], initialTabs?.purpose),
    {
      ...product,
      label: productTab?.label || product.label,
      heading: productTab?.heading || product.heading,
      body: productTab?.description || product.body,
      // `??`, not `||`, for the two media fields: the admin's Remove button
      // writes an empty string, and treating that as "unset" fell back to the
      // bundled demo clip — so a removed video kept playing on the storefront.
      // Text fields keep `||`, where an empty box really does mean "use the
      // default" rather than "show nothing".
      video: productTab?.video ?? product.video,
      poster: productTab?.poster ?? product.poster,
    },
  ];

  // With no clip the slide falls back to its poster; with neither there is
  // nothing left to show, so the slide and its tab drop out of the carousel.
  const slides = allSlides.filter(
    (slide) => slide.type !== "video" || slide.video || slide.poster
  );

  // The heights tab image doubles as the men figure — it is the same photo in
  // the same slot, so a separate field would only be a second way to set it.
  const media = initialTabs?.media;
  const figures: Record<Gender, string> = {
    men: media?.figureMen || initialTabs?.heights?.image || FIGURES.men,
    women: media?.figureWomen || FIGURES.women,
  };

  // One cut-out per range, falling back to the gender's single figure so a
  // store that has only uploaded the old two images still gets the animation —
  // three copies of the same photo sliding, rather than an empty row.
  const sizeFigures: Record<string, string> = {
    "men-1": media?.figureMen1 || figures.men,
    "men-2": media?.figureMen2 || figures.men,
    "men-3": media?.figureMen3 || figures.men,
    "women-1": media?.figureWomen1 || figures.women,
    "women-2": media?.figureWomen2 || figures.women,
  };

  const compare: Record<Gender, { before: string; after: string }> = {
    men: {
      before: media?.compareMenBefore || COMPARE.men.before,
      after: media?.compareMenAfter || COMPARE.men.after,
    },
    women: {
      before: media?.compareWomenBefore || COMPARE.women.before,
      after: media?.compareWomenAfter || COMPARE.women.after,
    },
  };

  // Autoplay. The countdown is a budget carried in a ref rather than a plain
  // timeout, so hovering the media column can freeze it mid-slide and resume
  // from where it stopped instead of restarting. "Our Heights" runs for four
  // seconds — not long enough to reach the men/women toggle before the slide
  // moved on underneath the pointer.
  //
  // Switching gender or picking a size also restarts the budget: the visitor
  // just changed the panel, so they should get the full slide to look at it.
  const interactionKey = `${gender}-${activeSize ?? ""}`;
  // Counted off `slides`, not DEFAULT_SLIDES: the product slide can be filtered
  // out above, and advancing modulo four would then land on an empty index.
  const slideCount = slides.length;
  const slideDuration = slides[activeSlide]?.duration ?? 10000;
  const remainingRef = useRef(slideDuration);

  useEffect(() => {
    remainingRef.current = slideDuration;
  }, [activeSlide, interactionKey, slideDuration]);

  useEffect(() => {
    if (paused) return;

    const startedAt = Date.now();
    const t = setTimeout(
      () => setActiveSlide((i) => (i + 1) % slideCount),
      remainingRef.current
    );

    return () => {
      clearTimeout(t);
      // Runs on pause and on slide change alike; the effect above puts the full
      // duration back when it was the slide that changed.
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [activeSlide, interactionKey, paused, slideCount]);

  const handleGender = (g: Gender) => {
    setGender(g);
    setActiveSize(null);
  };

  const selectedSize = SIZES[gender].find((s) => s.id === activeSize) || null;
  const activeType = slides[activeSlide]?.type;
  const showToggle = activeType === "sizes" || activeType === "compare";

  return (
    <section className="mx-auto max-w-[1920px] px-4 py-[15px] md:px-6 md:py-5">
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-rows-[auto_1fr] md:gap-x-10">
        {/* Tabs at top of LEFT column: 3px track, 2px progress bar filling over the slide duration */}
        <div className="order-1 flex gap-[5px] px-2.5 py-[5px] md:col-start-1 md:row-start-1">
          {slides.map((slide, i) => (
            <button
              key={slide.label}
              onClick={() => setActiveSlide(i)}
              className="flex-1 cursor-pointer pb-2.5 text-left"
            >
              <span className="relative block h-[3px] w-full">
                <span className="absolute inset-0 bg-at-ink/20" />
                {i === activeSlide && (
                  <span
                    key={`bar-${i}-${interactionKey}`}
                    className="absolute left-0 top-0 h-[2px] bg-at-ink"
                    style={{
                      animation: `at-pillar-bar ${slide.duration}ms linear forwards`,
                      // Frozen in step with the timer above, so the bar never
                      // finishes while the slide is still being held open.
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                )}
              </span>
              <span
                className={`block pt-[5px] text-[12px] uppercase leading-[14px] tracking-wider transition-colors duration-300 ${
                  i === activeSlide ? "text-at-ink" : "text-[#CBCBCB]"
                }`}
              >
                {slide.label}
              </span>
            </button>
          ))}
        </div>

        {/* Media column (right on desktop, spans both rows).
            Autoplay holds while the pointer is inside it — every interactive
            control on the carousel (gender toggle, size ranges, the compare
            slider) lives in here, and they are unusable if the slide can change
            out from under them. Focus is covered too, for anyone tabbing in. */}
        <div
          className="order-2 mt-4 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Media box: 80%-ratio landscape desktop, square mobile; slides crossfade */}
          <div className="relative aspect-square overflow-hidden bg-[#F0F0F0] md:aspect-5/4">
            {slides.map((slide, i) => (
              <div
                key={slide.label}
                className={`absolute inset-0 transition-opacity duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] ${
                  i === activeSlide ? "z-10 opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={i !== activeSlide}
              >
                {slide.type === "sizes" && (
                  <>
                    {/* The whole ladder is mounted at once; only `left` and
                        `opacity` move, so the browser can interpolate rather
                        than swapping images mid-gesture. */}
                    {SIZES[gender].map((size, idx) => {
                      const chosen = activeSize === size.id;
                      return (
                        <img
                          key={size.id}
                          src={sizeFigures[size.id]}
                          // Not decorative: these figures are the only thing
                          // carrying which body each range describes.
                          alt={`${size.name} fit — ${gender === "women" ? "women's" : "men's"} ${size.height}`}
                          className={`absolute w-1/3 object-contain object-bottom ${CEILING} ${FIGURE_HEIGHT} ${FIGURE_TRANSITION}`}
                          style={{
                            // Once a range is picked every figure travels to the
                            // right-hand slot; the unchosen ones fade out on the
                            // way, leaving the chosen one standing beside the rule.
                            left: `${activeSize ? SLOT * 2 : slotLeft(idx, SIZES[gender].length)}%`,
                            opacity: !activeSize || chosen ? 1 : 0,
                          }}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      );
                    })}

                    {/* Measuring rule + Height/Inseam readout. Kept mounted and
                        slid out of frame rather than unmounted, so it animates
                        away as smoothly as it arrives. */}
                    <div
                      className={`pointer-events-none absolute right-1/3 z-10 border-r border-at-muted ${FLOOR} ${FIGURE_TRANSITION} ${
                        selectedSize
                          ? "translate-y-0 opacity-100"
                          : "translate-y-[calc(100%+90px)] opacity-0"
                      }`}
                      style={{ height: `${selectedSize?.bracket ?? 45}%` }}
                    >
                      {/* Tick pointing off the top of the rule at the figure. */}
                      <span className="absolute -right-10 top-0 block w-10 border-t border-at-muted" />

                      {/* Every readout stays mounted and cross-fades, so moving
                          between ranges does not blank the text mid-slide. */}
                      {SIZES[gender].map((size) => (
                        <div
                          key={size.id}
                          className={`absolute right-[30px] top-0 flex w-max flex-col gap-4 text-right transition-opacity duration-700 ${
                            activeSize === size.id ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden={activeSize !== size.id}
                        >
                          <span className="at-heading text-2xl text-at-ink">{size.name}</span>
                          <span>
                            <span className="block text-[12px] uppercase tracking-wider text-at-muted">Height</span>
                            <span className="at-heading text-xl text-at-ink">{size.height}</span>
                          </span>
                          <span>
                            <span className="block text-[12px] uppercase tracking-wider text-at-muted">Inseam</span>
                            <span className="at-heading text-xl text-at-ink">{size.inseam}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Size-range buttons */}
                    <div className="absolute bottom-[30px] left-1/2 z-10 flex -translate-x-1/2 gap-[5px]">
                      {SIZES[gender].map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setActiveSize(size.id)}
                          className={`h-10 w-[100px] cursor-pointer rounded-at-btn text-[13px] font-semibold transition-colors ${
                            activeSize === size.id
                              ? "bg-at-ink text-white"
                              : "bg-white text-at-muted hover:bg-at-ink hover:text-white"
                          }`}
                        >
                          {size.range}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {slide.type === "compare" && (
                  <div
                    key={gender}
                    className={`h-full w-full ${i === activeSlide ? "at-media-zoom" : ""}`}
                  >
                    <ImageCompare
                      before={compare[gender].before}
                      after={compare[gender].after}
                      alt="Fit comparison"
                    />
                  </div>
                )}

                {slide.type === "image" && (
                  <img
                    src={slide.image}
                    alt={slide.heading}
                    className={`h-full w-full object-cover ${
                      i === activeSlide ? "at-media-zoom" : ""
                    }`}
                    // Carousel sits well below the fold; all slides mount together.
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                )}

                {slide.type === "video" &&
                  (slide.video ? (
                    <video
                      className={`h-full w-full object-cover ${
                        i === activeSlide ? "at-media-zoom" : ""
                      }`}
                      // Every slide is mounted at once (inactive ones are just
                      // opacity-0), so an unconditional `src` + `autoPlay` had the
                      // browser downloading clips nobody was looking at. Only the
                      // visible slide gets a source.
                      src={i === activeSlide ? slide.video : undefined}
                      poster={slide.poster || undefined}
                      preload="none"
                      autoPlay={i === activeSlide}
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // No clip uploaded — the poster carries the slide on its own.
                    // A <video> with src="" would resolve against the page URL and
                    // have the browser try to decode the HTML document as media.
                    <img
                      src={slide.poster}
                      alt={slide.heading}
                      className={`h-full w-full object-cover ${
                        i === activeSlide ? "at-media-zoom" : ""
                      }`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ))}
              </div>
            ))}

            {/* Men/Women toggle (slides 0 & 1) */}
            {showToggle && (
              <div className="absolute left-1/2 top-[30px] z-20 -translate-x-1/2">
                <GenderToggle gender={gender} onChange={handleGender} />
              </div>
            )}
          </div>
        </div>

        {/* Text column (left on desktop below tabs, below media on mobile) */}
        <div className="order-3 flex items-center px-2.5 py-8 md:col-start-1 md:row-start-2 md:px-10 md:py-0 lg:px-16">
          <div className="grid w-full max-w-[400px] 2xl:max-w-[600px]">
            {slides.map((slide, i) => (
              <div
                key={slide.label}
                className={`col-start-1 row-start-1 flex flex-col items-start justify-center transition-opacity duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] ${
                  i === activeSlide ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-hidden={i !== activeSlide}
              >
                <h2 className="at-heading text-2xl text-at-ink md:text-at-subheading">
                  {slide.heading}
                </h2>
                <p className="mt-[30px] text-[15px] font-semibold leading-snug text-at-muted md:text-2xl md:leading-[28px]">
                  {slide.body}
                </p>
                {slide.cta && (
                  <Link href={slide.cta.href} className={`mt-10 ${darkBtn}`}>
                    {slide.cta.text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
