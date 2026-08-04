"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, UploadCloud, Copy, CheckCircle2, Image as ImageIcon } from "lucide-react"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MediaFile {
  filename: string;
  url: string;
  createdAt: number;
}

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = async () => {
    try {
      const res = await fetch("/api/admin/media")
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files)
      }
    } catch (err) {
      console.error("Failed to load media:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia()
  }, [])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", selectedFiles[0])

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to upload")
      }

      // Refresh gallery
      await fetchMedia()
    } catch (err: any) {
      Swal.fire({ text: err.message || "Upload failed", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleCopyUrl = (url: string) => {
    const absoluteUrl = window.location.origin + url;
    navigator.clipboard.writeText(absoluteUrl)
      .then(() => {
        setCopiedUrl(url)
        setTimeout(() => setCopiedUrl(null), 2000)
      })
      .catch(err => {
        console.error("Failed to copy", err)
        Swal.fire({ text: "Failed to copy URL", confirmButtonColor: "#18181b", icon: "error" })
      })
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload images and copy their URLs to use across the site.</p>
        </div>

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      </div>

      {/* Upload Drag/Drop Area (Stylized as a big button too for visibility) */}
      {files.length === 0 && !loading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-12 text-center flex flex-col items-center justify-center cursor-pointer hover:border-foreground hover:bg-muted/50 transition-all"
        >
          <ImageIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">No Media Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Click here to upload your first image. You can upload logos, banners, or product photos.</p>
        </div>
      )}

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => (
            <Card key={file.filename} className="group relative overflow-hidden p-0 gap-0 transition-all hover:shadow-md">
              {/* Image Preview */}
              <div className="aspect-square bg-muted relative flex items-center justify-center p-2">
                {/* Checkered background for transparency visibility */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }} />
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-w-full max-h-full object-contain relative z-10"
                />
              </div>

              {/* File Info & Actions */}
              <CardContent className="p-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground truncate mb-2 font-mono" title={file.filename}>
                  {file.filename}
                </p>
                <button
                  onClick={() => handleCopyUrl(file.url)}
                  className={cn(
                    "w-full flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-md transition-colors",
                    copiedUrl === file.url
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  {copiedUrl === file.url ? (
                    <><CheckCircle2 className="w-3 h-3" /> Copied!</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy URL</>
                  )}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
