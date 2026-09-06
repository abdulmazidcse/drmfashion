import { NextRequest, NextResponse } from "next/server"
import { mkdir, stat } from "fs/promises"
import path from "path"
import { getAdminPayload } from "@/lib/auth"
import { MediaPathError, ensureMediaRoot, resolveMediaPath, sanitizeSegment } from "@/lib/media"

// POST /api/admin/media/folder — create a folder named `name` inside `path`.
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureMediaRoot()

    const body = await req.json()
    const name = sanitizeSegment(String(body?.name ?? ""))
    if (!name) {
      return NextResponse.json({ message: "Folder name is required" }, { status: 400 })
    }

    const { abs: parentAbs, rel: parentRel } = resolveMediaPath(body?.path)

    const parentStats = await stat(parentAbs).catch(() => null)
    if (!parentStats?.isDirectory()) {
      return NextResponse.json({ message: "Parent folder not found" }, { status: 404 })
    }

    const targetAbs = path.join(parentAbs, name)
    if (await stat(targetAbs).catch(() => null)) {
      return NextResponse.json({ message: "A folder with that name already exists" }, { status: 409 })
    }

    await mkdir(targetAbs)

    return NextResponse.json(
      { message: "Folder created", name, path: parentRel ? `${parentRel}/${name}` : name },
      { status: 201 }
    )
  } catch (e) {
    if (e instanceof MediaPathError) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 })
    }
    console.error("[MEDIA_FOLDER_CREATE_ERROR]", e)
    return NextResponse.json({ message: "Failed to create folder" }, { status: 500 })
  }
}
