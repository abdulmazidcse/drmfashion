import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/minio"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

type Upload = {
  filename: string
  buffer: Buffer
  /** The file's own MIME type — never the multipart envelope's. */
  contentType: string
}

function buildFilename(originalName: string) {
  const dot = originalName.lastIndexOf(".")
  const ext = dot > -1 ? originalName.substring(dot) : ""
  const baseName = (dot > -1 ? originalName.substring(0, dot) : originalName)
    .replace(/[^a-zA-Z0-9-_]/g, "_") // only keep safe characters

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  return `${baseName}-${uniqueSuffix}${ext}`
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "application/octet-stream"

    // Check if the upload is a raw binary stream (no multipart/form-data)
    const isRaw = !contentType.includes("multipart/form-data")

    const uploads: Upload[] = []

    if (isRaw) {
      // 1. Raw binary upload (supports large files/videos)
      const rawFilename = req.nextUrl.searchParams.get("filename") || "upload"
      const arrayBuffer = await req.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (buffer.length === 0) {
        return NextResponse.json({ error: "Empty request body buffer" }, { status: 400 })
      }

      uploads.push({ filename: buildFilename(rawFilename), buffer, contentType })
    } else {
      // 2. Multipart FormData — may carry several files in one request
      const formData = await req.formData()
      const filesInput = formData.getAll("files").concat(formData.getAll("file"))

      for (const item of filesInput) {
        if (!(item instanceof File)) continue
        const bytes = await item.arrayBuffer()
        uploads.push({
          filename: buildFilename(item.name),
          buffer: Buffer.from(bytes),
          contentType: item.type || "application/octet-stream",
        })
      }

      if (uploads.length === 0) {
        return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
      }
    }

    const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket"
    const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000"

    const urls: string[] = []

    for (const upload of uploads) {
      try {
        // Upload buffer to MinIO
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: upload.filename,
            Body: upload.buffer,
            ContentType: upload.contentType,
          })
        )

        urls.push(`${endpoint}/${bucketName}/${upload.filename}`)
      } catch (minioError) {
        console.warn("MinIO upload failed, falling back to local file upload:", minioError)

        // Fallback to local upload
        const uploadDir = path.join(process.cwd(), "public/uploads")
        await mkdir(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, upload.filename), upload.buffer)

        urls.push(`/uploads/${upload.filename}`)
      }
    }

    // `url` stays for the single-file callers; `urls` carries the whole batch.
    return NextResponse.json({ url: urls[0], urls })
  } catch (error: any) {
    console.error("Upload route error:", error)
    return NextResponse.json(
      { error: "Upload failed: " + (error.message || "Unknown error") },
      { status: 500 }
    )
  }
}
