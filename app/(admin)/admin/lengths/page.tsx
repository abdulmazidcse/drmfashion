"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Maximize, Loader2, Pencil, Check } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type Length = { id: string; name: string; value: string }
type FormValues = { name: string; value: string }

export default function LengthsPage() {
  const [lengths, setLengths] = useState<Length[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingLength, setEditingLength] = useState<Length | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  async function fetchLengths() {
    try { setLoading(true); const res = await api.get("/admin/lengths"); setLengths(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try { setSubmitting(true); await api.post("/admin/lengths", data); reset(); fetchLengths() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to add length.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingLength) return
    try { setEditSubmitting(true); await api.patch(`/admin/lengths/${editingLength.id}`, data); setEditingLength(null); fetchLengths() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to update length.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openEdit(l: Length) { setEditingLength(l); editForm.reset({ name: l.name, value: l.value }) }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this length?"))) return
    try { setDeletingId(id); await api.delete(`/admin/lengths/${id}`); fetchLengths() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to delete length.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => { fetchLengths() }, [])

  return (
    <>
      {/* EDIT MODAL */}
      <Dialog open={!!editingLength} onOpenChange={(open) => { if (!open) setEditingLength(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted rounded-lg"><Pencil className="w-5 h-5 text-foreground" /></div>
              <div>
                <DialogTitle>Edit Length</DialogTitle>
                <DialogDescription>Update length name and code</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Length Name</Label>
              <Input
                {...editForm.register("name", { required: true })}
                placeholder="e.g. Regular, Tall"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code / Value</Label>
              <Input
                {...editForm.register("value", { required: true })}
                placeholder="e.g. REG, TALL"
                className="font-bold"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setEditingLength(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={editSubmitting}
                className="flex-1"
              >
                {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><Maximize size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lengths</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define length standards for apparel variants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ADD FORM */}
          <Card className="lg:col-span-1 sticky top-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-muted rounded-lg"><Plus className="w-4 h-4 text-muted-foreground" /></div>
                <CardTitle className="text-sm">Add Length</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    {...register("name", { required: true })}
                    placeholder="e.g. Regular, Tall, 30 Inseam"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Code / Value</Label>
                  <Input
                    {...register("value", { required: true })}
                    placeholder="e.g. REG, TALL, 30L"
                    className="font-bold"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Length"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* LENGTH LIST */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                  <span className="text-muted-foreground text-sm">Loading lengths...</span>
                </CardContent>
              </Card>
            ) : lengths.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16 flex flex-col items-center">
                  <Maximize className="text-muted-foreground/40 w-12 h-12 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No lengths yet</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Create your first length using the form.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lengths.map((len) => (
                  <Card
                    key={len.id}
                    className="group py-0 transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="flex items-center gap-3 p-3 pr-4">
                      {/* Badge */}
                      <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {len.value}
                      </div>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{len.name}</p>
                        <p className="text-xs text-muted-foreground">Inseam standard</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(len)}
                          title="Edit"
                          className="size-8 text-muted-foreground"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(len.id)}
                          disabled={deletingId === len.id}
                          title="Delete"
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === len.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </CardContent>
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
