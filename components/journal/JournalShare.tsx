"use client"

import { useState } from "react"
import { Check, Link2 } from "lucide-react"

// lucide-react no longer ships brand marks, so the share icons are inline paths.
const FACEBOOK_PATH =
  "M13.5 9H15V6h-1.5C11.57 6 10 7.57 10 9.5V11H8v3h2v7h3v-7h2.5l.5-3h-3V9.5c0-.28.22-.5.5-.5Z"
const X_PATH =
  "M17.53 3h3.02l-6.6 7.54L21.75 21h-5.9l-4.63-6.05L5.93 21H2.9l7.06-8.07L2.25 3h6.05l4.18 5.53L17.53 3Zm-1.06 16.2h1.67L7.6 4.71H5.81L16.47 19.2Z"
const LINKEDIN_PATH =
  "M6.94 8.5H4V20h2.94V8.5ZM5.47 4a1.71 1.71 0 1 0 0 3.42 1.71 1.71 0 0 0 0-3.42ZM20 13.6c0-3.14-1.68-4.6-3.92-4.6-1.8 0-2.61 1-3.06 1.69V8.5H10.1c.04.83 0 11.5 0 11.5h2.92v-6.42c0-.26.02-.52.1-.7.2-.52.68-1.06 1.48-1.06 1.05 0 1.47.8 1.47 1.96V20H20v-6.4Z"

export default function JournalShare({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false)

  // Resolved in the browser so it works on any domain the store is served from.
  const url = typeof window === "undefined" ? `/journal/${slug}` : `${window.location.origin}/journal/${slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  }

  const links = [
    {
      label: "Share on Facebook",
      path: FACEBOOK_PATH,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "Share on X",
      path: X_PATH,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      label: "Share on LinkedIn",
      path: LINKEDIN_PATH,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ]

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-faint">Share</span>
      {links.map(({ label, path, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="flex h-9 w-9 items-center justify-center border border-line text-soft transition-colors hover:border-brand-600 hover:text-brand-700"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d={path} />
          </svg>
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link"
        title={copied ? "Link copied" : "Copy link"}
        className="flex h-9 w-9 cursor-pointer items-center justify-center border border-line text-soft transition-colors hover:border-brand-600 hover:text-brand-700"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
