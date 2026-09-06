"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import SectionHeading from "./SectionHeading";
import type { HomeReel } from "@/lib/homeReels";

interface ReelsProps {
  title: string;
  highlight: string;
  subtitle: string;
  reels: HomeReel[];
}

export default function Reels({ title, highlight, subtitle, reels }: ReelsProps) {
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

  // Only the clips actually on screen are allowed to decode frames — a row of
  // twelve autoplaying videos otherwise pins the main thread on a phone. The
  // <video> elements are `preload="none"`, so an off-screen reel costs nothing
  // but its poster until the observer reaches it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const videos = Array.from(el.querySelectorAll("video"));
    if (videos.length === 0) return;

    // Respect the OS "reduce motion" setting: leave every poster in place and
    // let the play badge invite a tap instead.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            // Autoplay is rejected on some browsers even when muted; there is
            // nothing to recover, the poster simply stays up.
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.4 }
    );

    videos.forEach(v => io.observe(v));
    return () => io.disconnect();
  }, [reels]);

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
      <div className="mb-7 flex flex-col gap-2 px-6 lg:px-8">
        <SectionHeading title={title} highlight={highlight} highlightStyle="muted" />
        {subtitle && <p className="text-[13px] font-light text-at-muted">{subtitle}</p>}
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
          className="no-scrollbar flex snap-x snap-mandatory gap-[5px] overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {reels.map((reel, i) => {
            const tile = (
              <>
                <video
                  src={reel.video}
                  poster={reel.poster || undefined}
                  muted
                  loop
                  playsInline
                  preload="none"
                  // Keeps older iOS from hoisting the clip into its native
                  // fullscreen player, which `playsInline` alone did not cover.
                  webkit-playsinline="true"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Bottom scrim: captions sit over footage of unknown brightness. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />

                <span className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>

                {reel.caption && (
                  <p className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 px-4 pb-4 text-[12px] font-semibold leading-snug tracking-wide text-white">
                    {reel.caption}
                  </p>
                )}
              </>
            );

            const shell =
              "group at-card-up relative aspect-9/16 shrink-0 snap-start overflow-hidden bg-[#F0F0F0] w-[calc((100%-11.25px)/2.25)] md:w-[calc((100%-21.25px)/4.25)] xl:w-[calc((100%-26.25px)/5.25)]";

            return reel.href ? (
              <Link
                key={i}
                href={reel.href}
                className={shell}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {tile}
              </Link>
            ) : (
              <div key={i} className={shell} style={{ animationDelay: `${i * 60}ms` }}>
                {tile}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
