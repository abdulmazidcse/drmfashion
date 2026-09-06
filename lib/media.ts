import path from "path"
import { mkdir, readdir, stat } from "fs/promises"

/**
 * The media library is a plain directory under `public/`, so every file it
 * holds is also a static URL. That is what makes it useful — and what makes
 * path handling security-critical: a `../` that escapes the root would let the
 * admin browser read or delete arbitrary project files.
 */
export const MEDIA_ROOT = path.join(process.cwd(), "public", "uploads")
export const MEDIA_URL_PREFIX = "/uploads"

/** Extensions we are willing to serve from our own origin. */
const ALLOWED_EXTENSIONS = new Set([
  // images
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp", ".ico",
  // video
  ".mp4", ".webm", ".ogv", ".mov", ".m4v",
  // documents
  ".pdf",
])

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp", ".ico",
])

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogv", ".mov", ".m4v"])

export class MediaPathError extends Error {}

// Reserved on Windows even with a valid extension.
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

/** Strip a single name down to something safe to use as one path segment. */
export function sanitizeSegment(name: string) {
  const cleaned = String(name || "")
    .replace(/[\\/]/g, "-") // never let a name introduce a new level
    .replace(/[<>:"|?*]/g, "") // illegal on Windows
    // Drop control characters without a control-char regex literal.
    .split("").filter((ch) => ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127).join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "") // no dotfiles, no "." or ".."
    .replace(/\.+$/, "") // trailing dots are stripped by Windows anyway
    .slice(0, 120)

  return WINDOWS_RESERVED.test(cleaned) ? `_${cleaned}` : cleaned
}

/**
 * Resolve an untrusted relative path against MEDIA_ROOT.
 * Throws MediaPathError if the result would land outside the root.
 */
export function resolveMediaPath(relative?: string | null) {
  const rel = String(relative || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .join("/")

  const abs = path.resolve(MEDIA_ROOT, rel)
  if (abs !== MEDIA_ROOT && !abs.startsWith(MEDIA_ROOT + path.sep)) {
    throw new MediaPathError("Path escapes the media root")
  }
  return { abs, rel }
}

/** Public URL for a root-relative media path. */
export function mediaUrl(rel: string) {
  return `${MEDIA_URL_PREFIX}/${rel.split("/").map(encodeURIComponent).join("/")}`
}

export function isAllowedFile(filename: string) {
  return ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())
}

export function fileKind(filename: string): "image" | "video" | "file" {
  const ext = path.extname(filename).toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return "image"
  if (VIDEO_EXTENSIONS.has(ext)) return "video"
  return "file"
}

/**
 * Turn a desired filename into one that does not collide inside `dirAbs`,
 * appending `-1`, `-2`, … Keeps the readable original name instead of hashing
 * it, which matters when a whole folder is uploaded at once.
 */
export async function uniqueName(dirAbs: string, desired: string, isFile = true) {
  const ext = isFile ? path.extname(desired) : ""
  const base = (isFile ? path.basename(desired, ext) : desired) || "untitled"

  let candidate = `${base}${ext}`
  // Bounded so a pathological directory cannot spin here forever.
  for (let counter = 1; counter < 1000; counter++) {
    try {
      await stat(path.join(dirAbs, candidate))
      candidate = `${base}-${counter}${ext}`
    } catch {
      return candidate
    }
  }
  return `${base}-${Date.now()}${ext}`
}

export async function ensureMediaRoot() {
  await mkdir(MEDIA_ROOT, { recursive: true })
}

/** Count the immediate children of a folder, for the folder card subtitle. */
export async function countChildren(dirAbs: string) {
  try {
    return (await readdir(dirAbs)).length
  } catch {
    return 0
  }
}

/** Breadcrumb trail for a root-relative path, root first. */
export function breadcrumbsFor(rel: string) {
  const parts = rel ? rel.split("/") : []
  const crumbs = [{ name: "Media Library", path: "" }]
  parts.forEach((part, i) => {
    crumbs.push({ name: part, path: parts.slice(0, i + 1).join("/") })
  })
  return crumbs
}
