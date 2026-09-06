"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, ImagePlus, Loader2, Newspaper, Save, ShoppingBag, Trash2, X } from "lucide-react"
import Swal from "sweetalert2"
import api from "@/lib/axios"
import { slugify } from "@/lib/journal"
import JournalProductPicker from "@/components/admin/JournalProductPicker"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  ),
})

export type JournalPostFormValues = {
  id?: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  authorName: string
  tags: string[]
  featured: boolean
  published: boolean
  categoryId: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
}

type JournalCategoryOption = { id: string; name: string }

const EMPTY: JournalPostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  authorName: "",
  tags: [],
  featured: false,
  // Matches the Pages module: a new entry goes live unless the author opts out.
  published: true,
  categoryId: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-zinc-500 block"
const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none"

export default function JournalPostForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit"
  initialValues?: Partial<JournalPostFormValues>
}) {
  const router = useRouter()

  const [values, setValues] = useState<JournalPostFormValues>({ ...EMPTY, ...initialValues })
  const [categories, setCategories] = useState<JournalCategoryOption[]>([])
  const [tagInput, setTagInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const editorRef = useRef<any>(null)
  // Only auto-derive the slug while the author hasn't typed one themselves.
  const [slugLocked, setSlugLocked] = useState(mode === "edit")

  useEffect(() => {
    api
      .get("/admin/journal/categories")
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err))
  }, [])

  const set = <K extends keyof JournalPostFormValues>(key: K, value: JournalPostFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleTitleChange = (value: string) => {
    setValues((prev) => ({
      ...prev,
      title: value,
      slug: slugLocked ? prev.slug : slugify(value),
    }))
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    if (!values.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      set("tags", [...values.tags, tag])
    }
    setTagInput("")
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ text: "Cover image must be less than 2MB", icon: "warning", confirmButtonColor: "#18181b" })
      e.target.value = ""
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      set("coverImage", res.data.url)
    } catch (err: any) {
      Swal.fire({ text: err?.message || "Failed to upload image", icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  /** Drops a `[products …]` shortcode into the body at the caret. */
  const insertShortcode = (shortcode: string) => {
    const editor = editorRef.current
    if (!editor) {
      Swal.fire({ text: "Editor is still loading — try again in a moment.", confirmButtonColor: "#18181b" })
      return
    }

    editor.model.change(() => {
      const viewFragment = editor.data.processor.toView(`<p>${shortcode}</p>`)
      const modelFragment = editor.data.toModel(viewFragment)
      editor.model.insertContent(modelFragment)
    })
    set("content", editor.getData())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!values.title.trim()) {
      Swal.fire({ text: "Title is required", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }
    if (!stripped(values.content)) {
      Swal.fire({ text: "Article content cannot be empty", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }

    setSaving(true)
    try {
      const payload = { ...values, slug: slugify(values.slug || values.title) }
      if (mode === "create") {
        await api.post("/admin/journal", payload)
      } else {
        await api.put(`/admin/journal/${values.id}`, payload)
      }

      // Be explicit about visibility — a saved draft 404s on the storefront.
      Swal.fire({
        title: mode === "create" ? "Journal post created" : "Journal post updated",
        text: values.published
          ? `Live at /journal/${slugify(values.slug || values.title)}`
          : "Saved as a draft — flip the Draft/Published toggle to make it visible on the storefront.",
        icon: values.published ? "success" : "info",
        confirmButtonColor: "#18181b",
      })
      router.push("/admin/journal")
      router.refresh()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to save journal post",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    } finally {
      setSaving(false)
    }
  }

  const readTime = useMemo(() => {
    const words = stripped(values.content).split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 200))
  }, [values.content])

  return (
    <>
    <JournalProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertShortcode} />
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/journal"
          className="rounded-sm border border-zinc-200 p-2 transition-colors hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-zinc-400" />
            <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-950">
              {mode === "create" ? "New Journal Post" : "Edit Journal Post"}
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Editorial story for the storefront journal · ~{readTime} min read
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Article</p>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  required
                  value={values.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. What Is French Terry Fabric?"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>URL Slug</label>
                <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-all focus-within:border-zinc-950 focus-within:bg-white">
                  <span className="whitespace-nowrap pl-3 text-sm text-zinc-400">/journal/</span>
                  <input
                    type="text"
                    required
                    value={values.slug}
                    onChange={(e) => {
                      setSlugLocked(true)
                      set("slug", e.target.value)
                    }}
                    placeholder="what-is-french-terry-fabric"
                    className="w-full bg-transparent py-2.5 pr-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Excerpt</label>
                <textarea
                  rows={3}
                  value={values.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="One-sentence summary shown on the journal cards. Leave empty to auto-generate."
                  className={`${inputClass} resize-y`}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Content</p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Insert product grid
              </button>
            </div>
            <RichTextEditor
              initialContent={values.content}
              onChange={(html) => set("content", html)}
              onReady={(editor) => {
                editorRef.current = editor
              }}
              height={480}
              enableImages
            />
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
              Use <span className="font-bold uppercase tracking-widest text-zinc-400">H2</span> headings for each
              section — they become the numbered “In This Article” jump links on the storefront. Shortcodes like{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700">
                [products slug-a, slug-b | Caption]
              </code>{" "}
              render as shoppable product grids.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">SEO</p>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelClass}>Meta Title</label>
                <input
                  type="text"
                  value={values.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  placeholder="Defaults to the post title"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Meta Description</label>
                <textarea
                  rows={2}
                  value={values.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  placeholder="Defaults to the excerpt"
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Meta Keywords</label>
                <input
                  type="text"
                  value={values.metaKeywords}
                  onChange={(e) => set("metaKeywords", e.target.value)}
                  placeholder="french terry, fabric guide, tall fashion"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Cover Image</p>
            {values.coverImage ? (
              <div className="group relative overflow-hidden rounded-lg border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.coverImage} alt="Cover" className="aspect-[16/9] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("coverImage", "")}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-zinc-700 shadow transition-colors hover:bg-white hover:text-red-600"
                  title="Remove cover image"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-950 hover:text-zinc-600">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload cover</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
            )}
            <p className="mt-2 text-[11px] text-zinc-400">Recommended 1600×900px, max 2MB.</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Organisation</p>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className={labelClass}>Category</label>
                <select
                  value={values.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/admin/journal/categories"
                  className="inline-block pt-1 text-[11px] text-zinc-500 underline hover:text-zinc-950"
                >
                  Manage categories
                </Link>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Author</label>
                <input
                  type="text"
                  value={values.authorName}
                  onChange={(e) => set("authorName", e.target.value)}
                  placeholder="e.g. Editorial Team"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="Type and press Enter"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="shrink-0 rounded-lg border border-zinc-200 px-3 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    Add
                  </button>
                </div>
                {values.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {values.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => set("tags", values.tags.filter((t) => t !== tag))}
                          className="text-zinc-400 transition-colors hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  checked={values.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-zinc-950"
                />
                <span>
                  <span className="block text-sm font-bold text-zinc-800">Featured story</span>
                  <span className="text-[11px] text-zinc-500">
                    Shown as the hero on /journal. Only one post can be featured.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-50 flex items-center justify-between rounded-xl border border-zinc-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur">
        <label className="relative inline-flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={values.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          <div className="peer relative h-5 w-10 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-950 peer-checked:after:translate-x-5 peer-checked:after:border-white" />
          <div>
            <span className="block text-sm font-bold text-zinc-800">{values.published ? "Published" : "Draft"}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              {values.published ? "Visible on the journal" : "Hidden from the journal"}
            </span>
          </div>
        </label>

        <button
          type="submit"
          disabled={saving || uploading}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-950 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Post"}
        </button>
      </div>
    </form>
    </>
  )
}

function stripped(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}
