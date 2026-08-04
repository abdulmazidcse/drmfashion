import { Block, HeroProps, TextProps, ImageProps, TwoColumnProps, CtaProps, DividerProps, SpacerProps, HtmlProps } from "@/components/admin/PageBuilder/types"

// ─── Public-facing renderer (Server Component safe) ───────────────────────────

function HeroRender({ p }: { p: HeroProps }) {
  const heightMap = { small: '280px', medium: '420px', large: '560px', full: '100vh' }
  const alignMap = {
    left: { container: 'items-start', text: 'text-left' },
    center: { container: 'items-center', text: 'text-center' },
    right: { container: 'items-end', text: 'text-right' },
  }
  const a = alignMap[p.textAlign]

  return (
    <div
      className="relative w-full flex flex-col justify-center overflow-hidden"
      style={{ minHeight: heightMap[p.height], backgroundColor: p.backgroundColor }}
    >
      {p.backgroundImage && (
        <img src={p.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      {p.overlayOpacity > 0 && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${p.overlayOpacity / 100})` }} />
      )}
      <div className={`relative z-10 flex flex-col ${a.container} ${a.text} gap-6 px-8 py-16 max-w-5xl mx-auto w-full`}>
        {p.heading && <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight" style={{ color: p.textColor }}>{p.heading}</h1>}
        {p.subheading && <p className="text-lg sm:text-xl font-light max-w-2xl opacity-90" style={{ color: p.textColor }}>{p.subheading}</p>}
        {p.buttonText && (
          <a href={p.buttonLink || '#'} className="self-start inline-block px-8 py-3.5 text-sm font-bold uppercase tracking-widest border-2 transition-all hover:bg-white hover:text-zinc-900" style={{ color: p.textColor, borderColor: p.textColor }}>
            {p.buttonText}
          </a>
        )}
      </div>
    </div>
  )
}

function TextRender({ p }: { p: TextProps }) {
  const maxW = { narrow: 'max-w-xl', medium: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-none' }
  return (
    <div className={`w-full px-8 py-10 mx-auto ${maxW[p.maxWidth]}`} style={{ textAlign: p.align }}>
      <div className="page-content max-w-none" dangerouslySetInnerHTML={{ __html: p.html }} />
    </div>
  )
}

function ImageRender({ p }: { p: ImageProps }) {
  const widths = { small: 'max-w-sm', medium: 'max-w-xl', large: 'max-w-3xl', full: 'max-w-none w-full' }
  const aligns = { left: 'mr-auto', center: 'mx-auto', right: 'ml-auto' }
  if (!p.src) return null
  const img = (
    <figure className={`${widths[p.width]} ${aligns[p.align]}`}>
      <img src={p.src} alt={p.alt || ''} className={`w-full object-cover ${p.rounded ? 'rounded-2xl' : ''} ${p.shadow ? 'shadow-2xl' : ''}`} />
      {p.caption && <figcaption className="text-center text-xs text-zinc-500 mt-2 italic">{p.caption}</figcaption>}
    </figure>
  )
  return (
    <div className="w-full px-8 py-8">
      {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer">{img}</a> : img}
    </div>
  )
}

function TwoColumnRender({ p }: { p: TwoColumnProps }) {
  const gapMap = { small: 'gap-4', medium: 'gap-8', large: 'gap-16' }
  // The `sm:` prefix has to be part of the literal here. Building it as
  // `sm:${...}` meant Tailwind never saw these class names while scanning
  // source, so every ratio except 50/50 — which happens to appear literally in
  // another component — silently stayed one column on desktop.
  const colMap: Record<string, string> = {
    '30': 'sm:grid-cols-[3fr_7fr]',
    '40': 'sm:grid-cols-[4fr_6fr]',
    '50': 'sm:grid-cols-2',
    '60': 'sm:grid-cols-[6fr_4fr]',
    '70': 'sm:grid-cols-[7fr_3fr]',
  }
  return (
    <div className="w-full px-8 py-10">
      <div className={`grid grid-cols-1 ${colMap[p.leftWidth] ?? 'sm:grid-cols-2'} ${gapMap[p.gap]}`}>
        <div>
          {p.leftImage && <img src={p.leftImage} alt="" className="w-full object-cover rounded-lg mb-4" />}
          <div className="page-content max-w-none" dangerouslySetInnerHTML={{ __html: p.leftHtml }} />
        </div>
        <div className={p.reverseOnMobile ? 'order-first sm:order-last' : ''}>
          {p.rightImage && <img src={p.rightImage} alt="" className="w-full object-cover rounded-lg mb-4" />}
          <div className="page-content max-w-none" dangerouslySetInnerHTML={{ __html: p.rightHtml }} />
        </div>
      </div>
    </div>
  )
}

function CtaRender({ p }: { p: CtaProps }) {
  const alignMap = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }
  return (
    <div className="relative w-full overflow-hidden" style={{ backgroundColor: p.backgroundColor }}>
      {p.backgroundImage && <img src={p.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
      <div className={`relative z-10 flex flex-col ${alignMap[p.align]} gap-5 px-10 py-16 max-w-4xl mx-auto`}>
        {p.heading && <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: p.textColor }}>{p.heading}</h2>}
        {p.subtext && <p className="text-base opacity-80 max-w-xl" style={{ color: p.textColor }}>{p.subtext}</p>}
        <div className="flex flex-wrap gap-3">
          {p.buttonText && <a href={p.buttonLink || '#'} className="inline-block px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-all hover:opacity-80" style={{ backgroundColor: p.buttonColor, color: p.backgroundColor }}>{p.buttonText}</a>}
          {p.secondaryButtonText && <a href={p.secondaryButtonLink || '#'} className="inline-block px-8 py-3.5 text-sm font-bold uppercase tracking-widest border-2 transition-all hover:opacity-80" style={{ color: p.textColor, borderColor: p.textColor }}>{p.secondaryButtonText}</a>}
        </div>
      </div>
    </div>
  )
}

function DividerRender({ p }: { p: DividerProps }) {
  return (
    <div style={{ paddingTop: p.marginTop, paddingBottom: p.marginBottom, paddingLeft: 32, paddingRight: 32 }}>
      <hr style={{ borderStyle: p.style, borderColor: p.color, borderTopWidth: p.thickness }} />
    </div>
  )
}

function SpacerRender({ p }: { p: SpacerProps }) {
  return <div style={{ height: p.height }} aria-hidden="true" />
}

function HtmlRender({ p }: { p: HtmlProps }) {
  return <div className="w-full px-8 py-6 page-content" dangerouslySetInnerHTML={{ __html: p.html }} />
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export default function BlockRenderer({ content }: { content: string }) {
  if (!content?.trim()) return null

  let blocks: Block[]
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      blocks = parsed
    } else {
      // Legacy HTML string
      return <div className="page-content max-w-3xl mx-auto px-8 py-12" dangerouslySetInnerHTML={{ __html: content }} />
    }
  } catch {
    // Legacy HTML
    return <div className="page-content max-w-3xl mx-auto px-8 py-12" dangerouslySetInnerHTML={{ __html: content }} />
  }

  return (
    <div className="w-full">
      {blocks.map(block => {
        switch (block.type) {
          case 'hero':        return <HeroRender      key={block.id} p={block.props as HeroProps} />
          case 'text':        return <TextRender       key={block.id} p={block.props as TextProps} />
          case 'image':       return <ImageRender      key={block.id} p={block.props as ImageProps} />
          case 'two-column':  return <TwoColumnRender  key={block.id} p={block.props as TwoColumnProps} />
          case 'cta':         return <CtaRender        key={block.id} p={block.props as CtaProps} />
          case 'divider':     return <DividerRender    key={block.id} p={block.props as DividerProps} />
          case 'spacer':      return <SpacerRender     key={block.id} p={block.props as SpacerProps} />
          case 'html':        return <HtmlRender       key={block.id} p={block.props as HtmlProps} />
          default:            return null
        }
      })}
    </div>
  )
}
