"use client"
import dynamic from "next/dynamic"
import { TwoColumnProps } from "../types"

// CKEditor touches `window` on import, so it can never render on the server.
const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-xs text-zinc-400 border border-zinc-200 rounded-xl">
      Loading editor…
    </div>
  ),
})

interface Props {
  props: TwoColumnProps
  onChange: (props: TwoColumnProps) => void
}

const GAP_MAP = { small: 'gap-4', medium: 'gap-8', large: 'gap-16' }

function getGridCols(leftWidth: string) {
  const map: Record<string, string> = {
    '30': 'grid-cols-[3fr_7fr]',
    '40': 'grid-cols-[4fr_6fr]',
    '50': 'grid-cols-2',
    '60': 'grid-cols-[6fr_4fr]',
    '70': 'grid-cols-[7fr_3fr]',
  }
  return map[leftWidth] || 'grid-cols-2'
}

// ─── Preview ──────────────────────────────────────────────────────────────────
export function TwoColumnPreview({ props: p }: { props: TwoColumnProps }) {
  return (
    <div className="w-full px-8 py-10">
      <div className={`grid ${getGridCols(p.leftWidth)} ${GAP_MAP[p.gap]} ${p.reverseOnMobile ? 'max-sm:grid-cols-1 max-sm:[&>*:first-child]:order-2' : 'max-sm:grid-cols-1'}`}>
        <div>
          {p.leftImage && (
            <img src={p.leftImage} alt={p.leftImageAlt || ''} className="w-full object-cover rounded-lg mb-4" />
          )}
          <div
            className="page-content max-w-none"
            dangerouslySetInnerHTML={{ __html: p.leftHtml }}
          />
        </div>
        <div>
          {p.rightImage && (
            <img src={p.rightImage} alt={p.rightImageAlt || ''} className="w-full object-cover rounded-lg mb-4" />
          )}
          <div
            className="page-content max-w-none"
            dangerouslySetInnerHTML={{ __html: p.rightHtml }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export function TwoColumnSettings({ props: p, onChange }: Props) {
  const set = (key: keyof TwoColumnProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Left Column Width">
          <select className={inp} value={p.leftWidth} onChange={e => set('leftWidth', e.target.value as any)}>
            <option value="30">30% / 70%</option>
            <option value="40">40% / 60%</option>
            <option value="50">50% / 50%</option>
            <option value="60">60% / 40%</option>
            <option value="70">70% / 30%</option>
          </select>
        </Field>
        <Field label="Gap">
          <select className={inp} value={p.gap} onChange={e => set('gap', e.target.value as any)}>
            {['small','medium','large'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      </div>

      <div className="border border-zinc-200 rounded-lg p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Left Column</p>
        <Field label="Image URL (optional)">
          <input className={inp} placeholder="https://..." value={p.leftImage} onChange={e => set('leftImage', e.target.value)} />
        </Field>
        {p.leftImage && (
          <Field label="Image Alt Text">
            <input className={inp} placeholder="Leave empty if the heading already says what the image shows" value={p.leftImageAlt || ''} onChange={e => set('leftImageAlt', e.target.value)} />
          </Field>
        )}
        <Field label="Content">
          <RichTextEditor initialContent={p.leftHtml} onChange={html => set('leftHtml', html)} height={200} />
        </Field>
      </div>

      <div className="border border-zinc-200 rounded-lg p-3 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Right Column</p>
        <Field label="Image URL (optional)">
          <input className={inp} placeholder="https://..." value={p.rightImage} onChange={e => set('rightImage', e.target.value)} />
        </Field>
        {p.rightImage && (
          <Field label="Image Alt Text">
            <input className={inp} placeholder="Leave empty if the heading already says what the image shows" value={p.rightImageAlt || ''} onChange={e => set('rightImageAlt', e.target.value)} />
          </Field>
        )}
        <Field label="Content">
          <RichTextEditor initialContent={p.rightHtml} onChange={html => set('rightHtml', html)} height={200} />
        </Field>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={p.reverseOnMobile} onChange={e => set('reverseOnMobile', e.target.checked)} className="w-4 h-4 accent-zinc-900" />
        <span className="text-sm text-zinc-700">Reverse column order on mobile</span>
      </label>
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
