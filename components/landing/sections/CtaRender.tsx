import type { CtaData, LandingTheme } from "@/lib/landing/sections"
import { whatsappLink } from "@/lib/landing/sections"
import { RADIUS_CLASS } from "@/components/landing/shared"

export default function CtaRender({ data, theme }: { data: CtaData; theme: LandingTheme }) {
  const wa = data.showWhatsapp ? whatsappLink(theme.whatsapp) : ""
  if (!data.heading && !data.text) return null
  return (
    <div className="max-w-2xl mx-auto px-6 text-center flex flex-col items-center gap-4">
      {data.heading && <h2 className="text-xl sm:text-3xl font-black tracking-tight">{data.heading}</h2>}
      {data.text && <p className="text-sm sm:text-base opacity-80">{data.text}</p>}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
        {data.buttonText && (
          <a
            href="#order"
            className={`inline-block px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-90 ${RADIUS_CLASS[theme.radius]}`}
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            {data.buttonText}
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block px-8 py-3.5 text-sm font-bold uppercase tracking-widest border-2 ${RADIUS_CLASS[theme.radius]}`}
            style={{ borderColor: theme.primary, color: theme.primary }}
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
