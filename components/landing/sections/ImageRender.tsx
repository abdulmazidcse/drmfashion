import type { ImageData } from "@/lib/landing/sections"

const WIDTH_CLASS: Record<ImageData["width"], string> = {
  sm: "max-w-sm",
  md: "max-w-xl",
  lg: "max-w-3xl",
  full: "max-w-none w-full",
}

export default function ImageRender({ data, fullWidth = false }: { data: ImageData; fullWidth?: boolean }) {
  if (!data.src) return null
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={data.src} alt={data.alt || ""} className={`w-full object-cover ${data.rounded && !fullWidth ? "rounded-xl" : ""}`} />
  return (
    <div className={fullWidth ? "" : "px-6"}>
      <div className={fullWidth ? "w-full" : `mx-auto ${WIDTH_CLASS[data.width]}`}>
        {data.link ? (
          <a href={data.link} target="_blank" rel="noopener noreferrer">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    </div>
  )
}
