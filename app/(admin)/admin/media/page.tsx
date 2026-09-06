"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Swal from "sweetalert2"
import {
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Folder,
  FolderPlus,
  FolderUp,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Crumb {
  name: string
  path: string
}

interface MediaFolder {
  name: string
  path: string
  itemCount: number
  updatedAt: number
}

interface MediaFile {
  name: string
  path: string
  url: string
  size: number
  kind: "image" | "video" | "file"
  createdAt: number
}

/** One file plus where it should land, relative to the folder being uploaded into. */
interface PendingUpload {
  file: File
  relativePath: string
}

// Batching keeps a 500-file folder upload from becoming one enormous request.
const MAX_BATCH_FILES = 20
const MAX_BATCH_BYTES = 20 * 1024 * 1024

const swalBase = { confirmButtonColor: "#18181b" as const }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface UploadResponse {
  message?: string
  uploaded?: MediaFile[]
  skipped?: { name: string; reason: string }[]
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback
}

/** POST a FormData with real upload progress — fetch() cannot report that. */
function postForm(url: string, form: FormData, onProgress?: (fraction: number) => void) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      let payload: UploadResponse | null = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload ?? {})
      else reject(new Error(payload?.message || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.send(form)
  })
}

/**
 * Walk a dropped FileSystemEntry tree so dropping a whole folder works the
 * same way the "Upload Folder" button does.
 */
function readEntry(entry: FileSystemEntry, prefix: string, out: PendingUpload[]): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file(
        (file: File) => {
          out.push({ file, relativePath: `${prefix}${file.name}` })
          resolve()
        },
        () => resolve()
      )
    })
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    return new Promise((resolve) => {
      // readEntries returns at most 100 children per call, so keep reading
      // until it hands back an empty batch.
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) return resolve()
          for (const child of entries) {
            await readEntry(child, `${prefix}${entry.name}/`, out)
          }
          readBatch()
        }, () => resolve())
      }
      readBatch()
    })
  }

  return Promise.resolve()
}

async function collectFromDataTransfer(dt: DataTransfer): Promise<PendingUpload[]> {
  const out: PendingUpload[] = []
  const items = Array.from(dt.items || [])
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => !!entry)

  if (entries.length) {
    for (const entry of entries) await readEntry(entry, "", out)
    return out
  }

  // Browsers without the entries API still give us a flat file list.
  return Array.from(dt.files || []).map((file) => ({ file, relativePath: file.name }))
}

export default function MediaLibraryPage() {
  const [currentPath, setCurrentPath] = useState("")
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ name: "Media Library", path: "" }])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [upload, setUpload] = useState<{ done: number; total: number; percent: number } | null>(null)

  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  const [renaming, setRenaming] = useState<{ path: string; name: string; isFolder: boolean } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [savingRename, setSavingRename] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  // `webkitdirectory` is not in React's typed attribute list, so it is set
  // imperatively rather than fought with through casts in JSX.
  useEffect(() => {
    const input = folderInputRef.current
    if (!input) return
    input.setAttribute("webkitdirectory", "")
    input.setAttribute("directory", "")
  }, [])

  const loadFolder = async (target: string, showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch(`/api/admin/media?path=${encodeURIComponent(target)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to load media")

      setCurrentPath(data.path || "")
      setBreadcrumbs(data.breadcrumbs || [{ name: "Media Library", path: "" }])
      setFolders(data.folders || [])
      setFiles(data.files || [])
      setSelected([])
    } catch (err) {
      Swal.fire({ ...swalBase, icon: "error", text: errorMessage(err, "Failed to load media") })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Mount-only fetch of the root listing. `loading` already starts true, so
    // this sets nothing until the request resolves — the lint rule cannot see
    // past the await boundary of an async function.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFolder("", false)
  }, [])

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders
  }, [folders, query])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files
  }, [files, query])

  const isEmpty = folders.length === 0 && files.length === 0

  /* ---------------------------------------------------------------- uploads */

  const runUpload = async (pending: PendingUpload[]) => {
    if (!pending.length) return

    // Group into batches that respect both a file count and a byte budget,
    // so progress stays meaningful and no single request gets huge.
    const batches: PendingUpload[][] = []
    let batch: PendingUpload[] = []
    let batchBytes = 0

    for (const item of pending) {
      if (batch.length >= MAX_BATCH_FILES || (batch.length && batchBytes + item.file.size > MAX_BATCH_BYTES)) {
        batches.push(batch)
        batch = []
        batchBytes = 0
      }
      batch.push(item)
      batchBytes += item.file.size
    }
    if (batch.length) batches.push(batch)

    setUpload({ done: 0, total: pending.length, percent: 0 })

    let done = 0
    const skipped: { name: string; reason: string }[] = []

    try {
      for (const group of batches) {
        const form = new FormData()
        form.append("path", currentPath)
        form.append("relativePaths", JSON.stringify(group.map((g) => g.relativePath)))
        group.forEach((g) => form.append("files", g.file))

        const result = await postForm("/api/admin/media", form, (fraction) => {
          setUpload({
            done,
            total: pending.length,
            percent: Math.round(((done + fraction * group.length) / pending.length) * 100),
          })
        })

        if (Array.isArray(result?.skipped)) skipped.push(...result.skipped)
        done += group.length
        setUpload({ done, total: pending.length, percent: Math.round((done / pending.length) * 100) })
      }

      await loadFolder(currentPath, false)

      if (skipped.length) {
        Swal.fire({
          ...swalBase,
          icon: "warning",
          title: "Some files were skipped",
          text: `${skipped.length} file(s) were not uploaded: ${skipped
            .slice(0, 5)
            .map((s) => s.name)
            .join(", ")}${skipped.length > 5 ? "…" : ""}`,
        })
      }
    } catch (err) {
      Swal.fire({ ...swalBase, icon: "error", text: errorMessage(err, "Upload failed") })
      await loadFolder(currentPath, false)
    } finally {
      setUpload(null)
    }
  }

  const handleInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || [])
    if (list.length) {
      runUpload(
        list.map((file) => ({
          file,
          // A folder picker fills webkitRelativePath; a file picker does not.
          relativePath: file.webkitRelativePath || file.name,
        }))
      )
    }
    e.target.value = ""
  }

  /* -------------------------------------------------------------- drag/drop */

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (upload) return
    const pending = await collectFromDataTransfer(e.dataTransfer)
    runUpload(pending)
  }

  /* ------------------------------------------------------------- operations */

  const createFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return

    setCreatingFolder(true)
    try {
      const res = await fetch("/api/admin/media/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to create folder")

      setFolderDialogOpen(false)
      setNewFolderName("")
      await loadFolder(currentPath, false)
    } catch (err) {
      Swal.fire({ ...swalBase, icon: "error", text: errorMessage(err, "Failed to create folder") })
    } finally {
      setCreatingFolder(false)
    }
  }

  const submitRename = async () => {
    if (!renaming) return
    const name = renameValue.trim()
    if (!name) return

    setSavingRename(true)
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: renaming.path, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to rename")

      setRenaming(null)
      await loadFolder(currentPath, false)
    } catch (err) {
      Swal.fire({ ...swalBase, icon: "error", text: errorMessage(err, "Failed to rename") })
    } finally {
      setSavingRename(false)
    }
  }

  const deletePaths = async (paths: string[], label: string) => {
    if (!paths.length) return

    const confirmed = await Swal.fire({
      ...swalBase,
      icon: "warning",
      title: "Delete permanently?",
      text: `${label} will be removed from disk. Anything on the site still pointing at it will break.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    })
    if (!confirmed.isConfirmed) return

    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to delete")

      await loadFolder(currentPath, false)
    } catch (err) {
      Swal.fire({ ...swalBase, icon: "error", text: errorMessage(err, "Failed to delete") })
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard
      .writeText(window.location.origin + url)
      .then(() => {
        setCopiedUrl(url)
        setTimeout(() => setCopiedUrl((c) => (c === url ? null : c)), 2000)
      })
      .catch(() => Swal.fire({ ...swalBase, icon: "error", text: "Failed to copy URL" }))
  }

  const toggleSelected = (path: string) =>
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))

  const parentPath = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].path : null

  /* ------------------------------------------------------------------- view */

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organise uploads into folders, rename them, and copy their URLs for use across the site.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setFolderDialogOpen(true)} disabled={!!upload}>
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button variant="outline" onClick={() => folderInputRef.current?.click()} disabled={!!upload}>
            <FolderUp className="h-4 w-4" />
            Upload Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} disabled={!!upload}>
            {upload ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {upload ? `Uploading ${upload.done}/${upload.total}` : "Upload Files"}
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleInputFiles} />
      <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleInputFiles} />

      {/* Breadcrumbs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {parentPath !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 h-7 w-7"
              title="Up one level"
              onClick={() => loadFolder(parentPath)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path || "root"} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <button
                onClick={() => loadFolder(crumb.path)}
                disabled={i === breadcrumbs.length - 1}
                className={cn(
                  "max-w-[180px] truncate rounded px-1.5 py-0.5 transition-colors",
                  i === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this folder"
            className="py-2 pl-9"
          />
        </div>
      </div>

      {/* Upload progress */}
      {upload && (
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span>
              Uploading {upload.done} of {upload.total} file{upload.total === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">{upload.percent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${upload.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Selection bar */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              <X className="h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletePaths(selected, `${selected.length} item(s)`)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Browser */}
      <div
        onDragEnter={(e) => {
          e.preventDefault()
          dragDepth.current++
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          dragDepth.current--
          if (dragDepth.current <= 0) setDragging(false)
        }}
        onDrop={handleDrop}
        className={cn(
          "min-h-[320px] rounded-lg border-2 border-dashed p-4 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-transparent"
        )}
      >
        {loading ? (
          <div className="flex h-[320px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-[320px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center transition-all hover:border-foreground hover:bg-muted/50"
          >
            <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-sm font-semibold tracking-tight">This folder is empty</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Click to pick files, or drag files and folders anywhere onto this area to upload them here.
            </p>
          </button>
        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="flex h-[320px] flex-col items-center justify-center text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nothing here matches “{query}”.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFolders.length > 0 && (
              <section>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Folders
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredFolders.map((folder) => {
                    const isSelected = selected.includes(folder.path)
                    return (
                      <Card
                        key={folder.path}
                        data-checked={isSelected}
                        className={cn(
                          "group relative gap-0 p-0 transition-all hover:shadow-md",
                          isSelected && "ring-2 ring-primary"
                        )}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          {/* The checkbox takes over the folder icon's slot on hover
                              instead of claiming its own column, so the name keeps
                              the full width of the card. */}
                          <div className="relative flex size-8 shrink-0 items-center justify-center">
                            <Folder className="pointer-events-none size-7 fill-muted text-muted-foreground transition-opacity group-hover:opacity-0 group-data-[checked=true]:opacity-0" />
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-data-[checked=true]:opacity-100">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelected(folder.path)}
                                aria-label={`Select ${folder.name}`}
                              />
                            </span>
                          </div>

                          <button
                            onClick={() => loadFolder(folder.path)}
                            className="min-w-0 flex-1 text-left"
                            title={folder.name}
                          >
                            <span className="block truncate text-sm font-medium">{folder.name}</span>
                            <span className="block whitespace-nowrap text-[11px] text-muted-foreground">
                              {folder.itemCount} item{folder.itemCount === 1 ? "" : "s"}
                            </span>
                          </button>

                          <ItemMenu
                            onRename={() => {
                              setRenaming({ path: folder.path, name: folder.name, isFolder: true })
                              setRenameValue(folder.name)
                            }}
                            onDelete={() =>
                              deletePaths(
                                [folder.path],
                                `Folder “${folder.name}” and its ${folder.itemCount} item(s)`
                              )
                            }
                          />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {filteredFiles.length > 0 && (
              <section>
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Files
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filteredFiles.map((file) => (
                    <Card
                      key={file.path}
                      className={cn(
                        "group relative gap-0 overflow-hidden p-0 transition-all hover:shadow-md",
                        selected.includes(file.path) && "ring-2 ring-primary"
                      )}
                    >
                      <div className="relative flex aspect-square items-center justify-center bg-muted p-2">
                        {/* Checkered backdrop so transparent PNGs stay readable */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "20px 20px",
                            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                          }}
                        />
                        {file.kind === "image" ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            loading="lazy"
                            className="relative z-10 max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground">
                            {file.kind === "video" ? (
                              <Film className="h-10 w-10" />
                            ) : (
                              <FileText className="h-10 w-10" />
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-widest">
                              {file.name.split(".").pop()}
                            </span>
                          </div>
                        )}

                        <div
                          className="absolute left-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100 data-[checked=true]:opacity-100"
                          data-checked={selected.includes(file.path)}
                        >
                          <Checkbox
                            checked={selected.includes(file.path)}
                            onCheckedChange={() => toggleSelected(file.path)}
                          />
                        </div>

                        <div className="absolute right-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
                          <ItemMenu
                            url={file.url}
                            onRename={() => {
                              setRenaming({ path: file.path, name: file.name, isFolder: false })
                              setRenameValue(file.name.replace(/\.[^.]+$/, ""))
                            }}
                            onDelete={() => deletePaths([file.path], `“${file.name}”`)}
                            onCopy={() => copyUrl(file.url)}
                          />
                        </div>
                      </div>

                      <CardContent className="border-t border-border p-3">
                        <p className="mb-0.5 truncate font-mono text-[10px] text-muted-foreground" title={file.name}>
                          {file.name}
                        </p>
                        <p className="mb-2 text-[10px] text-muted-foreground/70">{formatSize(file.size)}</p>
                        <button
                          onClick={() => copyUrl(file.url)}
                          className={cn(
                            "flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors",
                            copiedUrl === file.url
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                              : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                          )}
                        >
                          {copiedUrl === file.url ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy URL
                            </>
                          )}
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* New folder dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Created inside {currentPath ? `/${currentPath}` : "the media library root"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            placeholder="e.g. banners"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename {renaming?.isFolder ? "folder" : "file"}</DialogTitle>
            <DialogDescription>
              {renaming?.isFolder
                ? "Links pointing at files inside this folder will change."
                : "The extension stays the same. Any page already using the old URL will break."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={savingRename || !renameValue.trim()}>
              {savingRename && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ItemMenu({
  url,
  onRename,
  onDelete,
  onCopy,
}: {
  url?: string
  onRename: () => void
  onDelete: () => void
  onCopy?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
        {onCopy && (
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="h-4 w-4" />
            Copy URL
          </DropdownMenuItem>
        )}
        {url && (
          <DropdownMenuItem asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
