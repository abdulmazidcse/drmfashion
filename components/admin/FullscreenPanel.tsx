"use client"

import { ReactNode, useEffect, useState } from "react"
import { Maximize2, Minimize2 } from "lucide-react"

/**
 * Wraps an editor with a "Full screen" toggle for writing long HTML/code.
 *
 * Expanding only swaps this wrapper's classes — the editor inside is never
 * unmounted — so the content, cursor and undo history survive the switch, and
 * closing (button or Esc) puts everything back exactly as it was.
 */
export default function FullscreenPanel({
  children,
  label = "Full screen",
  className = "",
}: {
  children: (expanded: boolean) => ReactNode
  label?: string
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [expanded])

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[200] flex flex-col gap-3 bg-white p-4 sm:p-6"
          : `relative ${className}`
      }
    >
      <div className="flex items-center justify-end gap-3">
        {expanded && (
          <span className="mr-auto text-[11px] font-semibold text-zinc-400">Press Esc to close</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 transition hover:bg-zinc-100"
          aria-pressed={expanded}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {expanded ? "Close full screen" : label}
        </button>
      </div>
      <div className={expanded ? "min-h-0 flex-1 overflow-auto" : ""}>{children(expanded)}</div>
    </div>
  )
}
