"use client"

import { useState, useEffect, useMemo } from "react"
import api from "@/lib/axios"
import { Plus, Layers, Check, Images } from "lucide-react"
import Swal from "sweetalert2";
import { swatchStyle, type SwatchColor } from "@/lib/colorStyle"
import { stagePendingFile, releasePendingUrl } from "@/lib/pendingUploads"

type Variant = {
  size: string
  color: string
  length?: string
  stock: number
  sku: string
  image?: string
  images: any
}

type Props = {
  /** Receives every generated row at once — one colour × many sizes. */
  onAdd: (variants: Variant[]) => void
  /** Rows already on the form: used to skip duplicates and reuse that colour's photos. */
  existing?: Variant[]
}

type DBSize = {
  id: string
  name: string
  value: string
}

type DBColor = SwatchColor & {
  id: string
  name: string
  value: string
}

type DBLength = {
  id: string
  name: string
  value: string
}

/** `Navy Blue` + `2XL` → `NAVY-BLUE-2XL`, safe for a SKU segment. */
function skuPart(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function VariantForm({ onAdd, existing = [] }: Props) {
  const [color, setColor] = useState("")
  const [sizes, setSizes] = useState<string[]>([])
  const [lengths, setLengths] = useState<string[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [defaultStock, setDefaultStock] = useState(0)
  const [skuPrefix, setSkuPrefix] = useState("")
  const [images, setImages] = useState<string[]>([])

  const [dbSizes, setDbSizes] = useState<DBSize[]>([])
  const [dbColors, setDbColors] = useState<DBColor[]>([])
  const [dbLengths, setDbLengths] = useState<DBLength[]>([])

  useEffect(() => {
    async function loadOptions() {
      try {
        const sizesRes = await api.get("/admin/sizes")
        setDbSizes(sizesRes.data)
        const colorsRes = await api.get("/admin/colors")
        setDbColors(colorsRes.data)
        const lengthsRes = await api.get("/admin/lengths")
        setDbLengths(lengthsRes.data)
      } catch (error) {
        console.log("Error loading variants options:", error)
      }
    }
    loadOptions()
  }, [])

  const activeColor = dbColors.find((c) => c.name === color)

  /** Combos of this colour already on the form — greyed out so they can't be re-added. */
  const takenKeys = useMemo(
    () =>
      new Set(
        existing
          .filter((v) => v.color === color)
          .map((v) => `${v.size}__${v.length || ""}`)
      ),
    [existing, color]
  )

  /** Every size already covered for this colour, regardless of length. */
  const takenSizes = useMemo(
    () => new Set(existing.filter((v) => v.color === color).map((v) => v.size)),
    [existing, color]
  )

  // Picking a colour pulls in the photos already attached to that colour, so the
  // second batch of sizes never needs the same upload again.
  function handleColorChange(next: string) {
    setColor(next)
    const previous = existing.find(
      (v) => v.color === next && Array.isArray(v.images) && v.images.length > 0
    )
    setImages(previous ? [...previous.images] : [])
  }

  function toggleSize(value: string) {
    const selected = sizes.includes(value)
    setSizes(selected ? sizes.filter((s) => s !== value) : [...sizes, value])
    if (!selected) {
      setStockMap((m) => ({ ...m, [value]: m[value] ?? defaultStock }))
    }
  }

  function toggleLength(value: string) {
    setLengths((prev) =>
      prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]
    )
  }

  function applyStockToAll(value: number) {
    setDefaultStock(value)
    setStockMap((m) => {
      const next = { ...m }
      sizes.forEach((s) => (next[s] = value))
      return next
    })
  }

  /** size × length, minus anything already added for this colour. */
  const pendingRows = useMemo(() => {
    const lengthList = lengths.length > 0 ? lengths : [undefined]
    const rows: { size: string; length?: string }[] = []
    for (const size of sizes) {
      for (const len of lengthList) {
        if (takenKeys.has(`${size}__${len || ""}`)) continue
        rows.push({ size, length: len })
      }
    }
    return rows
  }, [sizes, lengths, takenKeys])

  function handleAdd() {
    if (!color) {
      Swal.fire({ text: "Please select a color first.", confirmButtonColor: "#18181b" })
      return
    }
    if (sizes.length === 0) {
      Swal.fire({ text: "Please select at least one size.", confirmButtonColor: "#18181b" })
      return
    }
    if (pendingRows.length === 0) {
      Swal.fire({ text: "All of those size / length combinations already exist for this color.", confirmButtonColor: "#18181b" })
      return
    }

    const usedSkus = new Set(existing.map((v) => v.sku.toUpperCase()))
    const prefix = skuPart(skuPrefix) || `SKU-${Date.now().toString(36).toUpperCase()}`

    const generated: Variant[] = pendingRows.map(({ size, length }) => {
      const parts = [prefix, skuPart(color), skuPart(size)]
      if (length) parts.push(skuPart(length))

      let sku = parts.join("-")
      let n = 2
      while (usedSkus.has(sku)) sku = `${parts.join("-")}-${n++}`
      usedSkus.add(sku)

      return {
        size,
        color,
        length,
        stock: stockMap[size] ?? defaultStock,
        sku,
        image: images.length > 0 ? images[0] : undefined,
        images: [...images],
      }
    })

    onAdd(generated)

    setSizes([])
    setLengths([])
    setStockMap({})
    setDefaultStock(0)
    setSkuPrefix("")
    setImages([])
  }

  // Files are only staged here — the real upload runs when the product form is
  // submitted, so abandoning the page costs nothing on the server.
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const staged: string[] = []
    for (let i = 0; i < files.length; i++) {
      staged.push(stagePendingFile(files[i]))
    }
    setImages((prev) => [...prev, ...staged])
    e.target.value = ""
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const url = prev[index]
      // Only drop the staged file if no already-added variant still points at it.
      const stillUsed = existing.some(
        (v) => Array.isArray(v.images) && v.images.includes(url)
      )
      if (!stillUsed) releasePendingUrl(url)
      return prev.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/40">
        <Layers className="text-primary w-4 h-4" />
        <h4 className="font-bold text-sm text-foreground">Add Stock Variants</h4>
        <span className="text-[10px] font-medium text-zinc-500">
          One color, all its sizes — images uploaded once.
        </span>
      </div>

      {/* STEP 1 — COLOR */}
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
          1. Color
        </label>
        <div className="flex items-center gap-2">
          {activeColor && (
            <span
              className="w-9 h-9 shrink-0 rounded-xl border border-zinc-200 shadow-sm"
              style={swatchStyle(activeColor)}
            />
          )}
          <select
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full sm:max-w-xs border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white text-xs font-semibold transition"
          >
            <option value="">Select Color</option>
            {dbColors.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* STEP 2 — SIZES (MULTI SELECT) */}
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
          2. Sizes {sizes.length > 0 && <span className="text-primary">· {sizes.length} selected</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {dbSizes.map((s) => {
            const selected = sizes.includes(s.value)
            const alreadyAdded = takenSizes.has(s.value)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSize(s.value)}
                title={alreadyAdded ? "Already added for this color" : s.name}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 cursor-pointer ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : alreadyAdded
                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 line-through"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-primary/50"
                }`}
              >
                {selected && <Check className="w-3 h-3" />}
                {s.value}
              </button>
            )
          })}
          {dbSizes.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSizes(
                  sizes.length === dbSizes.length ? [] : dbSizes.map((s) => s.value)
                )
              }
              className="px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition cursor-pointer"
            >
              {sizes.length === dbSizes.length ? "Clear" : "Select all"}
            </button>
          )}
        </div>
      </div>

      {/* STEP 3 — LENGTHS (OPTIONAL MULTI SELECT) */}
      {dbLengths.length > 0 && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            3. Lengths (Optional — none = standard)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {dbLengths.map((l) => {
              const selected = lengths.includes(l.value)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLength(l.value)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 cursor-pointer ${
                    selected
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {selected && <Check className="w-3 h-3" />}
                  {l.value}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 4 — STOCK PER SIZE + SKU PREFIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            Stock (applies to every selected size)
          </label>
          <input
            type="number"
            value={defaultStock}
            onChange={(e) => applyStockToAll(Math.max(0, Number(e.target.value)))}
            placeholder="Units"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white text-xs font-semibold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            SKU Prefix (Optional)
          </label>
          <input
            type="text"
            value={skuPrefix}
            onChange={(e) => setSkuPrefix(e.target.value)}
            placeholder="e.g. TSH  →  TSH-RED-XL"
            className="w-full border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-white text-xs font-semibold uppercase placeholder:normal-case placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* PER-SIZE STOCK OVERRIDE */}
      {sizes.length > 0 && (
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            Fine-tune stock per size
          </label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <div key={s} className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2 py-1">
                <span className="text-[10px] font-bold uppercase text-zinc-500 w-8">{s}</span>
                <input
                  type="number"
                  value={stockMap[s] ?? defaultStock}
                  onChange={(e) =>
                    setStockMap((m) => ({ ...m, [s]: Math.max(0, Number(e.target.value)) }))
                  }
                  className="w-16 border-0 focus:outline-none text-xs font-semibold text-zinc-900"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IMAGE UPLOAD — ONCE PER COLOR */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Images for {color || "this color"} — shared by every size above
        </label>
        <label className="w-full bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-800 font-bold py-2.5 px-4 rounded-xl cursor-pointer text-xs transition flex items-center justify-center gap-2">
          <Images className="w-3.5 h-3.5" />
          Choose Variant Images
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 border border-zinc-200 rounded-lg overflow-hidden group">
                <img src={img} alt="Variant" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={pendingRows.length === 0}
        className="w-full md:w-auto bg-primary text-primary-foreground font-bold py-2.5 px-5 rounded-xl hover:bg-primary/90 transition flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        {pendingRows.length > 0
          ? `Generate ${pendingRows.length} Variant${pendingRows.length > 1 ? "s" : ""}`
          : "Generate Variants"}
      </button>
    </div>
  )
}
