"use client"
import dynamic from "next/dynamic"
import { TextProps } from "../types"

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
  props: TextProps
  onChange: (props: TextProps) => void
}

const MAX_WIDTH_MAP = {
  narrow: 'max-w-xl',
  medium: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: 'max-w-none',
}

// ─── Preview ──────────────────────────────────────────────────────────────────
export function TextPreview({ props: p }: { props: TextProps }) {
  return (
    <div className={`w-full px-8 py-10 mx-auto ${MAX_WIDTH_MAP[p.maxWidth]}`} style={{ textAlign: p.align }}>
      {/* Matches BlockRenderer's TextRender exactly (`page-content`) so this
          editor preview isn't a lie about what publishes — `prose-*:` needs
          @tailwindcss/typography, which isn't installed here, so it rendered
          admin-authored lists/headings flat while the real page looked fine. */}
      <div
        className="page-content max-w-none"
        dangerouslySetInnerHTML={{ __html: p.html }}
      />
    </div>
  )
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export function TextSettings({ props: p, onChange }: Props) {
  const set = (key: keyof TextProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label="Content">
        <div className="text-[10px] text-zinc-400 mb-1">
          Formatting, sizes and links from the toolbar. The <strong>Source</strong> button still gives
          you the raw HTML this field used to be.
        </div>
        <RichTextEditor
          initialContent={p.html}
          onChange={(html) => set('html', html)}
          height={260}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Text Align">
          <select className={inp} value={p.align} onChange={e => set('align', e.target.value as any)}>
            {['left','center','right'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Max Width">
          <select className={inp} value={p.maxWidth} onChange={e => set('maxWidth', e.target.value as any)}>
            {['narrow','medium','wide','full'].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
      </div>
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Quick Insert</p>
        <div className="flex flex-wrap gap-2">
          {[
            ['H1', '<h1>Heading 1</h1>'],
            ['H2', '<h2>Heading 2</h2>'],
            ['H3', '<h3>Heading 3</h3>'],
            ['Para', '<p>Your paragraph text here.</p>'],
            ['Bold', '<strong>Bold text</strong>'],
            ['Link', '<a href="#">Link text</a>'],
            ['List', '<ul><li>Item 1</li><li>Item 2</li></ul>'],
          ].map(([label, html]) => (
            <button
              key={label}
              type="button"
              onClick={() => set('html', p.html + '\n' + html)}
              className="px-2 py-1 text-[10px] font-bold border border-zinc-200 rounded bg-white hover:bg-zinc-50 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
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
