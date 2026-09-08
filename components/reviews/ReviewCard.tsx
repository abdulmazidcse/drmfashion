import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { ReviewCardData } from "@/lib/reviews";

// Fixed locale and UTC: this renders on the server, and letting the browser's
// own locale re-format the date on hydrate would flag a mismatch.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating
              ? "fill-sig-copper-500 text-sig-copper-500"
              : "text-sig-copper-200"
          }`}
        />
      ))}
    </span>
  );
}

/** "Rafiul H." → "RH", for the avatar chip. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * One review, sized by whatever lays it out — the homepage grid gives it a
 * column, the /reviews listing gives it a grid cell. Kept presentational and
 * server-safe so both can use the same markup.
 */
export default function ReviewCard({
  review,
  clamp = true,
}: {
  review: ReviewCardData;
  /** The homepage grid needs every card the same height; the listing does not. */
  clamp?: boolean;
}) {
  return (
    <figure className="flex h-full flex-col justify-between rounded-sig border border-sig-line bg-sig-card px-[26px] py-7">
      <div>
        <Stars rating={review.rating} />

        <blockquote
          className={`mt-4 text-[15px] leading-[1.75] text-sig-ink/90 ${clamp ? "line-clamp-6" : ""}`}
        >
          {review.comment}
        </blockquote>
      </div>

      <figcaption className="mt-[22px] border-t border-sig-line pt-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sig-copper-100 text-sm font-extrabold text-sig-copper-700"
          >
            {initials(review.authorName)}
          </span>
          <span className="min-w-0">
            <b className="block text-sm font-bold text-sig-ink">{review.authorName}</b>
            <span className="text-xs text-sig-soft">
              Verified buyer · {dateFmt.format(new Date(review.createdAt))}
            </span>
          </span>
        </div>

        {review.product && (
          <Link
            href={`/product/${review.product.slug}`}
            className="group mt-4 flex items-center gap-3 border-t border-sig-line pt-4"
          >
            <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-sig-copper-50">
              <Image
                src={review.product.thumbnail}
                alt={review.product.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-sig-soft transition-colors group-hover:text-sig-copper-700">
              {review.product.title}
            </span>
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
