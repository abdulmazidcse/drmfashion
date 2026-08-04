"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, Save, Loader2, Eye, ExternalLink, LayoutTemplate } from "lucide-react"
import Swal from "sweetalert2"

const PageBuilder = dynamic(() => import("@/components/admin/PageBuilder"), { 
  ssr: false,
  loading: () => (
    <div className="flex h-[80vh] min-h-[600px] items-center justify-center border border-zinc-200 rounded-xl bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Loading Page Builder...</p>
      </div>
    </div>
  )
})

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [content, setContent] = useState("")
  const [published, setPublished] = useState(true)
  const [hasUnsaved, setHasUnsaved] = useState(false)

  useEffect(() => { fetchPage() }, [])

  // Warn on leave if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  const fetchPage = async () => {
    try {
      const res = await fetch(`/api/admin/pages/${params.id}`)
      if (!res.ok) throw new Error("Page not found")
      const data = await res.json()
      setTitle(data.title)
      setSlug(data.slug)
      setContent(data.content)
      setPublished(data.published)
    } catch {
      Swal.fire({ text: "Failed to load page data", confirmButtonColor: "#18181b", icon: "error" })
      router.push("/admin/pages")
    } finally {
      setLoading(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setTitle(v)
    setHasUnsaved(true)
    if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  const handleContentChange = (serialized: string) => {
    setContent(serialized)
    setHasUnsaved(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/pages/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content, published }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setHasUnsaved(false)
      Swal.fire({ text: "Page saved successfully!", confirmButtonColor: "#18181b", icon: "success" })
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to save page", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  )

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/pages" className="p-2 border border-zinc-200 rounded-sm hover:bg-zinc-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-zinc-400" />
              <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950">Page Builder</h1>
              {hasUnsaved && (
                <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">Visual block-based page editor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/pages/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors rounded-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </a>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meta fields */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Page Settings</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Page Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                className="w-full px-4 py-2.5 text-sm border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950 transition-all rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">URL Slug</label>
              <div className="flex items-center border border-zinc-200 bg-zinc-50 focus-within:bg-white focus-within:border-zinc-950 transition-all rounded-lg overflow-hidden">
                <span className="pl-3 text-zinc-400 text-sm whitespace-nowrap">/pages/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setHasUnsaved(true) }}
                  className="w-full py-2.5 pr-3 text-sm bg-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Page Builder */}
        <PageBuilder initialContent={content} onChange={handleContentChange} />

        {/* Footer save bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border border-zinc-200 rounded-xl px-6 py-4 flex items-center justify-between shadow-lg">
          <label className="relative inline-flex items-center cursor-pointer gap-3">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={published}
              onChange={e => { setPublished(e.target.checked); setHasUnsaved(true) }}
            />
            <div className="w-10 h-5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-950 relative" />
            <div>
              <span className="text-sm font-bold text-zinc-800 block">{published ? 'Published' : 'Draft'}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{published ? 'Visible to public' : 'Hidden from public'}</span>
            </div>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-zinc-950 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Page"}
          </button>
        </div>
      </form>
    </div>
  )
}
