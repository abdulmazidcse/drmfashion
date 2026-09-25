"use client"
import type { LandingTheme } from "@/lib/landing/sections"
import { Field, inp, ColorField } from "@/components/admin/landing/fieldHelpers"
import { Switch } from "@/components/ui/switch"

interface Props {
  theme: LandingTheme
  onChange: (patch: Partial<LandingTheme>) => void
}

export default function ThemeSettings({ theme, onChange }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-8">
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Colours</h3>
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Primary" value={theme.primary} onChange={(v) => onChange({ primary: v })} />
            <ColorField label="Primary Text" value={theme.primaryText} onChange={(v) => onChange({ primaryText: v })} />
            <ColorField label="Accent (order buttons)" value={theme.accent} onChange={(v) => onChange({ accent: v })} />
            <ColorField label="Accent Text" value={theme.accentText} onChange={(v) => onChange({ accentText: v })} />
            <ColorField label="Page Background" value={theme.pageBg} onChange={(v) => onChange({ pageBg: v })} />
            <ColorField label="Body Text" value={theme.text} onChange={(v) => onChange({ text: v })} />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Layout</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Font">
              <select className={inp} value={theme.font} onChange={(e) => onChange({ font: e.target.value as LandingTheme["font"] })}>
                <option value="default">Default (site font)</option>
                <option value="bangla">Bangla</option>
              </select>
            </Field>
            <Field label="Content Width">
              <select className={inp} value={theme.width} onChange={(e) => onChange({ width: e.target.value as LandingTheme["width"] })}>
                <option value="narrow">Narrow</option>
                <option value="medium">Medium</option>
                <option value="wide">Wide</option>
              </select>
            </Field>
            <Field label="Corner Radius">
              <select className={inp} value={theme.radius} onChange={(e) => onChange({ radius: e.target.value as LandingTheme["radius"] })}>
                <option value="none">None</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
            <Field label="Order Form Language">
              <select className={inp} value={theme.language} onChange={(e) => onChange({ language: e.target.value as LandingTheme["language"] })}>
                <option value="bn">Bangla</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Page Chrome</h3>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <span className="text-xs font-bold text-zinc-700">Show site header</span>
            <Switch checked={theme.showHeader} onCheckedChange={(v) => onChange({ showHeader: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <span className="text-xs font-bold text-zinc-700">Show site footer</span>
            <Switch checked={theme.showFooter} onCheckedChange={(v) => onChange({ showFooter: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <span className="text-xs font-bold text-zinc-700">Mobile sticky order bar</span>
            <Switch checked={theme.stickyButton} onCheckedChange={(v) => onChange({ stickyButton: v })} />
          </div>
          {theme.stickyButton && (
            <Field label="Sticky Bar Text">
              <input className={inp} value={theme.stickyButtonText} onChange={(e) => onChange({ stickyButtonText: e.target.value })} />
            </Field>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">WhatsApp</h3>
          <Field label="Number (with country code, digits only)">
            <input className={`${inp} font-mono`} value={theme.whatsapp} onChange={(e) => onChange({ whatsapp: e.target.value })} placeholder="8801XXXXXXXXX" />
          </Field>
          <p className="text-[10px] text-zinc-400">Leave empty to hide the floating WhatsApp button and any section&apos;s WhatsApp buttons.</p>
        </section>
      </div>
    </div>
  )
}
