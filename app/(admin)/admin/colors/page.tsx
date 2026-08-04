"use client"

import { useEffect, useState } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { Plus, Trash2, Palette, Loader2, Pencil, Check, ImagePlus, X } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { COLOR_TYPES, DEFAULT_ANGLE, swatchLabel, swatchStyle, type ColorType } from "@/lib/colorStyle"

type Color = { id: string; name: string; type: ColorType; value: string; value2: string | null; angle: number | null; image: string | null }
type FormValues = { name: string; type: ColorType; value: string; value2: string; angle: number; image: string }

const EMPTY_FORM: FormValues = { name: "", type: "SOLID", value: "#6366f1", value2: "#0f172a", angle: DEFAULT_ANGLE, image: "" }

// Swatches render at ~44px, so a tiny crop is plenty — keep the payload small.
const MAX_FABRIC_KB = 10
const MAX_FABRIC_BYTES = MAX_FABRIC_KB * 1024

function toFormValues(c: Color): FormValues {
  return {
    name: c.name,
    type: c.type || "SOLID",
    value: c.value,
    value2: c.value2 || EMPTY_FORM.value2,
    angle: c.angle ?? DEFAULT_ANGLE,
    image: c.image || "",
  }
}

/** Native colour picker + hex text input, kept in sync through react-hook-form. */
function HexField({ form, name, label }: { form: UseFormReturn<FormValues>; name: "value" | "value2"; label: string }) {
  const current = form.watch(name)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 rounded-md overflow-hidden border border-input shrink-0 cursor-pointer relative">
          <input type="color" value={current} onChange={(e) => form.setValue(name, e.target.value, { shouldValidate: true })} className="absolute inset-0 w-[200%] h-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-none p-0 outline-none" />
        </div>
        <Input {...form.register(name, { required: true })} className="flex-1 font-mono" />
      </div>
    </div>
  )
}

/** Fabric / print photo used as the swatch face for IMAGE colors. */
function FabricField({ form }: { form: UseFormReturn<FormValues> }) {
  const [uploading, setUploading] = useState(false)
  const image = form.watch("image")

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FABRIC_BYTES) {
      Swal.fire({
        text: `Fabric photo must be ${MAX_FABRIC_KB}KB or smaller — this one is ${(file.size / 1024).toFixed(1)}KB.`,
        confirmButtonColor: "#18181b",
        icon: "error",
      })
      e.target.value = ""
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("files", file)
      const res = await api.post("/admin/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      form.setValue("image", res.data.url, { shouldValidate: true })
      e.target.value = ""
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      Swal.fire({ text: message || "Failed to upload fabric photo.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Fabric Photo</Label>
      <div className="flex gap-3 items-center">
        {image ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Fabric swatch" className="w-14 h-14 rounded-md object-cover border border-input" />
            <button type="button" onClick={() => form.setValue("image", "", { shouldValidate: true })} className="absolute -top-1.5 -right-1.5 bg-background border border-input rounded-full p-0.5 cursor-pointer hover:bg-muted">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-md border border-dashed border-border grid place-items-center shrink-0 text-muted-foreground">
            <ImagePlus className="w-5 h-5" />
          </div>
        )}
        <label className={`flex-1 border border-input rounded-md px-3 py-2.5 text-xs font-semibold text-center cursor-pointer hover:bg-muted transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading ? "Uploading..." : image ? "Replace photo" : "Upload photo"}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">Use a tight, square crop of the print — it is cropped to fill the swatch circle. Max {MAX_FABRIC_KB}KB.</p>
    </div>
  )
}

/** Shared field set for both the add form and the edit modal. */
function ColorFields({ form }: { form: UseFormReturn<FormValues> }) {
  const type = form.watch("type")
  const preview = {
    type,
    value: form.watch("value"),
    value2: form.watch("value2"),
    angle: Number(form.watch("angle")),
    image: form.watch("image"),
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input {...form.register("name", { required: true })} placeholder="e.g. Classic Crimson" />
      </div>

      <div className="space-y-1.5">
        <Label>Swatch Type</Label>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_TYPES.map((t) => (

            <button
              key={t.value}
              type="button"
              title={t.hint}
              onClick={() => form.setValue("type", t.value, { shouldValidate: true })}
              className={`rounded-md border px-2 py-2 text-xs font-semibold transition cursor-pointer ${type === t.value ? "border-foreground bg-muted text-foreground" : "border-input text-muted-foreground hover:bg-muted/50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {type === "IMAGE" ? (
        <FabricField form={form} />
      ) : (
        <>
          <HexField form={form} name="value" label={type === "GRADIENT" ? "From Hex" : type === "CHECK" ? "Base Hex" : "Hex Value"} />
          {type !== "SOLID" && (
            <HexField form={form} name="value2" label={type === "GRADIENT" ? "To Hex" : "Check Line Hex"} />
          )}
        </>
      )}

      {type === "GRADIENT" && (
        <div className="space-y-1.5">
          <Label>Angle — {form.watch("angle")}°</Label>
          <input type="range" min={0} max={360} step={5} {...form.register("angle", { valueAsNumber: true })} className="w-full accent-foreground cursor-pointer" />
        </div>
      )}

      {/* Swatch Preview */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-dashed border-border">
        <div style={swatchStyle(preview)} className="w-8 h-8 rounded-full border border-black/10 shrink-0" />
        <span className="text-xs font-mono text-muted-foreground">{swatchLabel(preview)}</span>
      </div>
    </div>
  )
}

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingColor, setEditingColor] = useState<Color | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const addForm = useForm<FormValues>({ defaultValues: EMPTY_FORM })
  const editForm = useForm<FormValues>({ defaultValues: EMPTY_FORM })

  async function fetchColors() {
    try { setLoading(true); const res = await api.get("/admin/colors"); setColors(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try { setSubmitting(true); await api.post("/admin/colors", data); addForm.reset(EMPTY_FORM); fetchColors() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to add color.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingColor) return
    try { setEditSubmitting(true); await api.patch(`/admin/colors/${editingColor.id}`, data); setEditingColor(null); fetchColors() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to update color.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openEdit(c: Color) { setEditingColor(c); editForm.reset(toFormValues(c)) }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Delete this color?"))) return
    try { setDeletingId(id); await api.delete(`/admin/colors/${id}`); fetchColors() }
    catch (e: any) { Swal.fire({ text: e.response?.data?.message || "Failed to delete color.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => { fetchColors() }, [])

  return (
    <>
      {/* EDIT MODAL */}
      <Dialog open={!!editingColor} onOpenChange={(open) => { if (!open) setEditingColor(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted rounded-lg"><Pencil className="w-5 h-5 text-foreground" /></div>
              <div>
                <DialogTitle>Edit Color</DialogTitle>
                <DialogDescription>Update the swatch name, type and colors</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <ColorFields form={editForm} />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setEditingColor(null)}>Cancel</Button>
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
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl"><Palette size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Colors</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define solid, gradient and check swatches for product variants</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ADD FORM */}
          <Card className="lg:col-span-1 sticky top-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-muted rounded-md"><Plus className="w-4 h-4 text-foreground" /></div>
                <h2 className="text-sm font-semibold text-foreground">Add Color</h2>
              </div>
              <form onSubmit={addForm.handleSubmit(onSubmit)} className="space-y-4">
                <ColorFields form={addForm} />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Saving..." : "Save Color"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* COLOR LIST */}
          <div className="lg:col-span-2">
            {loading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                  <span className="text-muted-foreground text-sm">Loading colors...</span>
                </CardContent>
              </Card>
            ) : colors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-16 flex flex-col items-center">
                  <Palette className="text-muted-foreground/40 w-12 h-12 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground">No colors yet</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Create your first color swatch using the form.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {colors.map((color) => (
                  <Card key={color.id} className="group hover:shadow-md transition-all duration-200">
                    <CardContent className="flex items-center gap-3 p-3 pr-4">
                      {/* Swatch */}
                      <div style={swatchStyle(color)} className="w-11 h-11 rounded-md border border-black/10 shrink-0 group-hover:scale-105 transition duration-200" />
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground truncate">{color.name}</p>
                          {color.type && color.type !== "SOLID" && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                              {COLOR_TYPES.find((t) => t.value === color.type)?.label || color.type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">{swatchLabel(color)}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(color)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(color.id)} disabled={deletingId === color.id}>
                          {deletingId === color.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
