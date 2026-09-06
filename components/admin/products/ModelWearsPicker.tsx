"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import api from "@/lib/axios"
import { formatImageUrl } from "@/lib/utils"

type PickerProduct = { id: string; title: string; thumbnail: string | null }

type Props = {
  /** Selected product id, or "" for none. */
  value: string
  onChange: (id: string) => void
  /** Resolved details for a value already set when the form loads (edit view). */
  initial?: PickerProduct | null
  /** The product being edited — kept out of the results so it can't pick itself. */
  excludeId?: string
}

/**
 * Single-product search-and-pick for "Model is also wearing". Leaving it empty
 * hides that section on the storefront rather than falling back to a guess.
 */
export default function ModelWearsPicker({ value, onChange, initial, excludeId }: Props) {
  const [picked, setPicked] = useState<PickerProduct | null>(null)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<PickerProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Derived, not stored: whichever known product matches the current value —
  // the one just picked here, or the one the form loaded with.
  const chosen: PickerProduct | null =
    picked && picked.id === value
      ? picked
      : initial && initial.id === value
        ? initial
        : null

  useEffect(() => {
    if (!open) return
    let active = true
    const t = setTimeout(() => {
      setLoading(true)
      api
        .get("/admin/products", { params: { view: "picker", search, limit: 12 } })
        .then((res) => {
          if (!active) return
          const list: PickerProduct[] = res.data?.data ?? res.data ?? []
          setResults(list.filter((p) => p.id !== excludeId))
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false))
    }, 300)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [search, open, excludeId])

  // Close the results panel on an outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  function pick(p: PickerProduct) {
    setPicked(p)
    onChange(p.id)
    setOpen(false)
    setSearch("")
  }

  function clear() {
    setPicked(null)
    onChange("")
  }

  if (chosen) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
          {chosen.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formatImageUrl(chosen.thumbnail)} alt={chosen.title} className="h-full w-full object-cover" />
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">{chosen.title}</span>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          placeholder="Search a product to pair..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">No products found.</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {p.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formatImageUrl(p.thumbnail)} alt={p.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{p.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
