"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Package, Loader2, Pencil, Check } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { compareSizes } from "@/lib/variants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Size = { id: string; name: string; value: string }
type SizePackage = { id: string; name: string; sizes: Size[] }

/** Toggle-button grid for choosing which sizes belong to a package. */
function SizePicker({
  sizes,
  selected,
  onToggle,
  onSelectAll,
}: {
  sizes: Size[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((s) => {
        const on = selected.has(s.id)
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s.id)}
            title={s.name}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition flex items-center gap-1 cursor-pointer ${
              on
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-zinc-700 border-zinc-200 hover:border-primary/50"
            }`}
          >
            {on && <Check className="w-3 h-3" />}
            {s.value}
          </button>
        )
      })}
      {sizes.length > 0 && (
        <button
          type="button"
          onClick={onSelectAll}
          className="px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 transition cursor-pointer"
        >
          {selected.size === sizes.length ? "Clear" : "Select all"}
        </button>
      )}
    </div>
  )
}

export default function SizePackagesPage() {
  const [packages, setPackages] = useState<SizePackage[]>([])
  const [allSizes, setAllSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ADD FORM
  const [name, setName] = useState("")
  const [picked, setPicked] = useState<Set<string>>(new Set())

  // EDIT MODAL
  const [editing, setEditing] = useState<SizePackage | null>(null)
  const [editName, setEditName] = useState("")
  const [editPicked, setEditPicked] = useState<Set<string>>(new Set())
  const [editSubmitting, setEditSubmitting] = useState(false)

  const sortedSizes = useMemo(
    () => [...allSizes].sort((a, b) => compareSizes(a.value, b.value)),
    [allSizes]
  )

  async function fetchData() {
    try {
      setLoading(true)
      const [pkgRes, sizeRes] = await Promise.all([
        api.get("/admin/size-packages"),
        api.get("/admin/sizes"),
      ])
      setPackages(pkgRes.data)
      setAllSizes(sizeRes.data)
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || picked.size === 0) {
      Swal.fire({ text: "Give the package a name and pick at least one size.", confirmButtonColor: "#18181b" })
      return
    }
    try {
      setSubmitting(true)
      await api.post("/admin/size-packages", { name: name.trim(), sizeIds: [...picked] })
      setName("")
      setPicked(new Set())
      fetchData()
    } catch (e: any) {
      Swal.fire({ text: e.response?.data?.message || "Failed to create package.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  function openEdit(p: SizePackage) {
    setEditing(p)
    setEditName(p.name)
    setEditPicked(new Set(p.sizes.map((s) => s.id)))
  }

  async function onEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    if (!editName.trim() || editPicked.size === 0) {
      Swal.fire({ text: "Give the package a name and pick at least one size.", confirmButtonColor: "#18181b" })
      return
    }
    try {
      setEditSubmitting(true)
      await api.patch(`/admin/size-packages/${editing.id}`, { name: editName.trim(), sizeIds: [...editPicked] })
      setEditing(null)
      fetchData()
    } catch (e: any) {
      Swal.fire({ text: e.response?.data?.message || "Failed to update package.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setEditSubmitting(false)
    }
  }

  async function onDelete(id: string) {
    if (!(await confirmDelete("Delete this size package?"))) return
    try {
      setDeletingId(id)
      await api.delete(`/admin/size-packages/${id}`)
      fetchData()
    } catch (e: any) {
      Swal.fire({ text: e.response?.data?.message || "Failed to delete package.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {/* EDIT MODAL */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Size Package</DialogTitle>
            <DialogDescription>Rename the package or change which sizes it bundles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-pkg-name">Package Name</Label>
              <Input id="edit-pkg-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Menswear Tops" />
            </div>
            <div className="space-y-1.5">
              <Label>Sizes ({editPicked.size} selected)</Label>
              <SizePicker
                sizes={sortedSizes}
                selected={editPicked}
                onToggle={(id) => toggle(editPicked, setEditPicked, id)}
                onSelectAll={() =>
                  setEditPicked(
                    editPicked.size === sortedSizes.length ? new Set() : new Set(sortedSizes.map((s) => s.id))
                  )
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" size="lg" disabled={editSubmitting} className="flex-1">
                {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><Package size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Size Packages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bundle sizes into named sets so the variant form offers a short list, not all of them.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ADD FORM */}
          <Card className="lg:col-span-1 lg:sticky lg:top-6">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <div className="p-1.5 bg-muted rounded-lg"><Plus className="w-4 h-4 text-foreground" /></div>
              <CardTitle className="text-sm">New Package</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pkg-name">Name</Label>
                  <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Menswear Tops" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sizes ({picked.size} selected)</Label>
                  {sortedSizes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sizes defined yet — add some in Admin → Sizes first.</p>
                  ) : (
                    <SizePicker
                      sizes={sortedSizes}
                      selected={picked}
                      onToggle={(id) => toggle(picked, setPicked, id)}
                      onSelectAll={() =>
                        setPicked(picked.size === sortedSizes.length ? new Set() : new Set(sortedSizes.map((s) => s.id)))
                      }
                    />
                  )}
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Package"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* PACKAGE LIST */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground text-sm">Loading packages...</span>
              </Card>
            ) : packages.length === 0 ? (
              <Card className="text-center py-16 flex flex-col items-center">
                <Package className="text-muted-foreground/40 w-12 h-12 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No packages yet</h3>
                <p className="text-muted-foreground mt-1 text-xs">Create your first package using the form.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {packages.map((p) => (
                  <Card key={p.id} className="group p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.sizes.length} sizes</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(p.id)} disabled={deletingId === p.id}>
                          {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[...p.sizes]
                        .sort((a, b) => compareSizes(a.value, b.value))
                        .map((s) => (
                          <span key={s.id} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold uppercase tracking-wide text-zinc-700">
                            {s.value}
                          </span>
                        ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
