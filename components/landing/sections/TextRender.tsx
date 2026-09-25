import type { TextData } from "@/lib/landing/sections"

export default function TextRender({ data }: { data: TextData }) {
  if (!data.html) return null
  return (
    <div className="max-w-3xl mx-auto px-6" style={{ textAlign: data.align }}>
      <div className="page-content max-w-none" dangerouslySetInnerHTML={{ __html: data.html }} />
    </div>
  )
}
