"use client"

import api from "@/lib/axios"

/**
 * Deferred image uploads for the admin product forms.
 *
 * Picking a file no longer hits the network. Instead the file is parked here and
 * a `blob:` object URL takes its place, so every existing `<img src={url}>` and
 * every `{ url, color }` / `variant.images[]` shape keeps working untouched — a
 * staged image is just a string like any saved one.
 *
 * On submit the form calls `resolvePendingUrls()` with every string it is about
 * to send. Only the staged ones are uploaded, each exactly once, and the caller
 * swaps them for the returned real URLs. Two variants sharing the same staged
 * photo share one blob URL, so they still cost a single upload.
 */

const registry = new Map<string, File>()

/** Park a file locally and hand back the placeholder URL to render right now. */
export function stagePendingFile(file: File): string {
  const url = URL.createObjectURL(file)
  registry.set(url, file)
  return url
}

/** True for a placeholder that still needs uploading — false for a saved URL. */
export function isPendingUrl(url: unknown): url is string {
  return typeof url === "string" && registry.has(url)
}

/** How many staged files are referenced by these URLs (deduplicated). */
export function countPending(urls: (string | undefined | null)[]): number {
  return new Set(urls.filter(isPendingUrl)).size
}

/** Drop a staged file the user removed before submitting. */
export function releasePendingUrl(url: unknown) {
  if (!isPendingUrl(url)) return
  URL.revokeObjectURL(url)
  registry.delete(url)
}

export type UploadProgress = { done: number; total: number }

/**
 * Uploads every staged URL in `urls` and returns a blobUrl → realUrl map.
 * Saved URLs pass through untouched and are absent from the map.
 *
 * Files go up one request at a time: a product can carry a dozen 2MB photos and
 * a single combined request would risk the body limit, plus this gives the form
 * a real "3 of 8" counter.
 */
export async function resolvePendingUrls(
  urls: (string | undefined | null)[],
  onProgress?: (progress: UploadProgress) => void
): Promise<Map<string, string>> {
  const pending = Array.from(new Set(urls.filter(isPendingUrl)))
  const resolved = new Map<string, string>()
  if (pending.length === 0) return resolved

  onProgress?.({ done: 0, total: pending.length })

  for (const [index, blobUrl] of pending.entries()) {
    const file = registry.get(blobUrl)
    if (!file) continue

    const formData = new FormData()
    formData.append("files", file)

    const res = await api.post("/admin/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

    const uploadedUrl: string | undefined = res.data?.urls?.[0] ?? res.data?.url
    if (!uploadedUrl) throw new Error(`Upload failed for ${file.name}`)

    resolved.set(blobUrl, uploadedUrl)
    onProgress?.({ done: index + 1, total: pending.length })
  }

  return resolved
}

/** Swap one URL for its uploaded counterpart, leaving saved URLs alone. */
export function applyResolved(url: string | undefined | null, resolved: Map<string, string>) {
  if (!url) return url
  return resolved.get(url) ?? url
}

/** Revoke the staged blob URLs once the product has been saved. */
export function releaseResolved(resolved: Map<string, string>) {
  for (const blobUrl of resolved.keys()) releasePendingUrl(blobUrl)
}
