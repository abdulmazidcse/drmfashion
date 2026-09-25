import type { TextData } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

export default function TextRender({ data, fullWidth = false }: { data: TextData; fullWidth?: boolean }) {
  if (!data.html) return null
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-3xl")} px-6`} style={{ textAlign: data.align }}>
      <div className="page-content max-w-none" dangerouslySetInnerHTML={{ __html: data.html }} />
    </div>
  )
}
