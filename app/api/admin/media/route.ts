import { NextRequest, NextResponse } from "next/server"
import { mkdir, readdir, rename, rm, stat, writeFile } from "fs/promises"
import path from "path"
import { getAdminPayload } from "@/lib/auth"
import {
  MediaPathError,
  breadcrumbsFor,
  countChildren,
  ensureMediaRoot,
  fileKind,
  isAllowedFile,
  mediaUrl,
  resolveMediaPath,
  sanitizeSegment,
  uniqueName,
} from "@/lib/media"

async function requireAdmin(req: NextRequest) {
  try {
    await getAdminPayload(req)
    return null
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

function pathError(e: unknown) {
  if (e instanceof MediaPathError) {
    return NextResponse.json({ message: "Invalid path" }, { status: 400 })
  }
  return null
}

function isEnoent(e: unknown) {
  return (e as NodeJS.ErrnoException)?.code === "ENOENT"
}

interface FolderEntry {
  name: string
  path: string
  itemCount: number
  updatedAt: number
}

interface FileEntry {
  name: string
  filename: string
  path: string
  url: string
  size: number
  kind: ReturnType<typeof fileKind>
  createdAt: number
}

interface UploadedEntry {
  name: string
  path: string
  url: string
  size: number
  kind: ReturnType<typeof fileKind>
}

// GET /api/admin/media?path=sub/folder — one directory listing: its folders,
// its files, and the breadcrumb trail back to the root.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    await ensureMediaRoot()
    const { abs, rel } = resolveMediaPath(req.nextUrl.searchParams.get("path"))

    let entries
    try {
      entries = await readdir(abs, { withFileTypes: true })
    } catch (e) {
      if (isEnoent(e)) {
        return NextResponse.json({ message: "Folder not found" }, { status: 404 })
      }
      throw e
    }

    const folders: FolderEntry[] = []
    const files: FileEntry[] = []

    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      const childAbs = path.join(abs, entry.name)
      const stats = await stat(childAbs).catch(() => null)
      if (!stats) continue

      if (entry.isDirectory()) {
        folders.push({
          name: entry.name,
          path: childRel,
          itemCount: await countChildren(childAbs),
          updatedAt: stats.mtimeMs,
        })
      } else if (entry.isFile()) {
        files.push({
          name: entry.name,
          // `filename` kept for older callers that read the flat list.
          filename: entry.name,
          path: childRel,
          url: mediaUrl(childRel),
          size: stats.size,
          kind: fileKind(entry.name),
          createdAt: stats.mtimeMs,
        })
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name))
    files.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({
      path: rel,
      parent: rel ? rel.split("/").slice(0, -1).join("/") : null,
      breadcrumbs: breadcrumbsFor(rel),
      folders,
      files,
    })
  } catch (e) {
    const bad = pathError(e)
    if (bad) return bad
    console.error("[MEDIA_LIST_ERROR]", e)
    return NextResponse.json({ message: "Failed to load media" }, { status: 500 })
  }
}

// POST /api/admin/media — multipart upload into `path`.
// A folder upload sends the same request plus a `relativePaths` JSON array
// (one entry per file, from `webkitRelativePath`) so the tree is recreated.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    await ensureMediaRoot()

    const formData = await req.formData()
    const { rel: baseRel } = resolveMediaPath(formData.get("path") as string | null)

    const incoming = [...formData.getAll("files"), ...formData.getAll("file")].filter(
      (item): item is File => item instanceof File
    )
    if (incoming.length === 0) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 })
    }

    let relativePaths: string[] = []
    const rawRelatives = formData.get("relativePaths")
    if (typeof rawRelatives === "string" && rawRelatives) {
      try {
        const parsed = JSON.parse(rawRelatives)
        if (Array.isArray(parsed)) relativePaths = parsed.map((v) => String(v ?? ""))
      } catch {
        // A malformed hint just means a flat upload — not worth failing over.
      }
    }

    const uploaded: UploadedEntry[] = []
    const skipped: { name: string; reason: string }[] = []

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i]

      if (!isAllowedFile(file.name)) {
        skipped.push({ name: file.name, reason: "File type not allowed" })
        continue
      }

      // Everything but the last segment of the hint is the folder trail.
      const hint = relativePaths[i] || ""
      const segments = hint
        .replace(/\\/g, "/")
        .split("/")
        .slice(0, -1)
        .map(sanitizeSegment)
        .filter(Boolean)

      const targetRel = [baseRel, ...segments].filter(Boolean).join("/")
      const { abs: targetAbs } = resolveMediaPath(targetRel)
      await mkdir(targetAbs, { recursive: true })

      const desired = sanitizeSegment(file.name) || "file"
      const finalName = await uniqueName(targetAbs, desired)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(targetAbs, finalName), buffer)

      const fileRel = targetRel ? `${targetRel}/${finalName}` : finalName
      uploaded.push({
        name: finalName,
        path: fileRel,
        url: mediaUrl(fileRel),
        size: buffer.length,
        kind: fileKind(finalName),
      })
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { message: skipped[0]?.reason || "Nothing was uploaded", skipped },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Uploaded successfully", uploaded, skipped, url: uploaded[0].url },
      { status: 201 }
    )
  } catch (e) {
    const bad = pathError(e)
    if (bad) return bad
    console.error("[MEDIA_UPLOAD_ERROR]", e)
    return NextResponse.json({ message: "Failed to upload file" }, { status: 500 })
  }
}

// PATCH /api/admin/media — rename a file or a folder in place.
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { abs: sourceAbs, rel: sourceRel } = resolveMediaPath(body?.path)
    if (!sourceRel) {
      return NextResponse.json({ message: "Cannot rename the root folder" }, { status: 400 })
    }

    const stats = await stat(sourceAbs).catch(() => null)
    if (!stats) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const isFile = stats.isFile()
    const currentName = path.basename(sourceRel)
    const requested = sanitizeSegment(String(body?.name ?? ""))
    if (!requested) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    // Renaming a file must not change its extension out from under the URLs
    // that already point at it, so the original extension is re-applied.
    const ext = path.extname(currentName)
    const finalRequested = isFile
      ? `${path.basename(requested, path.extname(requested)) || "file"}${ext}`
      : requested

    if (finalRequested === currentName) {
      return NextResponse.json({ message: "Renamed", name: currentName, path: sourceRel })
    }

    const parentAbs = path.dirname(sourceAbs)
    const parentRel = sourceRel.split("/").slice(0, -1).join("/")
    const finalName = await uniqueName(parentAbs, finalRequested, isFile)

    await rename(sourceAbs, path.join(parentAbs, finalName))

    const newRel = parentRel ? `${parentRel}/${finalName}` : finalName
    return NextResponse.json({
      message: "Renamed",
      name: finalName,
      path: newRel,
      url: isFile ? mediaUrl(newRel) : undefined,
    })
  } catch (e) {
    const bad = pathError(e)
    if (bad) return bad
    console.error("[MEDIA_RENAME_ERROR]", e)
    return NextResponse.json({ message: "Failed to rename" }, { status: 500 })
  }
}

// DELETE /api/admin/media — remove one or more files/folders. Folders go
// recursively, which is why the UI confirms with the child count first.
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({}))
    const targets: string[] = Array.isArray(body?.paths)
      ? body.paths
      : body?.path
        ? [body.path]
        : []

    if (targets.length === 0) {
      return NextResponse.json({ message: "Nothing to delete" }, { status: 400 })
    }

    let deleted = 0
    const failed: string[] = []

    for (const target of targets) {
      try {
        const { abs, rel } = resolveMediaPath(target)
        if (!rel) {
          failed.push(String(target))
          continue // never let the root itself be removed
        }
        await rm(abs, { recursive: true, force: true })
        deleted++
      } catch (e) {
        console.error("[MEDIA_DELETE_ERROR]", target, e)
        failed.push(String(target))
      }
    }

    if (deleted === 0) {
      return NextResponse.json({ message: "Failed to delete", failed }, { status: 400 })
    }

    return NextResponse.json({ message: "Deleted", deleted, failed })
  } catch (e) {
    const bad = pathError(e)
    if (bad) return bad
    console.error("[MEDIA_DELETE_ERROR]", e)
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 })
  }
}
