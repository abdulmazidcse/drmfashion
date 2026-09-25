import type { GalleryData } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

const COLS_CLASS: Record<GalleryData["columns"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

export default function GalleryRender({ data, fullWidth = false }: { data: GalleryData; fullWidth?: boolean }) {
  const images = data.images.filter(Boolean)
  if (images.length === 0) return null
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-5xl")} ${fullWidth ? "" : "px-6"}`}>
      {data.title && <h2 className="text-xl sm:text-2xl font-black text-center mb-8">{data.title}</h2>}
      <div className={`grid gap-3 ${COLS_CLASS[data.columns]}`}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="w-full aspect-square object-cover rounded-lg" />
        ))}
      </div>
    </div>
  )
}
