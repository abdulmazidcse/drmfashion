"use client"

import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import {
  Plus,
  Trash2,
  Loader2,
  Pencil,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  GalleryHorizontal,
  CalendarClock,
  ExternalLink,
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { BANNER_POSITIONS, bannerPositionLabel, type BannerPosition } from "@/lib/bannerPositions"

type Banner = {
  id: string
  title: string
  subtitle: string | null
  image: string
  mobileImage: string | null
  link: string | null
  buttonText: string | null
  position: string
  sortOrder: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

type FormValues = {
  title: string
  subtitle: string
  link: string
  buttonText: string
  position: BannerPosition
  sortOrder: string
  startsAt: string
  endsAt: string
}

type Filter = "all" | BannerPosition

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
const LABEL_CLASS = "text-xs font-semibold text-muted-foreground uppercase tracking-wider"

function apiError(e: unknown, fallback: string) {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as { message?: string } | undefined)?.message || fallback
  }
  return fallback
}

/** ISO (UTC) → value for a datetime-local input, in the admin's local time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value → ISO string, empty → null. */
function toIso(local: string) {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function scheduleState(b: Banner): "scheduled" | "expired" | null {
  const now = Date.now()
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return "scheduled"
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return "expired"
  return null
}

const isExternal = (href: string) => /^https?:\/\//i.test(href)

const bySort = (a: Banner, b: Banner) =>
  a.sortOrder - b.sortOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null) // inline toggle / move in flight

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(null)
  const [mobileRemoved, setMobileRemoved] = useState(false)
  const [formActive, setFormActive] = useState(true)

  const { register, handleSubmit, reset } = useForm<FormValues>()

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
    return res.data.url as string
  }

  const fetchBanners = useCallback(async () => {
    try { const res = await api.get("/admin/banners"); setBanners(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // Mount-only fetch. `loading` already starts true, so nothing is set until
    // the request resolves — the lint rule cannot see past the await boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBanners()
  }, [fetchBanners])

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setImageFile(null)
    setImagePreview(null)
    setMobileFile(null)
    setMobilePreview(null)
    setMobileRemoved(false)
  }

  function openAdd() {
    reset({
      title: "",
      subtitle: "",
      link: "",
      buttonText: "",
      position: filter === "all" ? "home_top" : filter,
      sortOrder: "",
      startsAt: "",
      endsAt: "",
    })
    setFormActive(true)
    setEditing(null)
    setImageFile(null)
    setImagePreview(null)
    setMobileFile(null)
    setMobilePreview(null)
    setMobileRemoved(false)
    setShowModal(true)
  }

  function openEdit(b: Banner) {
    reset({
      title: b.title,
      subtitle: b.subtitle || "",
      link: b.link || "",
      buttonText: b.buttonText || "",
      position: b.position as BannerPosition,
      sortOrder: String(b.sortOrder),
      startsAt: toLocalInput(b.startsAt),
      endsAt: toLocalInput(b.endsAt),
    })
    setFormActive(b.active)
    setEditing(b)
    setImageFile(null)
    setImagePreview(b.image)
    setMobileFile(null)
    setMobilePreview(b.mobileImage)
    setMobileRemoved(false)
    setShowModal(true)
  }

  async function onSubmit(data: FormValues) {
    const startsAt = toIso(data.startsAt)
    const endsAt = toIso(data.endsAt)
    if (startsAt && endsAt && startsAt > endsAt) {
      Swal.fire({ text: "Start date must be before end date", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)

      let imageUrl = editing?.image || ""
      if (imageFile) imageUrl = await uploadImage(imageFile)
      if (!imageUrl) {
        Swal.fire({ text: "A banner image is required", icon: "warning", confirmButtonColor: "#18181b" })
        return
      }

      let mobileUrl: string | null = mobileRemoved ? null : editing?.mobileImage ?? null
      if (mobileFile) mobileUrl = await uploadImage(mobileFile)

      const payload = {
        title: data.title.trim(),
        subtitle: data.subtitle.trim() || null,
        image: imageUrl,
        mobileImage: mobileUrl,
        link: data.link.trim() || null,
        buttonText: data.buttonText.trim() || null,
        position: data.position,
        // Blank: leave as-is on edit (key dropped from the JSON), append-to-end on create.
        sortOrder: data.sortOrder === "" ? (editing ? undefined : null) : Number(data.sortOrder),
        active: formActive,
        startsAt,
        endsAt,
      }

      if (editing) await api.patch(`/admin/banners/${editing.id}`, payload)
      else await api.post("/admin/banners", payload)

      closeModal()
      fetchBanners()
    }
    catch (e) { Swal.fire({ text: apiError(e, editing ? "Failed to update banner." : "Failed to create banner."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function toggleActive(b: Banner, active: boolean) {
    setBusyId(b.id)
    setBanners(prev => prev.map(x => (x.id === b.id ? { ...x, active } : x)))
    try { await api.patch(`/admin/banners/${b.id}`, { active }) }
    catch (e) {
      Swal.fire({ text: apiError(e, "Failed to update banner."), confirmButtonColor: "#18181b", icon: "error" })
      fetchBanners()
    }
    finally { setBusyId(null) }
  }

  async function move(b: Banner, dir: -1 | 1) {
    const list = banners.filter(x => x.position === b.position).sort(bySort)
    const idx = list.findIndex(x => x.id === b.id)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= list.length) return

    const next = [...list]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    const items = next.map((x, i) => ({ id: x.id, sortOrder: i }))

    setBusyId(b.id)
    setBanners(prev => prev.map(x => {
      const it = items.find(i => i.id === x.id)
      return it ? { ...x, sortOrder: it.sortOrder } : x
    }))
    try { await api.patch("/admin/banners/reorder", { items }) }
    catch (e) {
      Swal.fire({ text: apiError(e, "Failed to reorder banners."), confirmButtonColor: "#18181b", icon: "error" })
      fetchBanners()
    }
    finally { setBusyId(null) }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this banner?"))) return
    try { setDeletingId(id); await api.delete(`/admin/banners/${id}`); fetchBanners() }
    catch (e) { Swal.fire({ text: apiError(e, "Failed to delete banner."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  const groups = BANNER_POSITIONS
    .filter(p => filter === "all" || p.key === filter)
    .map(p => ({ ...p, items: banners.filter(b => b.position === p.key).sort(bySort) }))
    .filter(g => g.items.length > 0)

  const pills: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...BANNER_POSITIONS.map(p => ({ key: p.key, label: p.label })),
  ]

  return (
    <>
      {/* Add / Edit Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={closeModal} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg">{editing ? <Pencil className="w-5 h-5 text-foreground" /> : <Plus className="w-5 h-5 text-foreground" />}</div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{editing ? "Edit Banner" : "Add Banner"}</h2>
                <p className="text-xs text-muted-foreground">{editing ? "Update banner details" : "Create a new promo banner"}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Title</Label>
                  <Input {...register("title", { required: true })} placeholder="e.g. Summer Sale" />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Subtitle</Label>
                  <Input {...register("subtitle")} placeholder="Optional eyebrow text" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Banner Image (Max 1MB)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setImageFile, setImagePreview)} />
                  <p className="text-[11px] text-muted-foreground">
                    Single banner: 21:9 wide, e.g. 1600 × 686 px. Two or more in the same position: 4:3, e.g. 1200 × 900 px. JPG/WebP.
                  </p>
                  {imagePreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="Preview" className="mt-3 h-24 w-full object-cover rounded-lg border border-border shadow-sm" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Mobile Image (optional, portrait)</Label>
                  <Input type="file" accept="image/*" onChange={(e) => { setMobileRemoved(false); handleFileChange(e, setMobileFile, setMobilePreview) }} />
                  <p className="text-[11px] text-muted-foreground">
                    Shown on phones instead of the banner image. 4:5 portrait, e.g. 800 × 1000 px.
                  </p>
                  {mobilePreview ? (
                    <div className="mt-3 flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mobilePreview} alt="Mobile preview" className="h-24 w-16 object-cover rounded-lg border border-border shadow-sm" />
                      <Button type="button" variant="outline" size="sm" onClick={() => { setMobileFile(null); setMobilePreview(null); setMobileRemoved(true) }}>Remove</Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Falls back to the banner image on phones.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Link</Label>
                  <Input {...register("link")} placeholder="/shop or https://…" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Button Text</Label>
                  <Input {...register("buttonText")} placeholder="e.g. Shop Now" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className={LABEL_CLASS}>Position</Label>
                  <select {...register("position", { required: true })} className={SELECT_CLASS}>
                    {BANNER_POSITIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Sort Order</Label>
                  <Input type="number" step={1} {...register("sortOrder")} placeholder="auto" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Starts At</Label>
                  <Input type="datetime-local" {...register("startsAt")} />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL_CLASS}>Ends At</Label>
                  <Input type="datetime-local" {...register("endsAt")} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">Leave a date blank for no limit. Times are in your local time zone.</p>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">Inactive banners never show, regardless of schedule.</p>
                </div>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={closeModal} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Saving..." : editing ? "Save Changes" : "Create Banner"}
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
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><GalleryHorizontal size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Banners</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Promo banners on the home, men, women and shop pages</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Banner
          </Button>
        </div>

        {/* Position filter */}
        <div className="flex flex-wrap gap-2">
          {pills.map(p => {
            const count = p.key === "all" ? banners.length : banners.filter(b => b.position === p.key).length
            const on = filter === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilter(p.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
              >
                {p.label}
                <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading banners...</span>
          </Card>
        ) : banners.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <GalleryHorizontal className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No banners yet</h3>
            <p className="text-muted-foreground mt-1 text-xs">Create your first banner using the button above.</p>
          </Card>
        ) : groups.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <GalleryHorizontal className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No banners in this position</h3>
            <p className="text-muted-foreground mt-1 text-xs">Add one, or pick another position above.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <Card key={group.key} className="p-0 gap-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.hint}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{group.items.length} banner{group.items.length === 1 ? "" : "s"}</span>
                </div>

                {group.items.map((b, idx) => {
                  const state = scheduleState(b)
                  const busy = busyId === b.id
                  return (
                    <div key={b.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="w-24 h-14 rounded-md bg-muted overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{b.title}</p>
                          {!b.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Inactive</span>}
                          {state === "scheduled" && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Scheduled</span>}
                          {state === "expired" && <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Expired</span>}
                        </div>
                        {b.subtitle && <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>}
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground/70">{bannerPositionLabel(b.position)}</span>
                          {b.link && (
                            <span className="font-mono truncate inline-flex items-center gap-1 max-w-[220px]">
                              {isExternal(b.link) && <ExternalLink size={10} className="shrink-0" />}
                              {b.link}
                            </span>
                          )}
                          {b.buttonText && <span className="truncate">Button: {b.buttonText}</span>}
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground w-56 shrink-0">
                        <CalendarClock size={12} className="shrink-0" />
                        <span className="truncate">
                          {b.startsAt || b.endsAt
                            ? `${fmtDate(b.startsAt) ?? "Now"} → ${fmtDate(b.endsAt) ?? "No end"}`
                            : "Always on"}
                        </span>
                      </div>

                      <span className="hidden md:inline-block w-10 text-center text-xs font-mono text-muted-foreground shrink-0">#{b.sortOrder}</span>

                      <Switch checked={b.active} disabled={busy} onCheckedChange={(v) => toggleActive(b, v)} />

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => move(b, -1)} disabled={busy || idx === 0} className="h-8 w-8 text-muted-foreground" title="Move up"><ArrowUp size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => move(b, 1)} disabled={busy || idx === group.items.length - 1} className="h-8 w-8 text-muted-foreground" title="Move down"><ArrowDown size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="h-8 w-8 text-muted-foreground"><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} disabled={deletingId === b.id} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          {deletingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
