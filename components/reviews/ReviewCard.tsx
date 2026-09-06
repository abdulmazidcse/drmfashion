import Link from "next/link";
import Image from "next/image";
import { Quote, Star } from "lucide-react";
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
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-at-ink text-at-ink" : "text-at-ink/20"}`}
        />
      ))}
    </span>
  );
}

/**
 * One review, sized by whatever lays it out — the homepage carousel gives it a
 * fixed-width snap track, the /reviews listing gives it a grid cell. Kept
 * presentational and server-safe so both can use the same markup.
 */
export default function ReviewCard({
  review,
  clamp = true,
}: {
  review: ReviewCardData;
  /** The carousel needs every card the same height; the listing does not. */
  clamp?: boolean;
}) {
  return (
    <figure className="flex h-full flex-col justify-between border border-at-ink/10 bg-white p-6">
      <div>
        <div className="flex items-center justify-between">
          <Stars rating={review.rating} />
          <Quote className="h-5 w-5 text-at-peach" />
        </div>

        <blockquote
          className={`mt-4 text-[14px] leading-relaxed text-at-ink ${clamp ? "line-clamp-6" : ""}`}
        >
          {review.comment}
        </blockquote>
      </div>

      <figcaption className="mt-6">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-at-muted">
          <span className="text-at-ink">{review.authorName}</span>
          <span className="h-3 w-px bg-at-ink/20" />
          <span>{dateFmt.format(new Date(review.createdAt))}</span>
        </div>

        {review.product && (
          <Link
            href={`/product/${review.product.slug}`}
            className="group mt-4 flex items-center gap-3 border-t border-at-ink/10 pt-4"
          >
            <span className="relative h-12 w-10 shrink-0 overflow-hidden bg-[#F0F0F0]">
              <Image
                src={review.product.thumbnail}
                alt={review.product.title}
                fill
                sizes="40px"
                className="object-cover"
              />
            </span>
            <span className="at-link-underline line-clamp-2 text-[12px] uppercase leading-[15px] tracking-wider text-at-ink">
              {review.product.title}
            </span>
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
