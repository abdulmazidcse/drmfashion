"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Eye, Code } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import Swal from "sweetalert2";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false })

const DEFAULTS: Record<string, string> = {
  // Section 1: Hero
  fit_hero_title: "We didn't just add inches. We redesigned the fit.",
  fit_hero_desc: "Standard brands just add width when you size up. We engineer clothing specifically for the functionally blessed.",
  fit_hero_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 2: Designed Exclusively
  fit_s2_heading: "Designed Around The Fit",
  fit_s2_problem_label: "The Problem",
  fit_s2_problem_text: "Most brands grade a single sample size up and down and call it a size run. Sleeves, rises and hems all move together, so only one body in the range ever gets the fit that was designed.",
  fit_s2_solution_label: "Our Brand — The Solution",
  fit_s2_solution_text: "Extra length without extra width. We adjust the entire garment — lowering the waistline, deepening the armholes, dropping the knee break, and extending the sleeves — for a truly proportionate fit.",
  fit_section2_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 3: All the Length
  fit_s3_heading: "All the Length You Need & More",
  fit_s3_subheading: "Extra Length, Not Extra Width",
  fit_s3_text: "It takes more than a few inches at the hem. We move the waistline, the armhole, the knee break and the sleeve independently, and we measure every detail — so you get a truly proportionate fit, every time.",
  fit_problem_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 4: Proud of our guys
  fit_s4_heading: "We're proud of ALL of our guys",
  fit_section4_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 5: Heights
  fit_men_tall: "5'8\" - 6'0\"",
  fit_men_xtall: "6'1\" - 6'5\"",
  fit_women_tall: "5'4\" - 5'8\"",
  fit_women_xtall: "5'9\" - 6'1\"",

  // Section 6: Fit for all bodies
  fit_s6_heading: "A fit created for every body.",
  fit_s6_text: "We don't just cater to one body type. We grade every style across three lengths.",
  fit_section5_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 7: Science of Fit
  fit_s7_heading: "Our Fit Details",
  fit_section6_image: "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",

  // Section 9: Brand Mission
  fit_s9_heading: "Fit is not an afterthought — it's the whole design. Every style starts from the body it is cut for.",
}

export default function AboutSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ ...DEFAULTS })

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        setForm(prev => {
          const merged = { ...prev }
          for (const key of Object.keys(DEFAULTS)) {
            if (data[key]) merged[key] = data[key]
          }
          return merged
        })
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load settings", err)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error("Failed to save")
      Swal.fire({ text: "About Page Settings updated successfully!", confirmButtonColor: "#18181b", icon: "success" })
    } catch (err: any) {
      Swal.fire({ text: err.message || "Something went wrong", confirmButtonColor: "#18181b" })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950">About Page Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage every section of the /about page with rich text format.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/about"
            target="_blank"
            className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Eye className="h-4 w-4" /> Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-sm bg-zinc-950 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* ─── Section 1: Hero ─── */}
      <SectionCard title="Section 1 — Hero" badge="Top of page">
        <InputRow label="Hero Title" field="fit_hero_title" value={form.fit_hero_title} onChange={handleChange} />
        <RichTextRow label="Hero Description" field="fit_hero_desc" value={form.fit_hero_desc} onChange={handleChange} />
        <InputRow label="Hero Background Image URL" field="fit_hero_image" value={form.fit_hero_image} onChange={handleChange} />
        {form.fit_hero_image && <ImgPreview src={form.fit_hero_image} />}
      </SectionCard>

      {/* ─── Section 2: Designed Exclusively ─── */}
      <SectionCard title="Section 2 — Designed Around The Fit" badge="Split: Text Left + Image Right">
        <InputRow label="Section Heading" field="fit_s2_heading" value={form.fit_s2_heading} onChange={handleChange} />
        <InputRow label="Problem Label" field="fit_s2_problem_label" value={form.fit_s2_problem_label} onChange={handleChange} />
        <RichTextRow label="Problem Text" field="fit_s2_problem_text" value={form.fit_s2_problem_text} onChange={handleChange} />
        <InputRow label="Solution Label" field="fit_s2_solution_label" value={form.fit_s2_solution_label} onChange={handleChange} />
        <RichTextRow label="Solution Text" field="fit_s2_solution_text" value={form.fit_s2_solution_text} onChange={handleChange} />
        <InputRow label="Right Side Image URL" field="fit_section2_image" value={form.fit_section2_image} onChange={handleChange} />
        {form.fit_section2_image && <ImgPreview src={form.fit_section2_image} />}
      </SectionCard>

      {/* ─── Section 3: All the Length ─── */}
      <SectionCard title="Section 3 — All the Length You Need" badge="Split: Image Left + Text Right">
        <InputRow label="Section Heading" field="fit_s3_heading" value={form.fit_s3_heading} onChange={handleChange} />
        <InputRow label="Sub-heading" field="fit_s3_subheading" value={form.fit_s3_subheading} onChange={handleChange} />
        <RichTextRow label="Body Text" field="fit_s3_text" value={form.fit_s3_text} onChange={handleChange} />
        <InputRow label="Left Side Image URL" field="fit_problem_image" value={form.fit_problem_image} onChange={handleChange} />
        {form.fit_problem_image && <ImgPreview src={form.fit_problem_image} />}
      </SectionCard>

      {/* ─── Section 4: Proud of our guys ─── */}
      <SectionCard title="Section 4 — We're Proud of ALL of Our Guys" badge="Full-width centered image">
        <InputRow label="Section Heading" field="fit_s4_heading" value={form.fit_s4_heading} onChange={handleChange} />
        <InputRow label="Group Photo URL" field="fit_section4_image" value={form.fit_section4_image} onChange={handleChange} />
        {form.fit_section4_image && <ImgPreview src={form.fit_section4_image} />}
      </SectionCard>

      {/* ─── Section 5: Height Sizing ─── */}
      <SectionCard title="Section 5 — Size Chart" badge="4-column grid">
        <div className="grid grid-cols-2 gap-4">
          <InputRow label="Men — Regular" field="fit_men_tall" value={form.fit_men_tall} onChange={handleChange} />
          <InputRow label="Men — Long" field="fit_men_xtall" value={form.fit_men_xtall} onChange={handleChange} />
          <InputRow label="Women — Regular" field="fit_women_tall" value={form.fit_women_tall} onChange={handleChange} />
          <InputRow label="Women — Long" field="fit_women_xtall" value={form.fit_women_xtall} onChange={handleChange} />
        </div>
      </SectionCard>

      {/* ─── Section 6: Fit for all bodies ─── */}
      <SectionCard title="Section 6 — A Fit For Every Body" badge="Split: Text Left + Image Right">
        <InputRow label="Section Heading" field="fit_s6_heading" value={form.fit_s6_heading} onChange={handleChange} />
        <RichTextRow label="Body Text" field="fit_s6_text" value={form.fit_s6_text} onChange={handleChange} />
        <InputRow label="Right Side Image URL" field="fit_section5_image" value={form.fit_section5_image} onChange={handleChange} />
        {form.fit_section5_image && <ImgPreview src={form.fit_section5_image} />}
      </SectionCard>

      {/* ─── Section 7: Science of Fit ─── */}
      <SectionCard title="Section 7 — The Science of Fit" badge="Dark background">
        <InputRow label="Section Heading" field="fit_s7_heading" value={form.fit_s7_heading} onChange={handleChange} />
        <InputRow label="Annotated Image URL" field="fit_section6_image" value={form.fit_section6_image} onChange={handleChange} />
        {form.fit_section6_image && <ImgPreview src={form.fit_section6_image} />}
      </SectionCard>

      {/* ─── Section 9: Brand Mission ─── */}
      <SectionCard title="Section 9 — Brand Mission Banner" badge="Dark banner at bottom">
        <RichTextRow label="Mission Statement" field="fit_s9_heading" value={form.fit_s9_heading} onChange={handleChange} />
      </SectionCard>
    </div>
  )
}

/* ─── Reusable Components ─── */

function SectionCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-800">{title}</h2>
        {badge && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 bg-zinc-50 px-2.5 py-1 rounded-full border border-zinc-100">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function InputRow({ label, field, value, onChange }: { label: string; field: string; value: string; onChange: (f: string, v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <input
        type="text"
        className="w-full rounded-sm border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
      />
    </div>
  )
}

function RichTextRow({ label, field, value, onChange }: { label: string; field: string; value: string; onChange: (f: string, v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <div className="border border-zinc-200 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-zinc-500">
        <RichTextEditor 
          initialContent={value} 
          onChange={(newVal) => onChange(field, newVal)} 
        />
      </div>
    </div>
  )
}

function ImgPreview({ src }: { src: string }) {
  return (
    <div className="mt-2 rounded border border-zinc-100 overflow-hidden bg-zinc-50 p-1">
      <img src={src} alt="Preview" className="w-full h-32 object-cover rounded" />
    </div>
  )
}