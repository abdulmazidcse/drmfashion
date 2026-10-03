"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Film, Folder, FolderOpen, ImageIcon, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * "Choose from Media Library" — the second way to fill any upload field.
 *
 * Every image/video input in the admin keeps its own Upload button; this sits
 * beside it and lets the admin reuse a file already in the bucket instead of
 * uploading a duplicate. It browses the same /api/admin/media listing the
 * Media Library page uses (folders, breadcrumbs), filtered to the kind of file
 * the field accepts, and hands back the file's `/media/<key>` URL — the same
 * string an upload would have produced, so callers store it unchanged.
 */

type MediaKind = "image" | "video" | "file"

interface MediaFile {
  name: string
  path: string
  url: string
  size: number
  kind: MediaKind
  createdAt: number
}

interface MediaFolder {
  name: string
  path: string
  itemCount: number
}

interface Crumb {
  name: string
  path: string
}

type Accept = "image" | "video" | "any"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  accept = "image",
  multiple = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the chosen URLs (always an array; one item unless `multiple`). */
  onSelect: (urls: string[]) => void
  accept?: Accept
  multiple?: boolean
}) {
  const [path, setPath] = useState("")
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [files, setFiles] = useState<MediaFile[]>([])
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ name: "Media Library", path: "" }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  const load = useCallback(async (target: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/media?path=${encodeURIComponent(target)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to load media")
      setPath(data.path ?? target)
      setFolders(data.folders ?? [])
      setFiles(data.files ?? [])
      setCrumbs(data.breadcrumbs ?? [{ name: "Media Library", path: "" }])
      setQuery("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media")
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload on open; the folder it was last in is kept.
  useEffect(() => {
    // Fetch on open. load() flips `loading` before its await, which the lint
    // rule reads as a synchronous set; it is the start of a fetch, not a loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void load(path)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on open only
  }, [open, load])

  // Selection is cleared on close, so each opening starts fresh.
  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected([])
    onOpenChange(next)
  }

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return files.filter(
      (f) => (accept === "any" || f.kind === accept) && (!q || f.name.toLowerCase().includes(q))
    )
  }, [files, accept, query])

  const visibleFolders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders
  }, [folders, query])

  const toggle = (url: string) => {
    if (!multiple) {
      setSelected([url])
      return
    }
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))
  }

  const confirm = (urls = selected) => {
    if (urls.length === 0) return
    onSelect(urls)
    handleOpenChange(false)
  }

  const noun = accept === "video" ? "video" : accept === "image" ? "image" : "file"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose from Media Library</DialogTitle>
          <DialogDescription>
            {multiple
              ? `Pick one or more ${noun}s already uploaded to storage.`
              : `Pick an ${noun} already uploaded to storage. Double-click to use it straight away.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            {crumbs.map((c, i) => (
              <span key={c.path || "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <button
                  type="button"
                  onClick={() => load(c.path)}
                  disabled={i === crumbs.length - 1}
                  className="max-w-[12rem] truncate rounded px-1 py-0.5 font-medium text-muted-foreground hover:text-foreground disabled:text-foreground"
                >
                  {c.name}
                </button>
              </span>
            ))}
          </nav>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this folder"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="min-h-[18rem] flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-destructive">
              {error}
              <Button type="button" variant="outline" size="sm" onClick={() => load(path)}>
                Retry
              </Button>
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="h-8 w-8" />
              {query ? "Nothing matches that search." : `No ${noun}s in this folder.`}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {visibleFolders.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => load(f.path)}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border bg-card p-3 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <Folder className="h-10 w-10 text-primary/70" />
                  <span className="w-full truncate text-xs font-medium">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {f.itemCount} item{f.itemCount === 1 ? "" : "s"}
                  </span>
                </button>
              ))}

              {visibleFiles.map((f) => {
                const isSelected = selected.includes(f.url)
                return (
                  <button
                    key={f.path}
                    type="button"
                    title={f.name}
                    onClick={() => toggle(f.url)}
                    onDoubleClick={() => (multiple ? toggle(f.url) : confirm([f.url]))}
                    className={`group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                    }`}
                  >
                    <div className="relative aspect-square w-full bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                      {f.kind === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.url} alt={f.name} loading="lazy" className="h-full w-full object-contain" />
                      ) : f.kind === "video" ? (
                        <video src={f.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {f.kind === "video" && (
                        <Film className="absolute bottom-1.5 left-1.5 h-4 w-4 text-white drop-shadow" />
                      )}
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[11px] font-medium">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(f.size)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.length > 0 ? `${selected.length} selected` : "Nothing selected"}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => confirm()} disabled={selected.length === 0}>
              {multiple && selected.length > 1 ? `Use ${selected.length} ${noun}s` : `Use ${noun}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The button that opens the library, for dropping next to an existing Upload
 * control. `onSelect` gets one URL (or several with `multiple`).
 */
export function MediaLibraryButton({
  onSelect,
  accept = "image",
  multiple = false,
  label = "Media Library",
  className,
  disabled,
}: {
  onSelect: (urls: string[]) => void
  accept?: Accept
  multiple?: boolean
  label?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-xs font-bold shadow-xs transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
        }
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        {label}
      </button>
      <MediaLibraryDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        accept={accept}
        multiple={multiple}
      />
    </>
  )
}
