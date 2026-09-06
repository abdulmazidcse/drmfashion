"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import Link from "next/link"
import { Plus, Trash2, Layers, Loader2, Pencil, X, Search, CalendarClock, Star, ArrowUpDown } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Collection = {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  active: boolean
  featured: boolean
  sortOrder: number
  startsAt?: string | null
  endsAt?: string | null
  _count: { products: number }
}

type FormValues = { name: string; slug: string; sortOrder: number; description: string }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")
}

/** Message from an axios error response, or the fallback. */
function apiError(e: unknown, fallback: string) {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || fallback
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

/** One-line note on where the collection sits in its schedule window, if it has one. */
function scheduleHint(c: Collection): string | null {
  const now = Date.now()
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return `Starts ${formatDate(c.startsAt)}`
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return `Ended ${formatDate(c.endsAt)}`
  if (c.endsAt) return `Ends ${formatDate(c.endsAt)}`
  if (c.startsAt) return `Since ${formatDate(c.startsAt)}`
  return null
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [addFile, setAddFile] = useState<File | null>(null)
  const [addPreview, setAddPreview] = useState<string | null>(null)
  const [addActive, setAddActive] = useState(true)
  const [addFeatured, setAddFeatured] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>()

  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ text: "Image size must be less than 1MB", icon: "warning", confirmButtonColor: "#18181b" })
      e.target.value = ""
      return
    }
    setAddFile(file)
    setAddPreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
    return res.data.url
  }

  async function fetchCollections(q = "") {
    try {
      setLoading(true)
      const res = await api.get("/admin/collections", { params: q ? { search: q } : {} })
      setCollections(res.data)
    }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try {
      setSubmitting(true)
      let imageUrl = ""
      if (addFile) {
        imageUrl = await uploadImage(addFile)
      }
      await api.post("/admin/collections", {
        ...data,
        sortOrder: Number(data.sortOrder) || 0,
        image: imageUrl,
        active: addActive,
        featured: addFeatured,
      })
      reset()
      setAddFile(null)
      setAddPreview(null)
      setShowAddModal(false)
      fetchCollections(search)
    }
    catch (e) { Swal.fire({ text: apiError(e, "Failed to create collection."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  function openAdd() {
    reset({ name: "", slug: "", sortOrder: 0, description: "" })
    setAddFile(null)
    setAddPreview(null)
    setAddActive(true)
    setAddFeatured(false)
    setShowAddModal(true)
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this collection? Products themselves are not deleted."))) return
    try { setDeletingId(id); await api.delete(`/admin/collections/${id}`); fetchCollections(search) }
    catch (e) { Swal.fire({ text: apiError(e, "Failed to delete collection."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  // Debounced so typing in the search box doesn't hammer the API.
  useEffect(() => {
    const timer = setTimeout(() => { fetchCollections(search.trim()) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <>
      {/* Add Collection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Plus className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Add Collection</h2><p className="text-xs text-muted-foreground">Create a curated product collection. You can add products after saving.</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collection Name</Label>
                <Input {...register("name", { required: true, onChange: (e) => setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Summer Essentials, New Arrivals" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                <Input {...register("slug", { required: true })} placeholder="auto-generated" className="font-mono text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea {...register("description")} rows={3} placeholder="Short intro shown on the collection page" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tile Image (Max 1MB)</Label>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
                {addPreview && <img src={addPreview} alt="Preview" className="mt-3 h-20 w-16 object-cover rounded-lg border border-border shadow-sm" />}
                <p className="text-[10px] text-muted-foreground">Portrait, 5:6 ratio, e.g. 1000 × 1200 px. The wide banner image can be added on the edit page.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort Order</Label>
                  <Input type="number" {...register("sortOrder")} defaultValue={0} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:mt-5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</Label>
                  <Switch checked={addActive} onCheckedChange={setAddActive} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:mt-5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Featured</Label>
                  <Switch checked={addFeatured} onCheckedChange={setAddFeatured} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Collection"}
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
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Layers size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Collections</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Curate hand-picked product groups for the storefront</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Collection
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search collections..." className="pl-9" />
        </div>

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading collections...</span>
          </Card>
        ) : collections.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <Layers className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">{search ? "No collections match your search" : "No collections yet"}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{search ? "Try a different name or slug." : "Create your first collection using the button above."}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {collections.map((c) => {
              const hint = scheduleHint(c)
              return (
                <Card key={c.id} className="group hover:shadow-md transition-all duration-200 flex-row items-center gap-3 p-3 pr-4">
                  <div className="w-12 h-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {c.image ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-foreground">{c.name.substring(0,2).toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      {c.featured && <Star size={12} className="shrink-0 text-amber-500 fill-amber-500" />}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate">/{c.slug}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{c._count.products} {c._count.products === 1 ? "product" : "products"}</Badge>
                      <Badge variant={c.active ? "default" : "outline"} className="text-[10px] px-1.5 py-0">{c.active ? "Active" : "Inactive"}</Badge>
                      {c.featured && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Featured</Badge>}
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><ArrowUpDown size={10} /> {c.sortOrder}</span>
                      {hint && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><CalendarClock size={10} /> {hint}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
                      <Link href={`/admin/collections/${c.id}`} aria-label="Edit collection"><Pencil size={14} /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
