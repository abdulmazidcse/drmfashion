"use client"
import { HtmlProps } from "../types"

interface Props { props: HtmlProps; onChange: (props: HtmlProps) => void }

export function HtmlPreview({ props: p }: { props: HtmlProps }) {
  return (
    <div
      className="w-full px-8 py-6"
      dangerouslySetInnerHTML={{ __html: p.html }}
    />
  )
}

export function HtmlSettings({ props: p, onChange }: Props) {
  const set = (key: keyof HtmlProps, val: any) => onChange({ ...p, [key]: val })
  return (
    <div className="space-y-4">
      <Field label="Raw HTML / Embed Code">
        <div className="text-[10px] text-zinc-400 mb-1">⚠️ Use with caution — injected directly into the page.</div>
        <textarea
          className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md bg-zinc-900 text-green-400 font-mono focus:outline-none focus:border-zinc-700 transition-colors resize-y"
          rows={14}
          value={p.html}
          onChange={e => set('html', e.target.value)}
          spellCheck={false}
        />
      </Field>
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Templates</p>
        <div className="space-y-1.5">
          {[
            ['YouTube Embed', '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">\n  <iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe>\n</div>'],
            ['Google Map', '<iframe src="https://maps.google.com/maps?q=your+location&output=embed" width="100%" height="400" style="border:0" allowfullscreen loading="lazy"></iframe>'],
            ['Alert Box', '<div style="background:#fef9c3;border:1px solid #fde047;padding:16px 20px;border-radius:8px;color:#713f12"><strong>📢 Notice:</strong> Your message here.</div>'],
            ['Info Card', '<div style="background:#f0f9ff;border:1px solid #bae6fd;padding:20px;border-radius:8px;color:#0c4a6e"><h4 style="margin:0 0 8px">ℹ️ Information</h4><p style="margin:0">Your information text here.</p></div>'],
          ].map(([label, tpl]) => (
            <button key={label} type="button" onClick={() => set('html', tpl)}
              className="w-full text-left px-3 py-2 text-xs border border-zinc-200 rounded bg-white hover:bg-zinc-50 transition-colors font-medium">
              {label}
            </button>
          ))}
        </div>
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
