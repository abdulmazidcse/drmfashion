import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

// Helper to ensure directory exists
async function ensureDir() {
  try {
    await stat(UPLOAD_DIR);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureDir();
    const files = await readdir(UPLOAD_DIR);
    
    // Get file stats to sort by newest
    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const stats = await stat(path.join(UPLOAD_DIR, filename));
        return {
          filename,
          url: `/uploads/${filename}`,
          createdAt: stats.mtimeMs,
        };
      })
    );

    // Sort by created time descending
    fileStats.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ files: fileStats }, { status: 200 });
  } catch (error: any) {
    console.error("Error reading media directory:", error);
    return NextResponse.json({ message: "Failed to load media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename to avoid collisions
    const ext = path.extname(file.name);
    const uniqueHash = crypto.randomBytes(8).toString("hex");
    const filename = `${path.basename(file.name, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${uniqueHash}${ext}`;
    
    const filePath = path.join(UPLOAD_DIR, filename);

    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      message: "Uploaded successfully",
      url: `/uploads/${filename}`
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ message: "Failed to upload file" }, { status: 500 });
  }
}
