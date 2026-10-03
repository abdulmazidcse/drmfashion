import { NextRequest, NextResponse } from "next/server"
import { getAdminPayload } from "@/lib/auth"
import { sanitizeSegment } from "@/lib/media"
import { createFolderMarker, folderExists, normalizeRel } from "@/lib/mediaBucket"

// POST /api/admin/media/folder — create a folder named `name` inside `path`.
// In the bucket that is a zero-byte marker object at "<path>/<name>/".
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = sanitizeSegment(String(body?.name ?? ""))
    if (!name) {
      return NextResponse.json({ message: "Folder name is required" }, { status: 400 })
    }

    const parentRel = normalizeRel(body?.path)
    if (!(await folderExists(parentRel))) {
      return NextResponse.json({ message: "Parent folder not found" }, { status: 404 })
    }

    const targetRel = parentRel ? `${parentRel}/${name}` : name
    if (await folderExists(targetRel)) {
      return NextResponse.json({ message: "A folder with that name already exists" }, { status: 409 })
    }

    await createFolderMarker(targetRel)

    return NextResponse.json({ message: "Folder created", name, path: targetRel }, { status: 201 })
  } catch (e) {
    console.error("[MEDIA_FOLDER_CREATE_ERROR]", e)
    return NextResponse.json({ message: "Failed to create folder" }, { status: 500 })
  }
}
