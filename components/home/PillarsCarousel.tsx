"use client";

import React, { useEffect, useState } from "react";
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

interface PillarsCarouselProps {
  initialTabs?: {
    heights?: TabContent;
    fit?: TabContent;
    purpose?: TabContent;
  } | null;
}

interface SizeOption {
  id: string;
  range: string;
  name: string;
  height: string;
  inseam: string;
}

// All media below are stand-ins from public/ — swap in the store's own photography.
const SIZES: Record<Gender, SizeOption[]> = {
  men: [
    { id: "men-1", range: "Short", name: "Short", height: "Trim through the leg", inseam: "30\"" },
    { id: "men-2", range: "Regular", name: "Regular", height: "Our standard block", inseam: "32\"" },
    { id: "men-3", range: "Long", name: "Long", height: "Extended rise and leg", inseam: "34\"" },
  ],
  women: [
    { id: "women-1", range: "Short", name: "Short", height: "Cropped through the leg", inseam: "28\"" },
    { id: "women-2", range: "Regular", name: "Regular", height: "Our standard block", inseam: "30\"" },
    { id: "women-3", range: "Long", name: "Long", height: "Extended rise and leg", inseam: "32\"" },
  ],
};

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
    label: "Our Fit",
    duration: 4000,
    heading: "Three lengths, one standard.",
    body:
      "Every style is graded in short, regular and long so the hem lands where it should on you — not where a single sample size decided it would.",
    cta: { text: "Learn More", href: "/shop" },
    type: "sizes" as const,
  },
  {
    label: "Our Fit",
    duration: 10000,
    heading: "The drm Fit, Perfected.",
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
      "We know the frustration of searching endlessly for clothing that fits — and coming up short. What started as one family's workshop in Dhaka has grown into a community with a shared standard for fit.",
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
  "sg-btn sg-btn-primary";

function GenderToggle({
  gender,
  onChange,
}: {
  gender: Gender;
  onChange: (g: Gender) => void;
}) {
  return (
    <div className="relative z-10 flex sg-card rounded-full p-1.5">
      <span
        className={`absolute bottom-1.5 left-1.5 top-1.5 w-[calc(50%-6px)] rounded-full bg-brand-600 transition-transform duration-300 ease-out ${
          gender === "women" ? "translate-x-[calc(100%+6px)]" : ""
        }`}
      />
      {(["men", "women"] as Gender[]).map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`relative z-10 min-w-[112px] cursor-pointer rounded-full p-2.5 text-center text-[14px] font-bold capitalize transition-colors duration-300 ${
            gender === g ? "text-white" : "text-soft hover:text-brand-700"
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

  // Dynamic content from the `home_community_tabs` Setting (heights/fit/purpose);
  // slide 3 (product) has no DB counterpart and stays static
  const slides = [
    mergeSlide(DEFAULT_SLIDES[0], initialTabs?.heights),
    mergeSlide(DEFAULT_SLIDES[1], initialTabs?.fit),
    mergeSlide(DEFAULT_SLIDES[2], initialTabs?.purpose),
    DEFAULT_SLIDES[3],
  ];

  // Heights tab image drives the men figure (its admin default is /images/men_hero.png)
  const figures: Record<Gender, string> = {
    men: initialTabs?.heights?.image || FIGURES.men,
    women: FIGURES.women,
  };

  // Autoplay: advance after the active slide's duration (reference does not pause on hover)
  useEffect(() => {
    const t = setTimeout(
      () => setActiveSlide((i) => (i + 1) % DEFAULT_SLIDES.length),
      DEFAULT_SLIDES[activeSlide].duration
    );
    return () => clearTimeout(t);
  }, [activeSlide]);

  const handleGender = (g: Gender) => {
    setGender(g);
    setActiveSize(null);
  };

  const selectedSize = SIZES[gender].find((s) => s.id === activeSize) || null;
  const showToggle = slides[activeSlide].type === "sizes" || slides[activeSlide].type === "compare";

  return (
    <section className="mx-auto w-full max-w-[1400px] px-5 sm:px-7 py-10 lg:py-14">
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
                <span className="absolute inset-0 rounded-full bg-line" />
                {i === activeSlide && (
                  <span
                    key={`bar-${i}-${gender}`}
                    className="absolute left-0 top-0 h-[3px] rounded-full bg-brand-600"
                    style={{
                      animation: `at-pillar-bar ${slide.duration}ms linear forwards`,
                    }}
                  />
                )}
              </span>
              <span
                className={`block pt-2 text-[12.5px] font-bold leading-[14px] transition-colors duration-300 ${
                  i === activeSlide ? "text-foreground" : "text-faint"
                }`}
              >
                {slide.label}
              </span>
            </button>
          ))}
        </div>

        {/* Media column (right on desktop, spans both rows) */}
        <div className="order-2 mt-4 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0">
          {/* Media box: 80%-ratio landscape desktop, square mobile; slides crossfade */}
          <div className="relative aspect-square overflow-hidden rounded-sg bg-brand-50 md:aspect-5/4">
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
                    <img
                      key={gender}
                      src={figures[gender]}
                      alt=""
                      className={`absolute inset-x-0 bottom-0 mx-auto h-[85%] object-contain ${
                        i === activeSlide ? "at-media-zoom" : ""
                      }`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    {/* Height/Inseam callout */}
                    {selectedSize && (
                      <div className="absolute bottom-[100px] right-[10%] z-10 flex flex-col gap-4 border-r border-line pr-4 text-right animate-fade-in">
                        <span className="text-2xl font-extrabold">{selectedSize.name}</span>
                        <span>
                          <span className="sg-kicker block text-faint">Fit</span>
                          <span className="text-xl font-extrabold">{selectedSize.height}</span>
                        </span>
                        <span>
                          <span className="sg-kicker block text-faint">Inseam</span>
                          <span className="text-xl font-extrabold">{selectedSize.inseam}</span>
                        </span>
                      </div>
                    )}
                    {/* Size-range buttons */}
                    <div className="absolute bottom-[30px] left-1/2 z-10 flex -translate-x-1/2 gap-[5px]">
                      {SIZES[gender].map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setActiveSize(size.id)}
                          className={`h-10 w-[104px] cursor-pointer rounded-full text-[13px] font-bold shadow-sg transition-colors ${
                            activeSize === size.id
                              ? "bg-brand-600 text-white"
                              : "bg-white text-soft hover:bg-brand-600 hover:text-white"
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
                      before={COMPARE[gender].before}
                      after={COMPARE[gender].after}
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

                {slide.type === "video" && (
                  <video
                    className={`h-full w-full object-cover ${
                      i === activeSlide ? "at-media-zoom" : ""
                    }`}
                    // Every slide is mounted at once (inactive ones are just
                    // opacity-0), so an unconditional `src` + `autoPlay` had the
                    // browser downloading clips nobody was looking at. Only the
                    // visible slide gets a source.
                    src={i === activeSlide ? slide.video : undefined}
                    poster={slide.poster}
                    preload="none"
                    autoPlay={i === activeSlide}
                    muted
                    loop
                    playsInline
                  />
                )}
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
                <h2 className="text-[28px] font-extrabold sm:text-[34px]">
                  {slide.heading}
                </h2>
                <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-soft md:text-[17px]">
                  {slide.body}
                </p>
                {slide.cta && (
                  <Link href={slide.cta.href} className={`mt-9 ${darkBtn}`}>
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
