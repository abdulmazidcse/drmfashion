"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, Save, Loader2, LayoutTemplate } from "lucide-react"
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

export default function NewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [content, setContent] = useState("[]") // Default empty array of blocks
  const [published, setPublished] = useState(true)

  // Auto-generate slug from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
  }

  const handleContentChange = (serialized: string) => {
    setContent(serialized)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content, published })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message)
      
      Swal.fire({ text: "Page created successfully!", confirmButtonColor: "#18181b", icon: "success" })
      router.push("/admin/pages")
      router.refresh()
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to create page", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSaving(false)
    }
  }

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
              <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950">Create New Page</h1>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">Visual block-based page builder</p>
          </div>
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
                placeholder="e.g. Privacy Policy"
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
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="privacy-policy"
                  className="w-full py-2.5 pr-3 text-sm bg-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Page Builder */}
        <PageBuilder initialContent={content} onChange={handleContentChange} />

        {/* Footer save bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border border-zinc-200 rounded-xl px-6 py-4 flex items-center justify-between shadow-lg z-50">
          <label className="relative inline-flex items-center cursor-pointer gap-3">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
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
