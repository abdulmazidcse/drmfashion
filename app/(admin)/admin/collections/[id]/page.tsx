"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { formatImageUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false, loading: () => <div className="p-4 text-center text-xs text-zinc-400 border border-zinc-200 rounded-xl">Loading editor...</div> })

type CollectionProductRow = {
  id: string
  title: string
  slug?: string
  thumbnail: string | null
  basePrice?: number
  discountPrice?: number | null
  published?: boolean
  productCode?: string | null
}

type Collection = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  bannerImage: string | null
  active: boolean
  featured: boolean
  sortOrder: number
  metaTitle: string | null
  metaDescription: string | null
  startsAt: string | null
  endsAt: string | null
  products: { sortOrder: number; product: CollectionProductRow }[]
}

type PickerProduct = { id: string; title: string; thumbnail: string | null }

const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 160
const PICKER_LIMIT = 12

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")
}

/** ISO string → value for a `datetime-local` input, in the browser's zone. */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** `datetime-local` value → ISO string, or null when cleared. */
function fromLocalInput(value: string) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/** Message from an axios error response, or the fallback. */
function apiError(e: unknown, fallback: string) {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || fallback
}

function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit
  return (
    <span className={`text-[10px] font-bold tabular-nums ${over ? "text-amber-600" : "text-muted-foreground"}`}>
      {value.length}/{limit}
    </span>
  )
}

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [active, setActive] = useState(true)
  const [featured, setFeatured] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")

  const [image, setImage] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [bannerImage, setBannerImage] = useState("")
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const [selected, setSelected] = useState<CollectionProductRow[]>([])

  // Product search
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [results, setResults] = useState<PickerProduct[]>([])
  const [searching, setSearching] = useState(false)

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

  function applyCollection(c: Collection) {
    setName(c.name)
    setSlug(c.slug)
    setDescription(c.description ?? "")
    setActive(c.active)
    setFeatured(c.featured)
    setSortOrder(c.sortOrder)
    setStartsAt(toLocalInput(c.startsAt))
    setEndsAt(toLocalInput(c.endsAt))
    setMetaTitle(c.metaTitle ?? "")
    setMetaDescription(c.metaDescription ?? "")
    setImage(c.image ?? "")
    setImagePreview(c.image || null)
    setBannerImage(c.bannerImage ?? "")
    setBannerPreview(c.bannerImage || null)
    setSelected(c.products.map((row) => row.product))
  }

  // `loading` starts true, and a refetch after save keeps the form on screen
  // rather than flashing the loading card, so it is only ever set back to false.
  function fetchCollection() {
    return api
      .get<Collection>(`/admin/collections/${params.id}`)
      .then((res) => applyCollection(res.data))
      .catch((e) => {
        Swal.fire({ text: apiError(e, "Collection not found."), confirmButtonColor: "#18181b", icon: "error" })
        router.push("/admin/collections")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCollection() }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced product search against the admin list endpoint. The picker view
  // returns only id/title/thumbnail, which is all the result grid renders.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      setSearching(true)
      api
        .get("/admin/products", { params: { search: search.trim(), page, limit: PICKER_LIMIT, view: "picker" } })
        .then((res) => {
          if (cancelled) return
          setResults(Array.isArray(res.data?.data) ? res.data.data : [])
          setTotalPages(res.data?.meta?.totalPages || 1)
        })
        .catch((err) => {
          console.error(err)
          if (!cancelled) setResults([])
        })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search, page])

  // A new search term starts from page 1.
  function onSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function addProduct(p: PickerProduct) {
    setSelected((prev) => (prev.some((s) => s.id === p.id) ? prev : [...prev, { id: p.id, title: p.title, thumbnail: p.thumbnail }]))
  }

  function removeProduct(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id))
  }

  function move(index: number, delta: -1 | 1) {
    setSelected((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      Swal.fire({ text: "Name and slug are required.", confirmButtonColor: "#18181b", icon: "warning" })
      return
    }
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      Swal.fire({ text: "The end date must be after the start date.", confirmButtonColor: "#18181b", icon: "warning" })
      return
    }

    try {
      setSaving(true)
      let imageUrl = image
      let bannerUrl = bannerImage
      if (imageFile) imageUrl = await uploadImage(imageFile)
      if (bannerFile) bannerUrl = await uploadImage(bannerFile)

      await api.patch(`/admin/collections/${params.id}`, {
        name: name.trim(),
        slug: slug.trim(),
        description,
        image: imageUrl,
        bannerImage: bannerUrl,
        active,
        featured,
        sortOrder: Number(sortOrder) || 0,
        metaTitle,
        metaDescription,
        startsAt: fromLocalInput(startsAt),
        endsAt: fromLocalInput(endsAt),
      })
      await api.put(`/admin/collections/${params.id}/products`, { productIds: selected.map((p) => p.id) })

      setImageFile(null)
      setBannerFile(null)
      await fetchCollection()
      Swal.fire({ text: "Collection saved.", icon: "success", confirmButtonColor: "#18181b", timer: 1500, showConfirmButton: false })
    } catch (e) {
      Swal.fire({ text: apiError(e, "Failed to save collection."), confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSaving(false)
    }
  }

  const selectedIds = new Set(selected.map((p) => p.id))
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider"

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-2">
        <Card className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
          <span className="text-muted-foreground text-sm">Loading collection...</span>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
            <Link href="/admin/collections" aria-label="Back to collections"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="p-2.5 bg-primary text-primary-foreground rounded-lg shrink-0"><Layers size={20} /></div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{name || "Edit Collection"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{selected.length} {selected.length === 1 ? "product" : "products"} in this collection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/collection/${slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> View on store
            </a>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Details</h2>
            <div className="space-y-1.5">
              <Label className={labelCls}>Collection Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)) }} placeholder="e.g. Summer Essentials" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Description</Label>
              <RichTextEditor
                key={params.id}
                initialContent={description}
                onChange={(html) => setDescription(html)}
              />
            </div>
          </Card>

          {/* Products */}
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Products</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Search the catalogue and add products. The order below is the order shown on the storefront.</p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search products by name, code or SKU..." className="pl-9" />
            </div>

            <div className="rounded-lg border border-border">
              {searching ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : results.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">No products found.</p>
              ) : (
                <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                  {results.map((p) => {
                    const added = selectedIds.has(p.id)
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="w-10 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                          {p.thumbnail && <img src={formatImageUrl(p.thumbnail)} alt={p.title} className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-sm text-foreground flex-1 min-w-0 truncate">{p.title}</p>
                        <Button type="button" size="sm" variant={added ? "secondary" : "outline"} disabled={added} onClick={() => addProduct(p)} className="shrink-0">
                          {added ? <><Check className="w-3.5 h-3.5" /> Added</> : <><Plus className="w-3.5 h-3.5" /> Add</>}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <Button type="button" size="sm" variant="ghost" disabled={page <= 1 || searching} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button type="button" size="sm" variant="ghost" disabled={page >= totalPages || searching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className={labelCls}>Selected Products</Label>
                <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              </div>
              {selected.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-10 text-center">
                  <p className="text-xs text-muted-foreground">No products in this collection yet. Add some from the search above.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {selected.map((p, index) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-6 text-center text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">{index + 1}</span>
                      <div className="w-10 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                        {p.thumbnail && <img src={formatImageUrl(p.thumbnail)} alt={p.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{p.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {p.productCode && <span className="text-[10px] font-mono text-muted-foreground">{p.productCode}</span>}
                          {typeof p.basePrice === "number" && (
                            <span className="text-[10px] text-muted-foreground">
                              {p.discountPrice != null ? <><span className="line-through mr-1">{p.basePrice.toFixed(2)}</span>{p.discountPrice.toFixed(2)}</> : p.basePrice.toFixed(2)}
                            </span>
                          )}
                          {p.published === false && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Unpublished</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp size={14} /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown size={14} /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeProduct(p.id)} aria-label="Remove"><Trash2 size={14} /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Visibility</h2>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <Label className={labelCls}>Active</Label>
                <p className="text-[11px] text-muted-foreground">Hidden from the storefront when off.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <Label className={labelCls}>Featured</Label>
                <p className="text-[11px] text-muted-foreground">Highlight this collection.</p>
              </div>
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
              <p className="text-[10px] text-muted-foreground">Lower numbers appear first.</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Schedule</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optional. Leave blank to show the collection indefinitely.</p>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Starts At</Label>
              <div className="flex gap-2">
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                {startsAt && <Button type="button" variant="ghost" size="icon" onClick={() => setStartsAt("")} aria-label="Clear start"><X size={14} /></Button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Ends At</Label>
              <div className="flex gap-2">
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                {endsAt && <Button type="button" variant="ghost" size="icon" onClick={() => setEndsAt("")} aria-label="Clear end"><X size={14} /></Button>}
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Images</h2>
            <div className="space-y-1.5">
              <Label className={labelCls}>Tile Image (Max 1MB)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setImageFile, setImagePreview)} />
              {imagePreview && (
                <div className="mt-3 flex items-start gap-2">
                  <img src={imagePreview} alt="Tile preview" className="h-24 w-20 object-cover rounded-lg border border-border shadow-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setImage(""); setImageFile(null); setImagePreview(null) }} aria-label="Remove tile image"><X size={14} /></Button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Portrait tile shown on the collections listing. 5:6 ratio, e.g. 1000 × 1200 px. JPG/WebP.</p>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Banner Image (Max 1MB)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setBannerFile, setBannerPreview)} />
              {bannerPreview && (
                <div className="mt-3 flex items-start gap-2">
                  <img src={bannerPreview} alt="Banner preview" className="h-20 w-full object-cover rounded-lg border border-border shadow-sm" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => { setBannerImage(""); setBannerFile(null); setBannerPreview(null) }} aria-label="Remove banner image"><X size={14} /></Button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Wide artwork across the top of the collection page, shown at its own height. 3:1 ratio, e.g. 1800 × 600 px.</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Search Engine Listing</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Optional. Leave blank to fall back to the name and description.</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={labelCls}>SEO Title</Label>
                <CharCount value={metaTitle} limit={TITLE_LIMIT} />
              </div>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={name ? `Defaults to "${name}"` : "SEO title"} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={labelCls}>Meta Description</Label>
                <CharCount value={metaDescription} limit={DESCRIPTION_LIMIT} />
              </div>
              <Textarea rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="120–160 characters describing this collection." />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Preview</p>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground truncate">/collection/{slug || "collection-slug"}</p>
                <p className="text-[15px] text-[#1a0dab] leading-snug truncate mt-0.5">{metaTitle.trim() || name.trim() || "Collection name"}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">
                  {metaDescription.trim() || "No meta description yet — search engines will pick their own snippet."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
