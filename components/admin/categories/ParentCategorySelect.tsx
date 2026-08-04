"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export type ParentCategoryOption = {
  id: string
  label: string
  depth: number
  disabled?: boolean
}

type Props = {
  options: ParentCategoryOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

export default function ParentCategorySelect({ options, value, onChange, placeholder = "None (Top Level)" }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = options.find((o) => o.id === value)

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-md border border-input bg-transparent px-4 py-3 text-sm shadow-xs outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0 text-left"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="relative p-2 border-b border-border">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category..."
              className="w-full h-8 pl-7 pr-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setQuery("") }}
              className={cn(
                "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground",
                !value && "font-medium"
              )}
            >
              <Check className={cn("size-3.5 shrink-0", value ? "opacity-0" : "opacity-100")} />
              None (Top Level)
            </button>

            {filtered.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No category found.</p>
            )}

            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.disabled}
                onClick={() => { onChange(opt.id); setOpen(false); setQuery("") }}
                style={{ paddingLeft: `${8 + opt.depth * 16}px` }}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm py-1.5 pr-2 text-sm text-left hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
                  value === opt.id && "font-medium"
                )}
              >
                <Check className={cn("size-3.5 shrink-0", value === opt.id ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
