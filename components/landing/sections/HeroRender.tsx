import type { HeroData, LandingTheme } from "@/lib/landing/sections"
import { toEmbedUrl, whatsappLink } from "@/lib/landing/sections"
import { RADIUS_CLASS, contentWidthClass } from "@/components/landing/shared"

export default function HeroRender({ data, theme, fullWidth = false }: { data: HeroData; theme: LandingTheme; fullWidth?: boolean }) {
  const embed = data.videoUrl ? toEmbedUrl(data.videoUrl) : ""
  const wa = data.showWhatsapp ? whatsappLink(theme.whatsapp, data.whatsappText) : ""

  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-4xl")} px-6 text-center flex flex-col items-center gap-5`}>
      {data.badge && (
        <span
          className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
          style={{ backgroundColor: theme.primary, color: theme.primaryText }}
        >
          {data.badge}
        </span>
      )}
      {data.heading && <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">{data.heading}</h1>}
      {data.subheading && <p className="text-base sm:text-lg opacity-80 max-w-xl">{data.subheading}</p>}

      {embed ? (
        <div className="w-full aspect-video mt-4 overflow-hidden rounded-xl">
          <iframe src={embed} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        </div>
      ) : data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt={data.imageAlt || ""} className={`w-full mt-4 rounded-xl object-cover ${fullWidth ? "" : "max-w-md"}`} />
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
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
            {data.whatsappText || "WhatsApp"}
          </a>
        )}
      </div>
    </div>
  )
}
