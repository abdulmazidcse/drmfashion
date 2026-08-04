"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Ruler, Loader2, Pencil, Check } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

type Size = { id: string; name: string; value: string }
type FormValues = { name: string; value: string }

export default function SizesPage() {
  const [sizes, setSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingSize, setEditingSize] = useState<Size | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  async function fetchSizes() {
    try { setLoading(true); const res = await api.get("/admin/sizes"); setSizes(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try { setSubmitting(true); await api.post("/admin/sizes", data); reset(); fetchSizes() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to add size.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingSize) return
    try { setEditSubmitting(true); await api.patch(`/admin/sizes/${editingSize.id}`, data); setEditingSize(null); fetchSizes() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to update size.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openEdit(s: Size) { setEditingSize(s); editForm.reset({ name: s.name, value: s.value }) }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this size?"))) return
    try { setDeletingId(id); await api.delete(`/admin/sizes/${id}`); fetchSizes() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to delete size.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => { fetchSizes() }, [])

  return (
    <>
      {/* EDIT MODAL */}
      <Dialog open={!!editingSize} onOpenChange={(open) => { if (!open) setEditingSize(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Size</DialogTitle>
            <DialogDescription>Update size name and abbreviation</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-size-name">Size Name</Label>
              <Input id="edit-size-name" {...editForm.register("name", { required: true })} placeholder="e.g. Medium" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-size-value">Abbreviation / Value</Label>
              <Input id="edit-size-value" {...editForm.register("value", { required: true })} placeholder="e.g. M" className="font-bold" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setEditingSize(null)}>Cancel</Button>
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
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><Ruler size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sizes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define sizing standards for apparel variants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ADD FORM */}
          <Card className="lg:col-span-1 sticky top-6">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <div className="p-1.5 bg-muted rounded-lg"><Plus className="w-4 h-4 text-foreground" /></div>
              <CardTitle className="text-sm">Add Size</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="add-size-name">Name</Label>
                  <Input id="add-size-name" {...register("name", { required: true })} placeholder="e.g. Extra Large" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-size-value">Abbreviation</Label>
                  <Input id="add-size-value" {...register("value", { required: true })} placeholder="e.g. XL" className="font-bold" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Size"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* SIZE LIST */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground text-sm">Loading sizes...</span>
              </Card>
            ) : sizes.length === 0 ? (
              <Card className="text-center py-16 flex flex-col items-center">
                <Ruler className="text-muted-foreground/40 w-12 h-12 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">No sizes yet</h3>
                <p className="text-muted-foreground mt-1 text-xs">Create your first size using the form.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sizes.map((size) => (
                  <Card key={size.id} className="group flex-row items-center gap-3 p-3 pr-4 hover:shadow-md transition-all duration-200">
                    {/* Badge */}
                    <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                      {size.value}
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{size.name}</p>
                      <p className="text-xs text-muted-foreground">Label standard</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(size)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(size.id)} disabled={deletingId === size.id}>
                        {deletingId === size.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </Button>
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
