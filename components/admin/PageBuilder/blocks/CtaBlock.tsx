"use client"
import { CtaProps } from "../types"

interface Props {
  props: CtaProps
  onChange: (props: CtaProps) => void
}

// ─── Preview ──────────────────────────────────────────────────────────────────
export function CtaPreview({ props: p }: { props: CtaProps }) {
  const alignClass = p.align === 'center' ? 'items-center text-center' : p.align === 'right' ? 'items-end text-right' : 'items-start text-left'
  return (
    <div className="relative w-full overflow-hidden" style={{ backgroundColor: p.backgroundColor }}>
      {p.backgroundImage && (
        <img src={p.backgroundImage} alt={p.backgroundImageAlt || ''} className="absolute inset-0 w-full h-full object-cover opacity-20" />
      )}
      <div className={`relative z-10 flex flex-col ${alignClass} gap-5 px-10 py-16 max-w-4xl mx-auto`}>
        {p.heading && (
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: p.textColor }}>
            {p.heading}
          </h2>
        )}
        {p.subtext && (
          <p className="text-base opacity-80 max-w-xl" style={{ color: p.textColor }}>
            {p.subtext}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {p.buttonText && (
            <a
              href={p.buttonLink || '#'}
              className="inline-block px-8 py-3 text-sm font-bold uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: p.buttonColor, color: p.backgroundColor }}
            >
              {p.buttonText}
            </a>
          )}
          {p.secondaryButtonText && (
            <a
              href={p.secondaryButtonLink || '#'}
              className="inline-block px-8 py-3 text-sm font-bold uppercase tracking-widest border-2 transition-all hover:opacity-80"
              style={{ color: p.textColor, borderColor: p.textColor }}
            >
              {p.secondaryButtonText}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export function CtaSettings({ props: p, onChange }: Props) {
  const set = (key: keyof CtaProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label="Heading">
        <input className={inp} value={p.heading} onChange={e => set('heading', e.target.value)} />
      </Field>
      <Field label="Subtext">
        <textarea className={`${inp} resize-none`} rows={2} value={p.subtext} onChange={e => set('subtext', e.target.value)} />
      </Field>
      <div className="border border-zinc-200 rounded-lg p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Primary Button</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Text">
            <input className={inp} value={p.buttonText} onChange={e => set('buttonText', e.target.value)} />
          </Field>
          <Field label="Link">
            <input className={inp} value={p.buttonLink} onChange={e => set('buttonLink', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="border border-zinc-200 rounded-lg p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Secondary Button (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Text">
            <input className={inp} value={p.secondaryButtonText} onChange={e => set('secondaryButtonText', e.target.value)} />
          </Field>
          <Field label="Link">
            <input className={inp} value={p.secondaryButtonLink} onChange={e => set('secondaryButtonLink', e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="BG Color">
          <div className="flex items-center gap-1.5">
            <input type="color" value={p.backgroundColor} onChange={e => set('backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <input className={`${inp} flex-1 text-xs`} value={p.backgroundColor} onChange={e => set('backgroundColor', e.target.value)} />
          </div>
        </Field>
        <Field label="Text Color">
          <div className="flex items-center gap-1.5">
            <input type="color" value={p.textColor} onChange={e => set('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <input className={`${inp} flex-1 text-xs`} value={p.textColor} onChange={e => set('textColor', e.target.value)} />
          </div>
        </Field>
        <Field label="Button Color">
          <div className="flex items-center gap-1.5">
            <input type="color" value={p.buttonColor} onChange={e => set('buttonColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <input className={`${inp} flex-1 text-xs`} value={p.buttonColor} onChange={e => set('buttonColor', e.target.value)} />
          </div>
        </Field>
      </div>
      <Field label="Background Image URL (optional)">
        <input className={inp} placeholder="https://..." value={p.backgroundImage} onChange={e => set('backgroundImage', e.target.value)} />
      </Field>
      {p.backgroundImage && (
        <Field label="Background Image Alt Text">
          <input className={inp} placeholder="Leave empty if the heading already says what the image shows" value={p.backgroundImageAlt || ''} onChange={e => set('backgroundImageAlt', e.target.value)} />
        </Field>
      )}
      <Field label="Alignment">
        <select className={inp} value={p.align} onChange={e => set('align', e.target.value as any)}>
          {['left','center','right'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
    </div>
  )
}

const inp = "w-full px-3 py-2 text-sm border border-zinc-200 rounded-md bg-white focus:outline-none focus:border-zinc-900 transition-colors"
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">{label}</label>
      {children}
    </div>
  )
}
