import Link from "next/link";
import HeroVideo from "./HeroVideo";
import HeroHighlightCard, { type HeroHighlight } from "./HeroHighlightCard";

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
  } | null;
  highlight?: HeroHighlight | null;
}

/**
 * Signature hero — a single split card rather than the full-bleed dual panel
 * this used to be.
 *
 * Both slides are still read from Settings and both still reach the visitor:
 * the leading one supplies the copy and the media, and the ghost button beside
 * the primary CTA carries either that slide's own second button or, with that
 * left blank, the other slide's call to action. So configuring the men's and
 * women's slides in Admin still drives what is on screen — it just resolves to
 * one card and two buttons instead of two half-width panels.
 */
export default function HomeHero({ slides, highlight }: HomeHeroProps) {
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

  const lead = activeSlides[0];
  const secondary = activeSlides[1] ?? null;

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
        <div className="grid min-h-[520px] overflow-hidden rounded-[26px] bg-sig-card shadow-sig lg:grid-cols-[1fr_1.02fr] lg:rounded-sig-lg">

          {/* ── Copy ── */}
          <div className="flex flex-col justify-center px-7 py-12 sm:px-14 sm:py-16">
            {lead.topBarTag && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-sig-aqua-50 px-[15px] py-2 text-xs font-bold tracking-[0.02em] text-sig-aqua-700">
                ◆ {lead.topBarTag}
              </span>
            )}

            <h1 className="mb-[18px] mt-5 text-[38px] font-extrabold leading-[1.04] tracking-[-0.035em] text-sig-ink sm:text-[clamp(38px,4.4vw,60px)]">
              {lead.title}
            </h1>

            <p className="max-w-[42ch] text-base leading-[1.75] text-sig-soft">
              {lead.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={lead.shopLink}
                className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-sig-copper-600 px-[30px] py-[15px] text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(160,99,47,0.85)] transition-all duration-200 hover:-translate-y-px hover:bg-sig-copper-500"
              >
                {lead.buttonText} →
              </Link>

              {ghostCta && (
                <Link
                  href={ghostCta.shopLink}
                  className="inline-flex items-center justify-center gap-2.5 rounded-full border-[1.5px] border-sig-line bg-sig-card px-[30px] py-[15px] text-sm font-bold text-sig-ink transition-colors duration-200 hover:border-sig-copper-400 hover:text-sig-copper-700"
                >
                  {ghostCta.buttonText}
                </Link>
              )}
            </div>

            {/* The same three promises the value-props strip further down the
                page makes — repeated here because this is where the decision to
                keep scrolling gets made. */}
            <div className="mt-9 flex flex-wrap gap-x-[22px] gap-y-3 border-t border-sig-line pt-[26px]">
              {[
                { mark: "✓", text: "Free shipping over $150" },
                { mark: "↺", text: "30-day easy returns" },
                { mark: "★", text: "Secure checkout" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5 text-[13px] font-semibold text-sig-soft">
                  <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-sig-aqua-50 text-[11px] font-extrabold text-sig-aqua-700">
                    {item.mark}
                  </span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* ── Media ── */}
          <div className="relative min-h-[340px] lg:min-h-0">
            <HeroVideo
              src={lead.video}
              poster={lead.poster}
              alt={lead.posterAlt || lead.title}
              priority
            />

            {/* Float card: a real product, passed down from the page's existing
                best-seller query rather than fetched again here. */}
            {highlight && <HeroHighlightCard highlight={highlight} />}
          </div>

        </div>
      </div>
    </section>
  );
}
