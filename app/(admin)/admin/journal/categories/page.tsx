"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Edit, FolderTree, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import api from "@/lib/axios"
import { slugify } from "@/lib/journal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type JournalCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  position: number
  _count?: { posts: number }
}

const emptyForm = { name: "", slug: "", description: "", position: 0 }

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-zinc-500 block"
const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none"

export default function AdminJournalCategoriesPage() {
  const [categories, setCategories] = useState<JournalCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [slugLocked, setSlugLocked] = useState(false)

  function fetchCategories() {
    return api
      .get("/admin/journal/categories")
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error(err)
        setCategories([])
      })
  }

  useEffect(() => {
    fetchCategories().finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setSlugLocked(false)
  }

  function startEdit(cat: JournalCategory) {
    setEditingId(cat.id)
    setSlugLocked(true)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      position: cat.position,
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    setSaving(true)
    try {
      const payload = { ...form, slug: slugify(form.slug || form.name) }
      if (editingId) {
        await api.put(`/admin/journal/categories/${editingId}`, payload)
      } else {
        await api.post("/admin/journal/categories", payload)
      }
      resetForm()
      await fetchCategories()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to save category",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this category? Posts in it will become uncategorised."))) return
    try {
      await api.delete(`/admin/journal/categories/${id}`)
      setCategories((prev) => prev.filter((c) => c.id !== id))
      if (editingId === id) resetForm()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to delete category",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/journal" className="rounded-sm border border-zinc-200 p-2 transition-colors hover:bg-zinc-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Topic filters shown above the story grid on /journal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <Card className="h-fit p-5 lg:col-span-1">
          <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {editingId ? "Edit Category" : "Add Category"}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: slugLocked ? prev.slug : slugify(e.target.value),
                  }))
                }
                placeholder="e.g. Style Guides"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Slug</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugLocked(true)
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }}
                placeholder="style-guides"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional intro shown when this topic is selected."
                className={`${inputClass} resize-y`}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Position</label>
              <input
                type="number"
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Update" : "Add"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          </form>
        </Card>

        {/* List */}
        <Card className="overflow-hidden p-0 lg:col-span-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <FolderTree className="mb-4 h-12 w-12 text-muted-foreground/40" />
                        <p>No categories yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{cat._count?.posts ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.position}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => startEdit(cat)}
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(cat.id)}
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
