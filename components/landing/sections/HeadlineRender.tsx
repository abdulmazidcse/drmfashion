import type { HeadlineData, LandingTheme } from "@/lib/landing/sections"

const SIZE_CLASS: Record<HeadlineData["size"], string> = {
  md: "text-lg sm:text-xl px-5 py-3",
  lg: "text-xl sm:text-2xl px-6 py-4",
  xl: "text-2xl sm:text-3xl px-8 py-5",
}

export default function HeadlineRender({ data, theme }: { data: HeadlineData; theme: LandingTheme }) {
  if (!data.text) return null
  return (
    <div className="max-w-3xl mx-auto px-6 text-center">
      <div
        className={`inline-block font-black uppercase tracking-wide rounded-md ${SIZE_CLASS[data.size]}`}
        style={{ backgroundColor: data.boxColor || theme.primary, color: data.boxTextColor || theme.primaryText }}
      >
        {data.text}
      </div>
    </div>
  )
}
