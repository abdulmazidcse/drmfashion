"use client"

import { useEffect } from "react"

/**
 * Fires a single view ping per browser session for a journal post.
 * Kept client-side because the article page itself is statically revalidated.
 */
export default function JournalViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `ag_journal_viewed_${slug}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      /* storage blocked — still count the view */
    }

    fetch(`/api/journal/${slug}/view`, { method: "POST", keepalive: true }).catch(() => {})
  }, [slug])

  return null
}
