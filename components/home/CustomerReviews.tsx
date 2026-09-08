import React from "react";
import SigSectionHead from "./SigSectionHead";
import ReviewCard from "../reviews/ReviewCard";
import type { ReviewCardData } from "@/lib/reviews";

interface CustomerReviewsProps {
  reviews: ReviewCardData[];
}

/**
 * Three reviews in a grid, as the reference lays them out.
 *
 * This used to be a scroll-snap carousel with arrows, which is why it was a
 * client component; a grid of three needs no state at all, so it renders on the
 * server and ships no JavaScript. Anyone who wants the rest follows the link in
 * the heading through to /reviews.
 */
export default function CustomerReviews({ reviews }: CustomerReviewsProps) {
  const visible = reviews.slice(0, 3);

  return (
    <section className="bg-sig-cream pb-12 pt-2.5 lg:pb-[70px]">
      <div className="sig-wrap">
        <SigSectionHead
          kicker="Loved by tall people"
          title="Tall fits. Real fans."
          subtitle="Unedited words from customers who finally found their length."
          ctaLabel="Read all reviews"
          ctaHref="/reviews"
        />

        <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
          {visible.map((review, i) => (
            <div key={review.id} className="at-card-up" style={{ animationDelay: `${i * 60}ms` }}>
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
