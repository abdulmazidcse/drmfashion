import type { VideoData } from "@/lib/landing/sections"
import { toEmbedUrl } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

export default function VideoRender({ data, fullWidth = false }: { data: VideoData; fullWidth?: boolean }) {
  const embed = toEmbedUrl(data.url)
  if (!embed) return null
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-3xl")} ${fullWidth ? "" : "px-6"}`}>
      {data.title && <h2 className="text-xl sm:text-2xl font-black text-center mb-6">{data.title}</h2>}
      <div className="w-full aspect-video overflow-hidden rounded-xl">
        <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
      </div>
    </div>
  )
}
