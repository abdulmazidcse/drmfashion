"use client";

import { parseYouTubeId, youtubeEmbedSrc } from "@/lib/externalVideo";

/**
 * Drop-in replacement for a bare `<video>` tag in the homepage Video Banner
 * and Reels sections: renders a real `<video>` for an uploaded file or a
 * direct video-file URL (unchanged from before), or a YouTube iframe when
 * `src` is a YouTube link. The parent's IntersectionObserver keeps working
 * unchanged — it just needs to query `"video, iframe[data-yt-embed]"` and
 * call `controlEmbeddedMedia` (lib/externalVideo.ts) instead of `.play()`/
 * `.pause()` directly, since an iframe has neither method.
 */
export default function HomeVideoMedia({
  src,
  poster,
  className,
  tabIndex,
  ariaHidden,
}: {
  src: string;
  poster?: string;
  className?: string;
  tabIndex?: number;
  ariaHidden?: boolean;
}) {
  const youtubeId = parseYouTubeId(src);

  if (youtubeId) {
    return (
      <iframe
        data-yt-embed="true"
        // No `origin` param: it's an optional hardening YouTube supports, but
        // deriving it from `window.location` would render differently on the
        // server than after hydration and break the match.
        src={youtubeEmbedSrc(youtubeId)}
        className={className}
        title="Embedded video"
        allow="autoplay; encrypted-media"
        frameBorder={0}
        tabIndex={tabIndex}
        aria-hidden={ariaHidden}
      />
    );
  }

  return (
    <video
      src={src}
      poster={poster || undefined}
      muted
      loop
      playsInline
      preload="none"
      // Keeps older iOS from hoisting the clip into its native fullscreen player.
      webkit-playsinline="true"
      className={className}
      tabIndex={tabIndex}
      aria-hidden={ariaHidden}
    />
  );
}
