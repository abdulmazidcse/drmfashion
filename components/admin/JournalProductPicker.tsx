"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Search, X } from "lucide-react"
import api from "@/lib/axios"

type PickerProduct = {
  id: string
  title: string
  slug: string
  thumbnail: string | null
  basePrice: number
}

/**
 * Modal that builds a `[products …]` shortcode for the journal editor.
 * The storefront swaps it for a live product grid when rendering the article.
 */
export default function JournalProductPicker({
  open,
  onClose,
  onInsert,
}: {
  open: boolean
  onClose: () => void
  onInsert: (shortcode: string) => void
}) {
  const [products, setProducts] = useState<PickerProduct[]>([])
  const [selected, setSelected] = useState<PickerProduct[]>([])
  const [caption, setCaption] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    let active = true

    // Debounced so typing in the search box doesn't hammer the API.
    const timer = setTimeout(() => {
      setLoading(true)
      api
        .get("/products", { params: { q: search, limit: 24 } })
        .then((res) => {
          if (active) setProducts(Array.isArray(res.data?.products) ? res.data.products : [])
        })
        .catch((err) => {
          console.error(err)
          if (active) setProducts([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [open, search])

  if (!open) return null

  const toggle = (product: PickerProduct) => {
    setSelected((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : prev.length >= 4
          ? prev
          : [...prev, product]
    )
  }

  const handleInsert = () => {
    if (selected.length === 0) return
    const slugs = selected.map((p) => p.slug).join(", ")
    const trimmedCaption = caption.trim()
    onInsert(`[products ${slugs}${trimmedCaption ? ` | ${trimmedCaption}` : ""}]`)
    setSelected([])
    setCaption("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-950">Insert Product Grid</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Pick up to 4 products — they render as cards in the article.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-4 text-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none"
            />
          </div>

          {selected.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                >
                  {p.title}
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className="cursor-pointer text-zinc-400 transition-colors hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-16 text-center text-sm text-zinc-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {products.map((product) => {
                const isSelected = selected.some((p) => p.id === product.id)
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(product)}
                    className={`group relative cursor-pointer overflow-hidden rounded-lg border text-left transition-all ${
                      isSelected ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    <div className="aspect-[3/4] w-full bg-zinc-100">
                      {product.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.thumbnail} alt={product.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="p-2">
                      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-zinc-900">{product.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-400">{product.slug}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-6 py-4">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption shown under the grid"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-zinc-500">{selected.length}/4 selected</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-zinc-200 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={selected.length === 0}
                className="cursor-pointer rounded-lg bg-zinc-950 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
