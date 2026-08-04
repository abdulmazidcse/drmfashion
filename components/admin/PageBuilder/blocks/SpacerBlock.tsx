"use client"
import { SpacerProps } from "../types"

interface Props { props: SpacerProps; onChange: (props: SpacerProps) => void }

export function SpacerPreview({ props: p }: { props: SpacerProps }) {
  return (
    <div style={{ height: p.height }} className="w-full relative">
      <div className="absolute inset-0 flex items-center justify-center border border-dashed border-zinc-200 bg-zinc-50/50">
        <span className="text-[10px] text-zinc-400 font-mono">{p.height}px spacer</span>
      </div>
    </div>
  )
}

export function SpacerSettings({ props: p, onChange }: Props) {
  const set = (key: keyof SpacerProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label={`Height: ${p.height}px`}>
        <input type="range" min={10} max={300} value={p.height} onChange={e => set('height', Number(e.target.value))} className="w-full accent-zinc-900" />
      </Field>
      <div className="grid grid-cols-4 gap-2">
        {[20,40,60,80,100,120,160,200].map(h => (
          <button key={h} type="button" onClick={() => set('height', h)}
            className={`py-2 text-xs font-bold border rounded transition-colors ${p.height === h ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 hover:bg-zinc-50'}`}>
            {h}px
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">{label}</label>
      {children}
    </div>
  )
}
