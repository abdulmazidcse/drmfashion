"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import ReviewCard from "../reviews/ReviewCard";
import type { ReviewCardData } from "@/lib/reviews";

interface CustomerReviewsProps {
  reviews: ReviewCardData[];
}

export default function CustomerReviews({ reviews }: CustomerReviewsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  // Assumed true until layout can be measured: the server cannot know whether
  // the track overflows, and starting "Next" disabled makes it flicker on hydrate.
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();

    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const arrowBtn = (disabled: boolean) =>
    `z-20 flex h-11 w-11 items-center justify-center rounded-full transition-all ${
      disabled
        ? "pointer-events-none bg-white/30 text-at-ink/35"
        : "cursor-pointer border border-at-ink/15 bg-white text-at-ink hover:bg-at-ink hover:text-white"
    }`;

  return (
    <section className="w-full py-[15px] md:py-5">
      <div className="mb-7 flex flex-col items-start gap-2 px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <SectionHeading title="Tall fits. Real fans." highlight="Real fans." highlightStyle="muted" />
          <p className="text-[13px] font-light text-at-muted">
            Unedited words from customers who finally found their length.
          </p>
        </div>

        <Link
          href="/reviews"
          className="rounded-at-btn border border-at-ink px-7 py-3 text-[11px] font-bold uppercase tracking-widest text-at-ink transition-colors hover:bg-at-ink hover:text-white"
        >
          Shop the reviews
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => handleScroll("left")}
          disabled={!canLeft}
          className={`absolute left-2 top-1/2 -translate-y-1/2 ${arrowBtn(!canLeft)}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => handleScroll("right")}
          disabled={!canRight}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${arrowBtn(!canRight)}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth px-6 lg:px-8"
          style={{ scrollbarWidth: "none" }}
        >
          {reviews.map((review, i) => (
            <div
              key={review.id}
              className="at-card-up w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[23.5%]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
