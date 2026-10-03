import { NextRequest, NextResponse } from "next/server"
import { getAdminPayload } from "@/lib/auth"
import { breadcrumbsFor, fileKind, isAllowedFile, sanitizeSegment } from "@/lib/media"
import {
  copyObject,
  countLevel,
  deleteKeys,
  folderExists,
  folderPrefix,
  keyUrl,
  listLevel,
  listTree,
  normalizeRel,
  objectExists,
  putObject,
  uniqueKey,
} from "@/lib/mediaBucket"
import { getSettings } from "@/lib/settings"
import { uploadKindFor, uploadLimitBytes, uploadLimitMb, uploadTooLargeMessage } from "@/lib/uploadLimits"

// The Media Library lists, uploads, renames and deletes objects in the MinIO
// bucket (lib/mediaBucket.ts). Response shapes are unchanged from the old
// public/uploads version, so the admin page and pickers need no changes.

async function requireAdmin(req: NextRequest) {
  try {
    await getAdminPayload(req)
    return null
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

/** Last path segment, without the trailing slash a folder prefix carries. */
function baseName(keyOrPrefix: string) {
  return keyOrPrefix.replace(/\/$/, "").split("/").pop() || ""
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

// GET /api/admin/media?path=sub/folder — one folder level: its sub-folders,
// its files, and the breadcrumb trail back to the bucket root.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const rel = normalizeRel(req.nextUrl.searchParams.get("path"))
    if (rel && !(await folderExists(rel))) {
      return NextResponse.json({ message: "Folder not found" }, { status: 404 })
    }

    const level = await listLevel(rel)

    const folders: FolderEntry[] = await Promise.all(
      level.folders.map(async (prefix) => ({
        name: baseName(prefix),
        path: prefix.replace(/\/$/, ""),
        itemCount: await countLevel(prefix).catch(() => 0),
        updatedAt: 0,
      }))
    )

    const files: FileEntry[] = level.files.map((o) => {
      const key = o.Key!
      const name = baseName(key)
      return {
        name,
        // `filename` kept for older callers that read the flat list.
        filename: name,
        path: key,
        url: keyUrl(key),
        size: o.Size ?? 0,
        kind: fileKind(name),
        createdAt: o.LastModified ? new Date(o.LastModified).getTime() : 0,
      }
    })

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
    console.error("[MEDIA_LIST_ERROR]", e)
    return NextResponse.json({ message: "Failed to load media from storage" }, { status: 500 })
  }
}

// POST /api/admin/media — multipart upload into `path`.
// A folder upload sends the same request plus a `relativePaths` JSON array
// (one entry per file, from `webkitRelativePath`) so the tree is recreated.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const formData = await req.formData()
    const baseRel = normalizeRel(formData.get("path") as string | null)

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

    // Same per-file caps as /api/admin/upload (Settings → Brand → Media Uploads).
    const settings = await getSettings()

    const uploaded: UploadedEntry[] = []
    const skipped: { name: string; reason: string }[] = []

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i]

      if (!isAllowedFile(file.name)) {
        skipped.push({ name: file.name, reason: "File type not allowed" })
        continue
      }

      const contentType = file.type || "application/octet-stream"
      const kind = uploadKindFor(contentType)
      if (file.size > uploadLimitBytes(settings, kind)) {
        skipped.push({ name: file.name, reason: uploadTooLargeMessage(kind, uploadLimitMb(settings, kind)) })
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

      const targetRel = normalizeRel([baseRel, ...segments].filter(Boolean).join("/"))
      const desired = sanitizeSegment(file.name) || "file"
      const finalName = await uniqueKey(targetRel, desired)
      const key = `${folderPrefix(targetRel)}${finalName}`
      const buffer = Buffer.from(await file.arrayBuffer())
      await putObject(key, buffer, contentType)

      uploaded.push({
        name: finalName,
        path: key,
        url: keyUrl(key),
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
    console.error("[MEDIA_UPLOAD_ERROR]", e)
    return NextResponse.json({ message: "Failed to upload file" }, { status: 500 })
  }
}

// PATCH /api/admin/media — rename a file or a folder. S3 has no rename, so it
// is copy-then-delete; a folder moves every object under its prefix.
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const sourceRel = normalizeRel(body?.path)
    if (!sourceRel) {
      return NextResponse.json({ message: "Cannot rename the root folder" }, { status: 400 })
    }

    const isFile = await objectExists(sourceRel)
    if (!isFile && !(await folderExists(sourceRel))) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const currentName = baseName(sourceRel)
    const requested = sanitizeSegment(String(body?.name ?? ""))
    if (!requested) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    // Renaming a file must not change its extension out from under the URLs
    // that already point at it, so the original extension is re-applied.
    const dot = currentName.lastIndexOf(".")
    const ext = isFile && dot > 0 ? currentName.slice(dot) : ""
    const reqDot = requested.lastIndexOf(".")
    const finalRequested = isFile
      ? `${(reqDot > 0 ? requested.slice(0, reqDot) : requested) || "file"}${ext}`
      : requested

    if (finalRequested === currentName) {
      return NextResponse.json({ message: "Renamed", name: currentName, path: sourceRel })
    }

    const parentRel = sourceRel.split("/").slice(0, -1).join("/")
    const finalName = await uniqueKey(parentRel, finalRequested, isFile)
    const newRel = parentRel ? `${parentRel}/${finalName}` : finalName

    if (isFile) {
      await copyObject(sourceRel, newRel)
      await deleteKeys([sourceRel])
    } else {
      const oldPrefix = folderPrefix(sourceRel)
      const newPrefix = folderPrefix(newRel)
      const keys = (await listTree(sourceRel)).map((o) => o.Key!).filter(Boolean)
      // Copy everything first, delete only once all copies succeeded, so a
      // failure part-way leaves the originals intact rather than half-moved.
      for (const key of keys) await copyObject(key, newPrefix + key.slice(oldPrefix.length))
      await deleteKeys(keys)
    }

    return NextResponse.json({
      message: "Renamed",
      name: finalName,
      path: newRel,
      url: isFile ? keyUrl(newRel) : undefined,
    })
  } catch (e) {
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
        const rel = normalizeRel(target)
        if (!rel) {
          failed.push(String(target))
          continue // never let the bucket root itself be emptied
        }
        if (await objectExists(rel)) {
          await deleteKeys([rel])
        } else {
          const keys = (await listTree(rel)).map((o) => o.Key!).filter(Boolean)
          if (keys.length === 0) {
            failed.push(String(target))
            continue
          }
          await deleteKeys(keys)
        }
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
    console.error("[MEDIA_DELETE_ERROR]", e)
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 })
  }
}
