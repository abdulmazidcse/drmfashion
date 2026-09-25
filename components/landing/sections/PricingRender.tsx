import type { PricingData, LandingTheme } from "@/lib/landing/sections"
import { RADIUS_CLASS, contentWidthClass } from "@/components/landing/shared"

export default function PricingRender({ data, theme, fullWidth = false }: { data: PricingData; theme: LandingTheme; fullWidth?: boolean }) {
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-md")} px-6 text-center`}>
      {data.title && <h2 className="text-xl sm:text-2xl font-black mb-5">{data.title}</h2>}
      <div className={`border p-6 space-y-3 ${RADIUS_CLASS[theme.radius]}`} style={{ borderColor: theme.primary }}>
        {data.regularPrice && (
          <p className="text-sm opacity-60">
            {data.regularLabel}: <span className="line-through">{data.regularPrice}</span>
          </p>
        )}
        {data.offerPrice && (
          <p className="text-3xl font-black" style={{ color: theme.accent }}>
            {data.offerLabel}: {data.offerPrice}
          </p>
        )}
        {data.note && <p className="text-xs opacity-70">{data.note}</p>}
        {data.buttonText && (
          <a
            href="#order"
            className={`inline-block mt-2 px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90 ${RADIUS_CLASS[theme.radius]}`}
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            {data.buttonText}
          </a>
        )}
      </div>
    </div>
  )
}
