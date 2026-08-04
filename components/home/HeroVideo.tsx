"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero background: an optimised poster image that is always the LCP element, with
 * the video layered on top only once it is safe to spend the bytes.
 *
 * Previously the hero rendered a bare `<video autoPlay muted loop>` with the `src`
 * inline and no `preload` hint. `autoplay muted` makes browsers fetch immediately,
 * so the homepage started pulling `public/videos/main-side-video.mp4` (49 MiB) and
 * a second clip in parallel — competing with the hero's own paint for bandwidth.
 *
 * Now:
 *  - `src` is not attached during SSR, so the initial HTML costs zero video bytes.
 *  - the poster goes through `next/image` (WebP, responsive srcset) instead of
 *    being handed to the browser as a full-resolution original via `poster=`.
 *  - the video is only attached once it is on screen, and never when the visitor
 *    has Data Saver on or asks for reduced motion.
 *  - below MIN_VIDEO_WIDTH the poster is all anyone gets. Phones are exactly where
 *    a multi-megabyte autoplay clip hurts most and where the hero fills the
 *    viewport, so "wait until visible" would not have saved them anything.
 *    Re-encode the source clips and this gate can be lowered or dropped.
 */
const MIN_VIDEO_WIDTH = 768;

interface HeroVideoProps {
  src: string;
  poster: string;
  alt: string;
  /** The first hero slide holds the LCP element and is fetched with high priority. */
  priority?: boolean;
}

export default function HeroVideo({ src, poster, alt, priority = false }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia(`(min-width: ${MIN_VIDEO_WIDTH}px)`).matches) return;

    // Honour Data Saver where the browser exposes it (Chromium only).
    const { connection } = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    if (connection?.saveData) return;

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        // Let the LCP paint and hydration settle before competing for bandwidth.
        const { requestIdleCallback } = window as Window & {
          requestIdleCallback?: (cb: () => void) => void;
        };
        if (requestIdleCallback) {
          requestIdleCallback(() => setVideoSrc(src));
        } else {
          window.setTimeout(() => setVideoSrc(src), 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Image
        src={poster}
        alt={alt}
        fill
        // Dual hero = two half-width columns; single hero spans the viewport.
        sizes="(max-width: 767px) 100vw, 50vw"
        priority={priority}
        className="h-full w-full object-cover"
      />
      {videoSrc && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          preload="none"
          autoPlay
          muted
          loop
          playsInline
        />
      )}
    </div>
  );
}
