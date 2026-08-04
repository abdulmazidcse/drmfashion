"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import dynamic from "next/dynamic"
import { Plus, Trash2, Tag, Loader2, Pencil, X, Check } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false, loading: () => <div className="p-4 text-center text-xs text-zinc-400 border border-zinc-200 rounded-xl">Loading editor...</div> })

type Brand = { id: string; name: string; slug: string; image?: string; description?: string }
type FormValues = { name: string; slug: string; image: string }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")
}

// Strip HTML tags for preview text
function stripHtml(html: string) {
  if (typeof document !== "undefined") {
    const div = document.createElement("div")
    div.innerHTML = html
    return div.textContent || div.innerText || ""
  }
  return html.replace(/<[^>]*>/g, "")
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [addFile, setAddFile] = useState<File | null>(null)
  const [addPreview, setAddPreview] = useState<string | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)

  // Separate state for HTML descriptions (not managed by react-hook-form)
  const [addDescription, setAddDescription] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // Key to force re-mount the editor when resetting
  const [addEditorKey, setAddEditorKey] = useState(0)

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void, setPreview: (s: string | null) => void) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ text: "Image size must be less than 1MB", icon: "warning", confirmButtonColor: "#18181b" })
      e.target.value = ""
      return
    }
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
    return res.data.url
  }

  async function fetchBrands() {
    try { setLoading(true); const res = await api.get("/admin/brands"); setBrands(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try {
      setSubmitting(true)
      let imageUrl = data.image || ""
      if (addFile) {
        imageUrl = await uploadImage(addFile)
      }
      await api.post("/admin/brands", { ...data, image: imageUrl, description: addDescription })
      reset()
      setAddFile(null)
      setAddPreview(null)
      setAddDescription("")
      setAddEditorKey(k => k + 1)
      setShowAddModal(false)
      fetchBrands()
    }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to create brand.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingBrand) return
    try {
      setEditSubmitting(true)
      let imageUrl = data.image || ""
      if (editFile) {
        imageUrl = await uploadImage(editFile)
      }
      await api.patch(`/admin/brands/${editingBrand.id}`, { ...data, image: imageUrl, description: editDescription })
      setEditingBrand(null)
      setEditFile(null)
      setEditPreview(null)
      fetchBrands()
    }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to update brand.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openAdd() {
    reset({ name: "", slug: "", image: "" })
    setAddFile(null)
    setAddPreview(null)
    setAddDescription("")
    setAddEditorKey(k => k + 1)
    setShowAddModal(true)
  }

  function openEdit(b: Brand) {
    setEditingBrand(b)
    setEditFile(null)
    setEditPreview(b.image || null)
    editForm.reset({ name: b.name, slug: b.slug, image: b.image || "" })
    setEditDescription(b.description || "")
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this brand?"))) return
    try { setDeletingId(id); await api.delete(`/admin/brands/${id}`); fetchBrands() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to delete brand.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => { fetchBrands() }, [])

  return (
    <>
      {/* Add Brand Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Plus className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Add Brand</h2><p className="text-xs text-muted-foreground">Create a new brand</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Name</Label>
                <Input {...register("name", { required: true, onChange: (e) => setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Nike, Zara" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                <Input {...register("slug", { required: true })} placeholder="auto-generated" className="font-mono text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Image (Max 1MB)</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAddFile, setAddPreview)} />
                {addPreview && <img src={addPreview} alt="Preview" className="mt-3 h-16 w-16 object-cover rounded-lg border border-border shadow-sm" />}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <RichTextEditor
                  key={addEditorKey}
                  initialContent={addDescription}
                  onChange={(html) => setAddDescription(html)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Brand"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Brand Modal */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setEditingBrand(null)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Pencil className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Edit Brand</h2><p className="text-xs text-muted-foreground">Update brand details</p></div>
            </div>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brand Name</Label>
                <Input {...editForm.register("name", { required: true, onChange: (e) => editForm.setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Nike" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                <Input {...editForm.register("slug", { required: true })} className="font-mono text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logo Image (Max 1MB)</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setEditFile, setEditPreview)} />
                {editPreview && <img src={editPreview} alt="Preview" className="mt-3 h-16 w-16 object-cover rounded-lg border border-border shadow-sm" />}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <RichTextEditor
                  key={editingBrand.id}
                  initialContent={editDescription}
                  onChange={(html) => setEditDescription(html)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditingBrand(null)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={editSubmitting} className="flex-1">
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6 max-w-7xl mx-auto p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Tag size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Brands</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage fashion brands, vendors, and labels</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Brand
          </Button>
        </div>

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading brands...</span>
          </Card>
        ) : brands.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <Tag className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No brands yet</h3>
            <p className="text-muted-foreground mt-1 text-xs">Create your first brand using the button above.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {brands.map((brand) => (
              <Card key={brand.id} className="group hover:shadow-md transition-all duration-200 flex-row items-center gap-3 p-3 pr-4">
                <div className="w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {brand.image ? <img src={brand.image} alt={brand.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-foreground">{brand.name.substring(0,2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{brand.name}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">/{brand.slug}</p>
                  {brand.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{stripHtml(brand.description)}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(brand)} className="h-8 w-8 text-muted-foreground"><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)} disabled={deletingId === brand.id} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    {deletingId === brand.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
