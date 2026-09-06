"use client"

import { useState } from "react"
import { Loader2, Trash2, Image as ImageIcon, UploadCloud } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useSettingsForm } from "./SettingsFormContext"

/**
 * Thumbnail + Upload + Remove, in place of a raw URL box.
 *
 * The path was editable text before, which made it possible to mistype a file
 * name and get a silently broken image with nothing on screen to show for it.
 * Removing clears the value, and each slot falls back to its built-in default.
 */
export default function MediaField({
  label,
  hint,
  value,
  onChange,
  kind = "image",
}: {
  label: string
  hint?: string
  value: string
  onChange: React.Dispatch<React.SetStateAction<string>>
  kind?: "image" | "video"
}) {
  const { handleFieldFileUpload, fieldLabel } = useSettingsForm()
  const [uploading, setUploading] = useState(false)

  return (
    <div className="space-y-3">
      <Label className={fieldLabel}>{label}</Label>

      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted/50">
          {value ? (
            kind === "video" ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <img src={value} alt={label} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 shadow-xs transition-colors hover:bg-muted/50">
            <input
              type="file"
              className="sr-only"
              accept={kind === "video" ? "video/*" : "image/*"}
              disabled={uploading}
              onChange={(e) => handleFieldFileUpload(e, onChange, setUploading)}
            />
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <UploadCloud className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs font-bold">{value ? "Replace" : "Upload"}</span>
          </label>

          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      </div>

      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
