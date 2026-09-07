import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/minio";
import { bucketMediaUrl } from "@/lib/utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    // "upload" is the field name CKEditor's SimpleUploadAdapter posts under.
    const file = (formData.get("file") || formData.get("upload")) as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Standard Validation: Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Standard Validation: Check file size (Max 5MB — editorial covers and
    // in-article photography need more headroom than product thumbnails)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds the 5MB limit." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";

    let fileUrl = "";
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // Store the object key, not `${endpoint}/${bucket}/…` — an absolute URL
      // here pins every row to today's storage host. See the `/media` rewrite
      // in next.config.ts, which resolves this at request time.
      fileUrl = bucketMediaUrl(fileName);
    } catch (minioError) {
      console.warn("MinIO upload failed, falling back to local file upload:", minioError);
      // Fallback to local upload
      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      fileUrl = `/uploads/${fileName}`;
    }

    // `default` is what CKEditor's SimpleUploadAdapter reads; `url` is what the
    // rest of the admin already expects.
    return NextResponse.json({ url: fileUrl, default: fileUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Upload failed: " + (error.message || error.toString()) }, { status: 500 });
  }
}
