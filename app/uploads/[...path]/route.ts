import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "fs"
import { stat } from "fs/promises"
import { Readable } from "stream"
import path from "path"
import { MediaPathError, isAllowedFile, resolveMediaPath } from "@/lib/media"

// In production Next only serves public/ files that existed when the server
// started — anything the media library writes afterwards 404s until the next
// PM2 reload. This route is the runtime fallback: the static match wins for
// old files, and everything newer is streamed from disk here.

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".pdf": "application/pdf",
}

type Params = {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { path: segments } = await params
    const rel = (segments || []).join("/")

    if (!rel || !isAllowedFile(rel)) {
      return new NextResponse(null, { status: 404 })
    }

    const { abs } = resolveMediaPath(rel)

    const stats = await stat(abs).catch(() => null)
    if (!stats || !stats.isFile()) {
      return new NextResponse(null, { status: 404 })
    }

    const contentType =
      CONTENT_TYPES[path.extname(abs).toLowerCase()] || "application/octet-stream"
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      // Kept short-lived: a deleted file's name can be reused by a later
      // upload, and that URL must not go on serving the old bytes for a year.
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "Accept-Ranges": "bytes",
    }

    // Single-range requests are honoured so video seeking works.
    const range = req.headers.get("range")
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null
    if (match && (match[1] || match[2])) {
      const start = match[1] ? parseInt(match[1], 10) : stats.size - parseInt(match[2], 10)
      const end = match[1] && match[2] ? parseInt(match[2], 10) : stats.size - 1

      if (isNaN(start) || start < 0 || start > end || end >= stats.size) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${stats.size}` },
        })
      }

      return new NextResponse(
        Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream,
        {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${stats.size}`,
            "Content-Length": String(end - start + 1),
          },
        }
      )
    }

    return new NextResponse(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
      headers: { ...headers, "Content-Length": String(stats.size) },
    })
  } catch (e) {
    if (e instanceof MediaPathError) {
      return new NextResponse(null, { status: 404 })
    }
    console.error("[UPLOADS_SERVE_ERROR]", e)
    return new NextResponse(null, { status: 500 })
  }
}
