"use client"
import { DividerProps } from "../types"

interface Props { props: DividerProps; onChange: (props: DividerProps) => void }

export function DividerPreview({ props: p }: { props: DividerProps }) {
  return (
    <div style={{ paddingTop: p.marginTop, paddingBottom: p.marginBottom }}>
      <hr style={{
        borderStyle: p.style,
        borderColor: p.color,
        borderTopWidth: p.thickness,
      }} />
    </div>
  )
}

export function DividerSettings({ props: p, onChange }: Props) {
  const set = (key: keyof DividerProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Style">
          <select className={inp} value={p.style} onChange={e => set('style', e.target.value as any)}>
            {['solid','dashed','dotted'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Color">
          <div className="flex items-center gap-2">
            <input type="color" value={p.color} onChange={e => set('color', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            <input className={`${inp} flex-1`} value={p.color} onChange={e => set('color', e.target.value)} />
          </div>
        </Field>
      </div>
      <Field label={`Thickness: ${p.thickness}px`}>
        <input type="range" min={1} max={8} value={p.thickness} onChange={e => set('thickness', Number(e.target.value))} className="w-full accent-zinc-900" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Top Margin: ${p.marginTop}px`}>
          <input type="range" min={0} max={120} value={p.marginTop} onChange={e => set('marginTop', Number(e.target.value))} className="w-full accent-zinc-900" />
        </Field>
        <Field label={`Bottom Margin: ${p.marginBottom}px`}>
          <input type="range" min={0} max={120} value={p.marginBottom} onChange={e => set('marginBottom', Number(e.target.value))} className="w-full accent-zinc-900" />
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
