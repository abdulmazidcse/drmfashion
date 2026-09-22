/**
 * External video links for the homepage Video Banner and Reels sections — an
 * alternative to uploading a file to site storage.
 *
 * The storage convention for an uploaded file is a bare filename (see
 * `normalizeStoredImageFilename` in lib/utils.ts); `formatImageUrl` already
 * passes any `http(s)://` value straight through unchanged. So a value
 * starting with `http` is unambiguously an external link — no separate
 * discriminator field needed, and every already-saved banner/reel (which is
 * always a bare filename) is untouched.
 */

export function isExternalVideoUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
]

/** The 11-character video id out of any common YouTube URL shape, or null for anything else. */
export function parseYouTubeId(url: string): string | null {
  const value = url.trim()
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = value.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Autoplay starts at 0 deliberately — the embed still has to be requested
 * (an iframe has no `preload="none"` equivalent), but actual playback is
 * triggered by the same IntersectionObserver that starts an uploaded clip,
 * via `controlEmbeddedMedia`, so an off-screen banner isn't burning bandwidth
 * before it's ever seen.
 */
export function youtubeEmbedSrc(id: string, origin?: string): string {
  const params = new URLSearchParams({
    autoplay: "0",
    mute: "1",
    loop: "1",
    playlist: id, // required by YouTube for a single video to loop
    controls: "0",
    playsinline: "1",
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
  })
  if (origin) params.set("origin", origin)
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
}

export function youtubeThumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

/**
 * Starts/stops playback on whatever kind of element the IntersectionObserver
 * handed back — a real `<video>` (unchanged behaviour) or a YouTube iframe
 * marked `data-yt-embed` (commanded via postMessage, since there is no
 * `.play()`/`.pause()` on an iframe). `enablejsapi=1` on the embed URL is
 * what makes YouTube accept these commands without loading their JS SDK.
 */
export function controlEmbeddedMedia(el: Element, play: boolean): void {
  if (el instanceof HTMLVideoElement) {
    if (play) el.play().catch(() => {})
    else el.pause()
    return
  }
  if (el instanceof HTMLIFrameElement && el.dataset.ytEmbed) {
    el.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: play ? "playVideo" : "pauseVideo", args: [] }),
      "*"
    )
  }
}
