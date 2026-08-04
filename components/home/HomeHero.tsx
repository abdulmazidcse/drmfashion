import Link from "next/link";
import Image from "next/image";
import HeroVideo from "./HeroVideo";

interface SlideConfig {
  active?: boolean;
  video?: string;
  videoFallback?: string;
  image?: string;
  title?: string;
  subtitle?: string;
  shopLink?: string;
  buttonText?: string;
  topBarTag?: string;
}

interface HomeHeroProps {
  slides?: {
    men?: SlideConfig;
    women?: SlideConfig;
  } | null;
}

/**
 * Signature hero: a single rounded white panel — copy on the left, media on the
 * right — rather than a full-bleed image. The admin still configures two slides
 * (men / women); the first active one drives the panel and the second becomes a
 * tap target in the corner of the media, so nothing an admin set up goes unused.
 */
export default function HomeHero({ slides }: HomeHeroProps) {
  const isMenActive = slides?.men?.active !== false;
  const isWomenActive = slides?.women?.active !== false;

  const menSlide = {
    active: isMenActive,
    video: slides?.men?.video || slides?.men?.videoFallback || "/videos/fashion.mp4",
    poster: slides?.men?.image || "/images/hero.jpg",
    title: slides?.men?.title || "Menswear that finally fits right.",
    subtitle: slides?.men?.subtitle || "Cut, graded and finished in-house. Proportions perfected.",
    buttonText: slides?.men?.buttonText || "Shop Men",
    shopLink: slides?.men?.shopLink || "/shop",
    topBarTag: slides?.men?.topBarTag || "New season"
  };

  const womenSlide = {
    active: isWomenActive,
    video: slides?.women?.video || slides?.women?.videoFallback || "/videos/main-side-video.mp4",
    poster: slides?.women?.image || "/images/olaszkolda-fashion-10318918.jpg",
    title: slides?.women?.title || "Elegance in every inch.",
    subtitle: slides?.women?.subtitle || "Contemporary womenswear with a considered drape and a precise length.",
    buttonText: slides?.women?.buttonText || "Shop Women",
    shopLink: slides?.women?.shopLink || "/shop",
    topBarTag: slides?.women?.topBarTag || "New season"
  };

  const activeSlides = [menSlide, womenSlide].filter(s => s.active);
  if (activeSlides.length === 0) activeSlides.push(menSlide, womenSlide);

  const lead = activeSlides[0];
  const second = activeSlides[1];

  const trust = [
    { icon: "✓", label: "Free delivery over ৳5,000" },
    { icon: "↺", label: "30-day easy returns" },
    { icon: "★", label: "4.8 from 2,140 reviews" },
  ];

  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 pt-6 sm:pt-9">
      <div className="sg-card sg-card-lg sg-raise overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] min-h-[520px]">

        {/* ── Copy ── */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14 order-2 lg:order-1">
          <span className="sg-chip self-start bg-aqua-50 text-aqua-700">
            ◆ {lead.topBarTag}
          </span>

          <h1 className="text-[36px] sm:text-[46px] lg:text-[54px] font-extrabold leading-[1.04] mt-5">
            {lead.title}
          </h1>

          <p className="text-soft text-[16px] leading-relaxed mt-4 max-w-[42ch]">
            {lead.subtitle}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link href={lead.shopLink} className="sg-btn sg-btn-primary">
              {lead.buttonText} →
            </Link>
            {second ? (
              <Link href={second.shopLink} className="sg-btn sg-btn-ghost">
                {second.buttonText}
              </Link>
            ) : (
              <Link href="/pages/size-charts" className="sg-btn sg-btn-ghost">
                Find my size
              </Link>
            )}
          </div>

          {/* Trust row — the reason the hero is a panel and not a photo: these
              three lines are what actually move a first-time visitor. */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 mt-9 pt-7 border-t border-line">
            {trust.map((t) => (
              <div key={t.label} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-soft">
                <span className="w-[22px] h-[22px] rounded-full bg-aqua-50 text-aqua-700 grid place-items-center text-[11px] font-extrabold">
                  {t.icon}
                </span>
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Media ── */}
        <div className="relative order-1 lg:order-2 min-h-[320px] lg:min-h-0">
          <HeroVideo
            src={lead.video}
            poster={lead.poster}
            alt={lead.title}
            priority
          />

          {/* Secondary slide, reduced to a tap target in the corner. */}
          {second && (
            <Link
              href={second.shopLink}
              className="absolute left-5 bottom-5 flex items-center gap-3.5 rounded-[18px] bg-white/95 backdrop-blur-sm p-3 pr-5 shadow-sg hover:bg-white transition-colors group/tile"
            >
              <span className="relative w-[46px] h-[58px] rounded-xl overflow-hidden shrink-0 bg-brand-50">
                <Image
                  src={second.poster}
                  alt={second.title}
                  fill
                  sizes="46px"
                  className="object-cover transition-transform duration-500 group-hover/tile:scale-105"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-aqua-700">
                  Also new
                </span>
                <span className="block text-[15px] font-bold leading-tight mt-1 line-clamp-1 max-w-[22ch]">
                  {second.buttonText}
                </span>
              </span>
            </Link>
          )}
        </div>

      </div>
    </section>
  );
}
