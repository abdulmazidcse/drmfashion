"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import Link from "next/link"
import { Plus, Trash2, Rocket, Loader2, Pencil, X, Search } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

type LandingPageRow = {
  id: string
  title: string
  slug: string
  bannerImage?: string | null
  active: boolean
  _count: { products: number }
}

type FormValues = { title: string; slug: string }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")
}

/** Message from an axios error response, or the fallback. */
function apiError(e: unknown, fallback: string) {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || fallback
}

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] = useState<LandingPageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addActive, setAddActive] = useState(true)

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>()

  async function fetchLandingPages(q = "") {
    try {
      setLoading(true)
      const res = await api.get("/admin/landing-pages", { params: q ? { search: q } : {} })
      setLandingPages(res.data)
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      setSubmitting(true)
      const res = await api.post("/admin/landing-pages", { ...data, active: addActive })
      reset()
      setShowAddModal(false)
      // Straight to the editor — that's where products, heading and the
      // banner image actually get set, same as a new Collection.
      window.location.href = `/admin/landing-pages/${res.data.id}`
    } catch (e) {
      Swal.fire({ text: apiError(e, "Failed to create landing page."), confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  function openAdd() {
    reset({ title: "", slug: "" })
    setAddActive(true)
    setShowAddModal(true)
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this landing page? Products themselves are not deleted."))) return
    try {
      setDeletingId(id)
      await api.delete(`/admin/landing-pages/${id}`)
      fetchLandingPages(search)
    } catch (e) {
      Swal.fire({ text: apiError(e, "Failed to delete landing page."), confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setDeletingId(null)
    }
  }

  // Debounced so typing in the search box doesn't hammer the API.
  useEffect(() => {
    const timer = setTimeout(() => { fetchLandingPages(search.trim()) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <>
      {/* Add Landing Page Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-lg p-6 relative shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Rocket className="w-5 h-5 text-foreground" /></div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Add Landing Page</h2>
                <p className="text-xs text-muted-foreground">A one-page checkout for several hand-picked products. Add them after saving.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</Label>
                <Input {...register("title", { required: true, onChange: (e) => setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Eid Collection" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                <Input {...register("slug", { required: true })} placeholder="auto-generated" className="font-mono text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Page will be at /landingpage/&#123;slug&#125;</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</Label>
                <Switch checked={addActive} onCheckedChange={setAddActive} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create & Add Products"}
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
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Rocket size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Landing Pages</h1>
              <p className="text-sm text-muted-foreground mt-0.5">One-page checkouts for a hand-picked set of products — for campaigns and ad links</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Landing Page
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search landing pages..." className="pl-9" />
        </div>

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading landing pages...</span>
          </Card>
        ) : landingPages.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <Rocket className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">{search ? "No landing pages match your search" : "No landing pages yet"}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{search ? "Try a different title or slug." : "Create your first landing page using the button above."}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {landingPages.map((l) => (
              <Card key={l.id} className="group hover:shadow-md transition-all duration-200 flex-row items-center gap-3 p-3 pr-4">
                <div className="w-12 h-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {l.bannerImage ? <img src={l.bannerImage} alt={l.title} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-foreground">{l.title.substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{l.title}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">/landingpage/{l.slug}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{l._count.products} {l._count.products === 1 ? "product" : "products"}</Badge>
                    <Badge variant={l.active ? "default" : "outline"} className="text-[10px] px-1.5 py-0">{l.active ? "Active" : "Inactive"}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground">
                    <Link href={`/admin/landing-pages/${l.id}`} aria-label="Edit landing page"><Pencil size={14} /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} disabled={deletingId === l.id} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    {deletingId === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
