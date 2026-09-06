import { Star } from "lucide-react";

export interface SocialProofStats {
  /** Mean of every Review row, or null when nothing has been reviewed yet. */
  avgRating: number | null;
  reviewCount: number;
  /** Orders that were not cancelled — what "shipped" honestly means here. */
  orderCount: number;
  /** Distinct customers who have ordered at least once. */
  customerCount: number;
  publishedProducts: number;
}

/**
 * Every figure on this strip is counted out of the database rather than typed
 * into a setting — an invented "10,000 happy customers" is the one thing a
 * social-proof band cannot afford to be caught at.
 */
const nf = new Intl.NumberFormat("en-US");

/**
 * Rounds down to a readable step and marks it "+", so the strip reads as a
 * claim the store can always stand behind. Small numbers are left exact —
 * "7+" would be rounding for its own sake.
 */
function approx(n: number): string {
  if (n < 50) return nf.format(n);
  const step = n < 500 ? 10 : n < 5000 ? 100 : 1000;
  return `${nf.format(Math.floor(n / step) * step)}+`;
}

function Stat({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      {children}
      <span className="at-heading text-[28px] leading-none text-at-ink md:text-[34px]">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-at-muted">{label}</span>
    </div>
  );
}

export default function SocialProof({ stats }: { stats: SocialProofStats }) {
  const rating = stats.avgRating;

  return (
    <section className="w-full bg-at-peach/40 py-10 md:py-14">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-y-9 px-6 md:grid-cols-4 md:gap-y-0 lg:px-8">
        {rating !== null && (
          <Stat value={rating.toFixed(1)} label="Average rating">
            <span className="flex items-center gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i <= Math.round(rating) ? "fill-at-ink text-at-ink" : "text-at-ink/25"
                  }`}
                />
              ))}
            </span>
          </Stat>
        )}

        <Stat value={approx(stats.reviewCount)} label="Verified reviews" />
        <Stat value={approx(stats.customerCount)} label="Tall customers" />

        {/* With no rating yet the row would be three wide and lopsided, so the
            catalogue size takes the fourth slot only when it is needed. */}
        {rating !== null ? (
          <Stat value={approx(stats.orderCount)} label="Orders shipped" />
        ) : (
          <>
            <Stat value={approx(stats.orderCount)} label="Orders shipped" />
            <Stat value={approx(stats.publishedProducts)} label="Tall styles" />
          </>
        )}
      </div>
    </section>
  );
}
