/**
 * How large a file the admin allows to be uploaded.
 *
 * The reverse proxy in front of the app has its own ceiling
 * (`client_max_body_size`), and when that one bites it rejects the request
 * before any of our code runs — no log, no message, just a 413 the browser has
 * to guess at. So the proxy is set wide and the real decision is made here,
 * where it can be changed from Settings without touching the server and where a
 * refusal comes back as a sentence somebody can read.
 *
 * Two numbers rather than one because the upload route already treats video
 * differently — it streams it as raw binary precisely because a clip is an
 * order of magnitude larger than a photograph. One shared limit would either
 * make it impossible to upload a video or make it pointless for images.
 */

export const UPLOAD_MAX_MB_KEY = "upload_max_mb"
export const UPLOAD_MAX_VIDEO_MB_KEY = "upload_max_video_mb"

/** What `/api/upload` enforced in code before this was configurable. */
export const DEFAULT_UPLOAD_MAX_MB = 5

/**
 * Generous on purpose: the admin upload route has never capped video, so a
 * tighter default here would break clips that upload fine today.
 */
export const DEFAULT_UPLOAD_MAX_VIDEO_MB = 100

/** Below 1MB nothing useful fits; above 2GB no browser upload survives anyway. */
export const MIN_UPLOAD_MB = 1
export const MAX_UPLOAD_MB = 2048

export type UploadKind = "image" | "video"

export function clampUploadMb(raw: unknown, fallback: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_UPLOAD_MB, Math.max(MIN_UPLOAD_MB, Math.round(n)))
}

/** Anything that is not announced as a video is measured against the image limit. */
export function uploadKindFor(contentType: string | null | undefined): UploadKind {
  return (contentType || "").toLowerCase().startsWith("video/") ? "video" : "image"
}

export function uploadLimitMb(
  settings: Record<string, string> | undefined | null,
  kind: UploadKind
): number {
  return kind === "video"
    ? clampUploadMb(settings?.[UPLOAD_MAX_VIDEO_MB_KEY], DEFAULT_UPLOAD_MAX_VIDEO_MB)
    : clampUploadMb(settings?.[UPLOAD_MAX_MB_KEY], DEFAULT_UPLOAD_MAX_MB)
}

export function uploadLimitBytes(
  settings: Record<string, string> | undefined | null,
  kind: UploadKind
): number {
  return uploadLimitMb(settings, kind) * 1024 * 1024
}

/**
 * The refusal, worded for whoever is looking at the upload box rather than at
 * the server — it names the limit and where to change it.
 */
export function uploadTooLargeMessage(kind: UploadKind, limitMb: number): string {
  return `This ${kind} is larger than the ${limitMb}MB upload limit. Compress it, or raise the limit in Settings → Brand → Media Uploads.`
}
