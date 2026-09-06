"use client"
import { useState } from "react"
import { HeroProps } from "../types"

interface Props {
  props: HeroProps
  onChange: (props: HeroProps) => void
}

const HEIGHT_MAP = {
  small: 'min-h-[280px]',
  medium: 'min-h-[420px]',
  large: 'min-h-[560px]',
  full: 'min-h-screen',
}

// ─── Preview ──────────────────────────────────────────────────────────────────
export function HeroPreview({ props: p }: { props: HeroProps }) {
  const alignClass = p.textAlign === 'center' ? 'items-center text-center' : p.textAlign === 'right' ? 'items-end text-right' : 'items-start text-left'
  return (
    <div
      className={`relative w-full flex flex-col justify-center ${HEIGHT_MAP[p.height]} overflow-hidden`}
      style={{ backgroundColor: p.backgroundColor }}
    >
      {p.backgroundImage && (
        <img
          src={p.backgroundImage}
          alt={p.backgroundImageAlt || ''}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {p.overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,' + (p.overlayOpacity / 100) + ')' }}
        />
      )}
      <div className={`relative z-10 flex flex-col ${alignClass} gap-5 px-8 py-12 max-w-4xl mx-auto w-full`}>
        {p.heading && (
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight" style={{ color: p.textColor }}>
            {p.heading}
          </h1>
        )}
        {p.subheading && (
          <p className="text-lg sm:text-xl font-light max-w-2xl opacity-90" style={{ color: p.textColor }}>
            {p.subheading}
          </p>
        )}
        {p.buttonText && (
          <a
            href={p.buttonLink || '#'}
            className="inline-block px-8 py-3 text-sm font-bold uppercase tracking-widest border-2 text-[var(--hero-btn)] border-[var(--hero-btn)] transition-all hover:bg-white hover:text-zinc-900 hover:border-white"
            style={{ ['--hero-btn' as string]: p.textColor }}
          >
            {p.buttonText}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export function HeroSettings({ props: p, onChange }: Props) {
  const set = (key: keyof HeroProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label="Heading">
        <input className={inp} value={p.heading} onChange={e => set('heading', e.target.value)} />
      </Field>
      <Field label="Subheading">
        <textarea className={`${inp} resize-none`} rows={2} value={p.subheading} onChange={e => set('subheading', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Button Text">
          <input className={inp} value={p.buttonText} onChange={e => set('buttonText', e.target.value)} />
        </Field>
        <Field label="Button Link">
          <input className={inp} value={p.buttonLink} onChange={e => set('buttonLink', e.target.value)} />
        </Field>
      </div>
      <Field label="Background Image URL">
        <input className={inp} placeholder="https://..." value={p.backgroundImage} onChange={e => set('backgroundImage', e.target.value)} />
      </Field>
      {p.backgroundImage && (
        <img src={p.backgroundImage} alt="preview" className="w-full h-24 object-cover rounded-lg border border-zinc-200" />
      )}
      {p.backgroundImage && (
        <Field label="Background Image Alt Text">
          <input className={inp} placeholder="Leave empty if the heading already says what the image shows" value={p.backgroundImageAlt || ''} onChange={e => set('backgroundImageAlt', e.target.value)} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="BG Color">
          <div className="flex items-center gap-2">
            <input type="color" value={p.backgroundColor} onChange={e => set('backgroundColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            <input className={`${inp} flex-1`} value={p.backgroundColor} onChange={e => set('backgroundColor', e.target.value)} />
          </div>
        </Field>
        <Field label="Text Color">
          <div className="flex items-center gap-2">
            <input type="color" value={p.textColor} onChange={e => set('textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
            <input className={`${inp} flex-1`} value={p.textColor} onChange={e => set('textColor', e.target.value)} />
          </div>
        </Field>
      </div>
      <Field label={`Overlay Opacity: ${p.overlayOpacity}%`}>
        <input type="range" min={0} max={90} value={p.overlayOpacity} onChange={e => set('overlayOpacity', Number(e.target.value))} className="w-full accent-zinc-900" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Height">
          <select className={inp} value={p.height} onChange={e => set('height', e.target.value as any)}>
            {['small','medium','large','full'].map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </Field>
        <Field label="Text Align">
          <select className={inp} value={p.textAlign} onChange={e => set('textAlign', e.target.value as any)}>
            {['left','center','right'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
      </div>
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
