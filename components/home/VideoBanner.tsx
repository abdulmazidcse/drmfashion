"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import type { HomeVideoBanner } from "@/lib/homeVideoBanners";

const HEIGHTS: Record<HomeVideoBanner["height"], string> = {
  // Portrait on a phone, cinematic on a desktop — the two crops the admin
  // uploads are shaped for exactly these.
  short: "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]",
  medium: "aspect-[3/4] sm:aspect-[16/9]",
  tall: "h-[70vh] sm:h-[80vh] lg:h-[88vh]",
};

const ALIGNS: Record<HomeVideoBanner["align"], string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

/** A word inside the heading, picked out in the accent colour. */
function Heading({ heading, highlight, accent }: { heading: string; highlight: string; accent: string }) {
  if (!highlight) return <>{heading}</>;
  const idx = heading.indexOf(highlight);
  if (idx === -1) return <>{heading}</>;
  return (
    <>
      {heading.slice(0, idx)}
      <span className={accent}>{highlight}</span>
      {heading.slice(idx + highlight.length)}
    </>
  );
}

export default function VideoBanner({ banner }: { banner: HomeVideoBanner }) {
  const rootRef = useRef<HTMLElement>(null);

  // Neither <video> carries `autoPlay`, and both are preload="none". Playback
  // is started here instead, and only for the element that is both on screen
  // and actually displayed at the current breakpoint — otherwise the phone
  // downloads the 21:9 desktop cut it will never show, and vice versa.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const videos = Array.from(root.querySelectorAll("video"));
    if (videos.length === 0) return;

    // Reduced motion: leave both posters up. The copy is the point of the
    // banner; the footage is atmosphere, and atmosphere is what this setting
    // asks us to drop.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          // `offsetParent === null` is the cheap read of "display:none at this
          // breakpoint" — the hidden crop never gets asked to load.
          const displayed = video.offsetParent !== null;
          if (entry.isIntersecting && displayed) {
            // Autoplay can still be refused even when muted; there is nothing
            // to recover, the poster simply stays up.
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.25 }
    );

    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [banner.video, banner.videoMobile]);

  const light = banner.theme === "light";
  const textColor = light ? "text-white" : "text-at-ink";
  const accent = light ? "text-at-peach" : "text-at-muted";
  const primaryBtn = light
    ? "bg-white text-at-ink hover:bg-white/85"
    : "bg-at-ink text-white hover:bg-at-ink/85";
  const secondaryBtn = light
    ? "border border-white text-white hover:bg-white hover:text-at-ink"
    : "border border-at-ink text-at-ink hover:bg-at-ink hover:text-white";

  const hasCopy =
    banner.eyebrow || banner.heading || banner.subheading || banner.primaryLabel || banner.secondaryLabel;

  // Only split into two elements when there is a second file to switch to;
  // one video with no breakpoint classes is one fewer thing to get wrong.
  const mobileSrc = banner.videoMobile || banner.video;
  const split = Boolean(banner.videoMobile);

  const videoClass = "absolute inset-0 h-full w-full object-cover";
  const videoProps = {
    muted: true,
    loop: true,
    playsInline: true,
    preload: "none" as const,
    // Keeps older iOS from hoisting the clip into its native fullscreen player.
    "webkit-playsinline": "true",
    tabIndex: -1,
    "aria-hidden": true,
  };

  return (
    <section ref={rootRef} className={`relative w-full overflow-hidden bg-at-ink ${HEIGHTS[banner.height]}`}>
      {split ? (
        <>
          <video
            {...videoProps}
            src={mobileSrc}
            poster={banner.posterMobile || banner.poster || undefined}
            className={`${videoClass} sm:hidden`}
          />
          <video
            {...videoProps}
            src={banner.video}
            poster={banner.poster || undefined}
            className={`${videoClass} hidden sm:block`}
          />
        </>
      ) : (
        <video
          {...videoProps}
          src={banner.video}
          poster={banner.poster || undefined}
          className={videoClass}
        />
      )}

      {banner.overlayOpacity > 0 && (
        <span
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: banner.overlayOpacity }}
        />
      )}

      {hasCopy && (
        <div
          className={`absolute inset-0 flex flex-col justify-center gap-5 px-6 py-12 sm:px-12 lg:px-20 ${ALIGNS[banner.align]} ${textColor}`}
        >
          {banner.eyebrow && (
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">
              {banner.eyebrow}
            </span>
          )}

          {banner.heading && (
            <h2 className="at-heading max-w-3xl text-3xl leading-[1.1] sm:text-at-subheading lg:text-at-hero">
              <Heading heading={banner.heading} highlight={banner.highlight} accent={accent} />
            </h2>
          )}

          {banner.subheading && (
            <p className="max-w-xl text-[14px] font-light leading-relaxed opacity-90 sm:text-base">
              {banner.subheading}
            </p>
          )}

          {/* A label with no link would render a button that does nothing, so
              each half needs both fields before it appears. */}
          {(banner.primaryLabel && banner.primaryHref) ||
          (banner.secondaryLabel && banner.secondaryHref) ? (
            <div className="mt-2 flex flex-wrap gap-3">
              {banner.primaryLabel && banner.primaryHref && (
                <Link
                  href={banner.primaryHref}
                  className={`rounded-at-btn px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${primaryBtn}`}
                >
                  {banner.primaryLabel}
                </Link>
              )}
              {banner.secondaryLabel && banner.secondaryHref && (
                <Link
                  href={banner.secondaryHref}
                  className={`rounded-at-btn px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${secondaryBtn}`}
                >
                  {banner.secondaryLabel}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
