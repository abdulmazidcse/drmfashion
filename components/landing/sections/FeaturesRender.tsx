import { Check, Star, ArrowRight } from "lucide-react"
import type { FeaturesData, LandingTheme } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

const COLS_CLASS: Record<FeaturesData["columns"], string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
}

function IconFor({ icon, color }: { icon: FeaturesData["icon"]; color?: string }) {
  const style = color ? { color } : undefined
  if (icon === "check") return <Check className="w-4 h-4 shrink-0 mt-0.5" style={style} />
  if (icon === "star") return <Star className="w-4 h-4 shrink-0 mt-0.5" style={style} />
  if (icon === "arrow") return <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" style={style} />
  return null
}

export default function FeaturesRender({ data, theme, fullWidth = false }: { data: FeaturesData; theme: LandingTheme; fullWidth?: boolean }) {
  const items = data.items.filter(Boolean)
  if (items.length === 0) return null
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-3xl")} px-6`}>
      <div
        className="p-6 sm:p-8 rounded-xl"
        style={{ backgroundColor: data.cardBg || undefined }}
      >
        {data.title && <h2 className="text-xl sm:text-2xl font-black mb-5">{data.title}</h2>}
        <ul className={`grid gap-3 ${COLS_CLASS[data.columns]}`}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <IconFor icon={data.icon} color={data.iconColor || theme.primary} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
