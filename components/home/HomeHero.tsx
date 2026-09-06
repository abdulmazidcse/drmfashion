import Link from "next/link";
import HeroVideo from "./HeroVideo";

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
  topBarTag?: string;
}

interface HomeHeroProps {
  slides?: {
    men?: SlideConfig;
    women?: SlideConfig;
  } | null;
}

export default function HomeHero({ slides }: HomeHeroProps) {
  const isMenActive = slides?.men?.active !== false;
  const isWomenActive = slides?.women?.active !== false;

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
    topBarTag: slides?.women?.topBarTag || "Made for Tall"
  };

  const activeSlides = [menSlide, womenSlide].filter(s => s.active);

  if (activeSlides.length === 0) {
    // If both are toggled off, default back to showing both as fallback
    menSlide.active = true;
    womenSlide.active = true;
    activeSlides.push(menSlide, womenSlide);
  }

  const isDual = activeSlides.length === 2;

  return (
    <section className={`relative w-full ${isDual ? "aspect-[16/10] md:aspect-[21/9] min-h-[400px] md:min-h-[500px]" : "aspect-[16/9] min-h-[340px] md:min-h-[400px]"} overflow-hidden bg-at-ink`}>
      {/* Absolute rather than `h-full`: the section gets its height from
          aspect-ratio, then min-h stretches it, and a percentage height still
          resolves against the aspect-ratio box — leaving the slides 219px tall
          inside a 400px section on a phone and painting the shortfall in
          bg-at-ink. Pinning to the section's edges makes the slides fill it
          however that height was arrived at. */}
      <div className={`absolute inset-0 grid ${isDual ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* pt on mobile keeps the centred copy clear of the header, which is
            overlaid on the hero rather than sitting above it. Padding shrinks the
            box being centred in, so the text settles below the header instead of
            being pushed off-centre. */}
        {activeSlides.map((slide, idx) => (
          <div key={idx} className="relative h-full w-full overflow-hidden group border-r border-white/5 last:border-0 flex flex-col justify-center pt-14 md:pt-0">
            {/* Background: optimised poster first, video attached later — see HeroVideo. */}
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
              <HeroVideo
                src={slide.video}
                poster={slide.poster}
                alt={slide.posterAlt || slide.title}
                priority={idx === 0}
              />
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-at-ink/80 via-at-ink/30 to-at-ink/20 transition-opacity duration-500 group-hover:opacity-90" />
            
            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center md:py-16 w-full">
              {slide.topBarTag && (
                <span className="text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2.5">
                  {slide.topBarTag}
                </span>
              )}
              <h2 className={`at-heading text-white font-extrabold uppercase tracking-tight ${isDual ? "text-base md:text-3xl lg:text-4xl" : "text-2xl md:text-5xl lg:text-6xl"}`}>
                {slide.title}
              </h2>
              <p className={`mt-2.5 max-w-md text-white/80 leading-relaxed mx-auto font-light ${isDual ? "text-[9px] md:text-xs lg:text-sm" : "text-[11px] md:text-sm lg:text-base"}`}>
                {slide.subtitle}
              </p>
              <div className="mt-6 md:mt-8">
                <Link
                  href={slide.shopLink}
                  className="inline-flex min-w-[130px] md:min-w-[170px] items-center justify-center rounded-at-btn bg-white px-5 py-2.5 md:px-6 md:py-3.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.05em] text-at-ink transition-all duration-300 hover:bg-white/95 hover:scale-105 shadow-md"
                >
                  {slide.buttonText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
