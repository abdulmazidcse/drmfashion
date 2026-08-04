"use client"
import { ImageProps } from "../types"

interface Props {
  props: ImageProps
  onChange: (props: ImageProps) => void
}

const WIDTH_MAP = {
  small: 'max-w-sm',
  medium: 'max-w-xl',
  large: 'max-w-3xl',
  full: 'max-w-none w-full',
}

const ALIGN_MAP = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

// ─── Preview ──────────────────────────────────────────────────────────────────
export function ImagePreview({ props: p }: { props: ImageProps }) {
  const img = (
    <figure className={`${WIDTH_MAP[p.width]} ${ALIGN_MAP[p.align]}`}>
      {p.src ? (
        <img
          src={p.src}
          alt={p.alt || ''}
          className={`w-full object-cover ${p.rounded ? 'rounded-2xl' : ''} ${p.shadow ? 'shadow-2xl' : ''}`}
        />
      ) : (
        <div className="w-full h-48 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
          No image selected
        </div>
      )}
      {p.caption && (
        <figcaption className="text-center text-xs text-zinc-500 mt-2 italic">{p.caption}</figcaption>
      )}
    </figure>
  )
  return (
    <div className="w-full px-8 py-8">
      {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer">{img}</a> : img}
    </div>
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export function ImageSettings({ props: p, onChange }: Props) {
  const set = (key: keyof ImageProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label="Image URL">
        <input className={inp} placeholder="https://..." value={p.src} onChange={e => set('src', e.target.value)} />
      </Field>
      {p.src && (
        <img src={p.src} alt="preview" className="w-full h-40 object-cover rounded-lg border border-zinc-200" />
      )}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick Images (Unsplash)</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=70',
            'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=70',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=70',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=70',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=70',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=70',
          ].map(url => (
            <button key={url} type="button" onClick={() => set('src', url)} className="relative overflow-hidden rounded border-2 border-transparent hover:border-zinc-900 transition-all">
              <img src={url} alt="" className="w-full h-14 object-cover" />
            </button>
          ))}
        </div>
      </div>
      <Field label="Alt Text">
        <input className={inp} value={p.alt} onChange={e => set('alt', e.target.value)} />
      </Field>
      <Field label="Caption">
        <input className={inp} value={p.caption} onChange={e => set('caption', e.target.value)} />
      </Field>
      <Field label="Link (optional)">
        <input className={inp} placeholder="https://..." value={p.link} onChange={e => set('link', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Width">
          <select className={inp} value={p.width} onChange={e => set('width', e.target.value as any)}>
            {['small','medium','large','full'].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
        <Field label="Align">
          <select className={inp} value={p.align} onChange={e => set('align', e.target.value as any)}>
            {['left','center','right'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={p.rounded} onChange={e => set('rounded', e.target.checked)} className="w-4 h-4 accent-zinc-900" />
          <span className="text-sm text-zinc-700">Rounded corners</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={p.shadow} onChange={e => set('shadow', e.target.checked)} className="w-4 h-4 accent-zinc-900" />
          <span className="text-sm text-zinc-700">Drop shadow</span>
        </label>
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
