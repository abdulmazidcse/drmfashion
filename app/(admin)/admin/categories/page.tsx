"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import dynamic from "next/dynamic"
import {
  Plus,
  Trash2,
  FolderTree,
  Loader2,
  Pencil,
  X,
  Check,
  Tag,
  CornerDownRight,
  Ruler
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import ParentCategorySelect, { type ParentCategoryOption } from "@/components/admin/categories/ParentCategorySelect"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-xs text-muted-foreground border border-border rounded-md">Loading editor...</div>
})

type Category = {
  id: string
  name: string
  slug: string
  image?: string
  bannerImage?: string
  imageAlt?: string
  bannerImageAlt?: string
  imageCaption?: string
  bannerImageCaption?: string
  description?: string
  parentId?: string | null
  children?: Category[]
  isTrending?: boolean
  howToMeasure?: string | null
  howToMeasureImage?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
}

type FormValues = {
  name: string
  slug: string
  image: string
  bannerImage: string
  imageAlt: string
  bannerImageAlt: string
  imageCaption: string
  bannerImageCaption: string
  parentId: string
  isTrending: boolean
  metaTitle: string
  metaDescription: string
  metaKeywords: string
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function stripHtml(html?: string) {
  if (!html) return ""
  const tmp = document.createElement("DIV")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

function buildParentOptions(categories: Category[], opts?: { excludeId?: string; disableAll?: boolean }): ParentCategoryOption[] {
  const list: ParentCategoryOption[] = []
  for (const c of categories) {
    list.push({
      id: c.id,
      label: c.name + (c.id === opts?.excludeId ? " (Current)" : ""),
      depth: 0,
      disabled: Boolean(opts?.disableAll) || c.id === opts?.excludeId,
    })
    for (const sub of c.children || []) {
      list.push({
        id: sub.id,
        label: sub.name + (sub.id === opts?.excludeId ? " (Current)" : ""),
        depth: 1,
        disabled: Boolean(opts?.disableAll) || sub.id === opts?.excludeId,
      })
    }
  }
  return list
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [addFile, setAddFile] = useState<File | null>(null)
  const [addPreview, setAddPreview] = useState<string | null>(null)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)

  // The banner is a separate upload: a 5:7 tile and a 3:1 header cannot be the
  // same photo without one of them being cropped past usefulness.
  const [addBannerFile, setAddBannerFile] = useState<File | null>(null)
  const [addBannerPreview, setAddBannerPreview] = useState<string | null>(null)
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null)
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null)


  const [addHowTo, setAddHowTo] = useState("")
  const [editHowTo, setEditHowTo] = useState("")
  // The numbered body illustration next to the guide copy.
  const [addHowToImageFile, setAddHowToImageFile] = useState<File | null>(null)
  const [addHowToImagePreview, setAddHowToImagePreview] = useState<string | null>(null)
  const [addHowToImageUrl, setAddHowToImageUrl] = useState("")
  const [editHowToImageFile, setEditHowToImageFile] = useState<File | null>(null)
  const [editHowToImagePreview, setEditHowToImagePreview] = useState<string | null>(null)
  const [editHowToImageUrl, setEditHowToImageUrl] = useState("")

  const [description, setDescription] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

  /**
   * Clear the image on a category that already has one.
   *
   * The form field has to be blanked too, not just the preview: submit reads
   * `data.image`, so leaving it set would silently put the old URL back.
   * The API stores an empty string as null.
   */
  function clearImage(
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
    setFormValue: (v: string) => void
  ) {
    setFile(null)
    setPreview(null)
    setFormValue("")
  }

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

  async function fetchCategories() {
    try { setLoading(true); const res = await api.get("/admin/categories"); setCategories(res.data) }
    catch (error) { console.log(error) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try {
      setSubmitting(true)
      let imageUrl = data.image || ""
      if (addFile) {
        imageUrl = await uploadImage(addFile)
      }
      let bannerUrl = data.bannerImage || ""
      if (addBannerFile) {
        bannerUrl = await uploadImage(addBannerFile)
      }
      const howToMeasureImage = addHowToImageFile ? await uploadImage(addHowToImageFile) : addHowToImageUrl
      const payload = { ...data, image: imageUrl, bannerImage: bannerUrl, howToMeasure: addHowTo, howToMeasureImage, parentId: data.parentId || null, description }
      await api.post("/admin/categories", payload)
      reset()
      setAddFile(null)
      setAddPreview(null)
      setAddBannerFile(null)
      setAddBannerPreview(null)
      setAddHowTo("")
      setDescription("")
      setShowAddModal(false)
      fetchCategories()
    } catch (error: any) { Swal.fire({ text: error.response?.data?.message || "Failed to create category.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  async function onEditSubmit(data: FormValues) {
    if (!editingCategory) return
    try {
      setEditSubmitting(true)
      let imageUrl = data.image || ""
      if (editFile) {
        imageUrl = await uploadImage(editFile)
      }
      let bannerUrl = data.bannerImage || ""
      if (editBannerFile) {
        bannerUrl = await uploadImage(editBannerFile)
      }
      const howToMeasureImage = editHowToImageFile ? await uploadImage(editHowToImageFile) : editHowToImageUrl
      const payload = { ...data, image: imageUrl, bannerImage: bannerUrl, howToMeasure: editHowTo, howToMeasureImage, parentId: data.parentId || null, description: editDescription }
      await api.patch(`/admin/categories/${editingCategory.id}`, payload)
      setEditingCategory(null)
      setEditFile(null)
      setEditPreview(null)
      setEditBannerFile(null)
      setEditBannerPreview(null)
      setEditHowTo("")
      fetchCategories()
    } catch (error: any) { Swal.fire({ text: error.response?.data?.message || "Failed to update category.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openAdd() {
    reset({ name: "", slug: "", image: "", bannerImage: "", imageAlt: "", bannerImageAlt: "", imageCaption: "", bannerImageCaption: "", parentId: "", isTrending: false, metaTitle: "", metaDescription: "", metaKeywords: "" })
    setAddHowToImageFile(null)
    setAddHowToImagePreview(null)
    setAddHowToImageUrl("")
    setAddFile(null)
    setAddPreview(null)
    setAddBannerFile(null)
    setAddBannerPreview(null)
    setAddHowTo("")
    setDescription("")
    setShowAddModal(true)
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat)
    setEditFile(null)
    setEditPreview(cat.image || null)
    setEditBannerFile(null)
    setEditBannerPreview(cat.bannerImage || null)
    setEditHowTo(cat.howToMeasure || "")
    setEditHowToImageFile(null)
    setEditHowToImagePreview(cat.howToMeasureImage || null)
    setEditHowToImageUrl(cat.howToMeasureImage || "")
    setEditDescription(cat.description || "")
    editForm.reset({ name: cat.name, slug: cat.slug, image: cat.image || "", bannerImage: cat.bannerImage || "", imageAlt: cat.imageAlt || "", bannerImageAlt: cat.bannerImageAlt || "", imageCaption: cat.imageCaption || "", bannerImageCaption: cat.bannerImageCaption || "", parentId: cat.parentId || "", isTrending: cat.isTrending || false, metaTitle: cat.metaTitle || "", metaDescription: cat.metaDescription || "", metaKeywords: cat.metaKeywords || "" })
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Are you sure you want to delete this category?"))) return
    try { setDeletingId(id); await api.delete(`/admin/categories/${id}`); fetchCategories() }
    catch (error: any) { Swal.fire({ text: error.response?.data?.message || "Failed to delete category.", confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => { fetchCategories() }, [])

  const flatCategories = categories.flatMap(cat => [cat, ...(cat.children || [])]);

  return (
    <>
      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Plus className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Add Category</h2><p className="text-xs text-muted-foreground">Create a new category</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name", { required: true, onChange: (e) => setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Summer Outfits" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register("slug", { required: true })} placeholder="auto-generated" className="font-mono text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Parent Category (Optional)</Label>
                <ParentCategorySelect
                  options={buildParentOptions(categories)}
                  value={watch("parentId")}
                  onChange={(id) => setValue("parentId", id)}
                />
              </div>
              <div className="space-y-2">
                <Label>Card Image (Max 1MB)</Label>
                <p className="text-xs text-muted-foreground">The portrait card in the homepage grids (Trending, Summer) and the category lists. About 700×980.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAddFile, setAddPreview)} className="file:text-foreground file:font-medium" />
                {addPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={addPreview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-border shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setAddFile, setAddPreview, (v) => setValue("image", v))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                )}
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Alt text (for SEO and screen readers)</Label>
                  <Input
                    {...register("imageAlt")}
                    placeholder="Empty falls back to “Category name category”"
                    className="mt-1.5"
                  />
                </div>
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Caption (shown under the image)</Label>
                  <Input
                    {...register("imageCaption")}
                    placeholder="Optional — leave empty to show no caption"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner Image (Optional)</Label>
                <p className="text-xs text-muted-foreground">Wide artwork across the top of the category page. About 1920×600. Leave empty to reuse the card image.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAddBannerFile, setAddBannerPreview)} className="file:text-foreground file:font-medium" />
                {addBannerPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={addBannerPreview} alt="Preview" className="h-16 w-24 object-cover rounded-md border border-border shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setAddBannerFile, setAddBannerPreview, (v) => setValue("bannerImage", v))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                )}
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Alt text (for SEO and screen readers)</Label>
                  <Input
                    {...register("bannerImageAlt")}
                    placeholder="Empty falls back to “Category name category banner”"
                    className="mt-1.5"
                  />
                </div>
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Caption (shown under the image)</Label>
                  <Input
                    {...register("bannerImageCaption")}
                    placeholder="Optional — leave empty to show no caption"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>How To Measure</Label>
                <p className="text-xs text-muted-foreground">
                  The measuring guide in the size popup. Inherited the same way, and separately from the chart — leave it
                  empty to use the parent category&apos;s guide.
                </p>
                <RichTextEditor initialContent={addHowTo} onChange={setAddHowTo} />
              </div>
              <div className="space-y-2">
                <Label>How To Measure Figure (Optional)</Label>
                <p className="text-xs text-muted-foreground">The numbered body illustration shown beside the guide. Portrait PNG/SVG on white, about 600×1100. Number the points in the same order as the steps above. Inherited by child categories; leave empty to use the built-in drawing.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setAddHowToImageFile, setAddHowToImagePreview)} className="file:text-foreground file:font-medium" />
                {addHowToImagePreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={addHowToImagePreview} alt="How to measure figure preview" className="h-28 w-20 object-contain rounded-md border border-border bg-white shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setAddHowToImageFile, setAddHowToImagePreview, setAddHowToImageUrl)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("isTrending")} className="w-4 h-4 rounded border-input accent-primary focus:ring-ring" />
                  <span className="text-xs font-semibold text-foreground">Show as Trending Category</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor initialContent={description} onChange={setDescription} />
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-foreground pt-3">SEO</p>
                <p className="text-xs text-muted-foreground">
                  Shown by search engines for this category page. Leave empty to fall back to the name and description above.
                </p>
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input {...register("metaTitle")} placeholder="e.g. Tall Men's Jeans — 36&quot; & 38&quot; Inseams" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea rows={3} {...register("metaDescription")} placeholder="120–160 characters." />
                </div>
                <div className="space-y-2">
                  <Label>Meta Keywords</Label>
                  <Input {...register("metaKeywords")} placeholder="tall jeans, long inseam, 36 inseam" className="font-mono text-xs" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {submitting ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-card text-card-foreground rounded-xl shadow-2xl border border-border w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <Button type="button" variant="ghost" size="icon" onClick={() => setEditingCategory(null)} className="absolute top-4 right-4 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Pencil className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Edit Category</h2><p className="text-xs text-muted-foreground">Update details for this category</p></div>
            </div>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input {...editForm.register("name", { required: true, onChange: (e) => editForm.setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Summer Outfits" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...editForm.register("slug", { required: true })} placeholder="e.g. summer-outfits" className="font-mono text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Parent Category (Optional)</Label>
                <ParentCategorySelect
                  options={buildParentOptions(categories, {
                    excludeId: editingCategory.id,
                    disableAll: (editingCategory.children?.length ?? 0) > 0,
                  })}
                  value={editForm.watch("parentId")}
                  onChange={(id) => editForm.setValue("parentId", id)}
                />
                {(editingCategory.children?.length ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">This category has subcategories, so it can&apos;t be moved under another parent.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Card Image (Max 1MB)</Label>
                <p className="text-xs text-muted-foreground">The portrait card in the homepage grids (Trending, Summer) and the category lists. About 700×980.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setEditFile, setEditPreview)} className="file:text-foreground file:font-medium" />
                {editPreview ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={editPreview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-border shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setEditFile, setEditPreview, (v) => editForm.setValue("image", v))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No image — this category shows a placeholder in the homepage grids.
                  </p>
                )}
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Alt text (for SEO and screen readers)</Label>
                  <Input
                    {...editForm.register("imageAlt")}
                    placeholder="Empty falls back to “Category name category”"
                    className="mt-1.5"
                  />
                </div>
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Caption (shown under the image)</Label>
                  <Input
                    {...editForm.register("imageCaption")}
                    placeholder="Optional — leave empty to show no caption"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner Image (Optional)</Label>
                <p className="text-xs text-muted-foreground">Wide artwork across the top of the category page. About 1920×600. Leave empty to reuse the card image.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setEditBannerFile, setEditBannerPreview)} className="file:text-foreground file:font-medium" />
                {editBannerPreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={editBannerPreview} alt="Preview" className="h-16 w-24 object-cover rounded-md border border-border shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setEditBannerFile, setEditBannerPreview, (v) => editForm.setValue("bannerImage", v))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                )}
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Alt text (for SEO and screen readers)</Label>
                  <Input
                    {...editForm.register("bannerImageAlt")}
                    placeholder="Empty falls back to “Category name category banner”"
                    className="mt-1.5"
                  />
                </div>
                <div className="pt-1">
                  <Label className="text-xs font-normal text-muted-foreground">Caption (shown under the image)</Label>
                  <Input
                    {...editForm.register("bannerImageCaption")}
                    placeholder="Optional — leave empty to show no caption"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>How To Measure</Label>
                <p className="text-xs text-muted-foreground">
                  The measuring guide in the size popup. Inherited the same way, and separately from the chart — leave it
                  empty to use the parent category&apos;s guide.
                </p>
                <RichTextEditor initialContent={editHowTo} onChange={setEditHowTo} />
              </div>
              <div className="space-y-2">
                <Label>How To Measure Figure (Optional)</Label>
                <p className="text-xs text-muted-foreground">The numbered body illustration shown beside the guide. Portrait PNG/SVG on white, about 600×1100. Number the points in the same order as the steps above. Inherited by child categories; leave empty to use the built-in drawing.</p>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setEditHowToImageFile, setEditHowToImagePreview)} className="file:text-foreground file:font-medium" />
                {editHowToImagePreview && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={editHowToImagePreview} alt="How to measure figure preview" className="h-28 w-20 object-contain rounded-md border border-border bg-white shadow-sm" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearImage(setEditHowToImageFile, setEditHowToImagePreview, setEditHowToImageUrl)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...editForm.register("isTrending")} className="w-4 h-4 rounded border-input accent-primary focus:ring-ring" />
                  <span className="text-xs font-semibold text-foreground">Show as Trending Category</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor initialContent={editDescription} onChange={setEditDescription} />
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-foreground pt-3">SEO</p>
                <p className="text-xs text-muted-foreground">
                  Shown by search engines for this category page. Leave empty to fall back to the name and description above.
                </p>
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <Input {...editForm.register("metaTitle")} placeholder="e.g. Tall Men's Jeans — 36&quot; & 38&quot; Inseams" />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea rows={3} {...editForm.register("metaDescription")} placeholder="120–160 characters." />
                </div>
                <div className="space-y-2">
                  <Label>Meta Keywords</Label>
                  <Input {...editForm.register("metaKeywords")} placeholder="tall jeans, long inseam, 36 inseam" className="font-mono text-xs" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setEditingCategory(null)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={editSubmitting} className="flex-1">
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6 w-full p-2">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><FolderTree size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Categories</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Organize and classify your fashion collections</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        </div>

        {/* MAIN LIST */}
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
              <span className="text-muted-foreground text-sm">Loading categories...</span>
            </CardContent>
          </Card>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16 flex flex-col items-center">
              <FolderTree className="text-muted-foreground/40 w-12 h-12 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No categories yet</h3>
              <p className="text-muted-foreground mt-1 text-xs max-w-xs">Create your first category using the button above.</p>
            </CardContent>
          </Card>
        ) : (
          // Two columns at most. Each card carries a three-level tree inside it,
          // and every level spends width on an indent, an icon and two buttons —
          // at four columns the third level had no room left for its label.
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <Card className="group py-0 transition-all duration-200 hover:border-ring/40 hover:shadow-md">
                  <CardContent className="flex flex-col p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-muted border border-border overflow-hidden shrink-0">
                      {cat.image ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" /> : <div className="w-full h-full flex items-center justify-center"><Tag className="w-4 h-4 text-muted-foreground" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate" title={cat.name}>{cat.name}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate" title={`/${cat.slug}`}>/{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)} className="text-muted-foreground"><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(cat.id)} disabled={deletingId === cat.id} className="text-muted-foreground hover:text-destructive">{deletingId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</Button>
                    </div>
                  </div>
                  {cat.description && (
                    <div className="mt-3 text-xs text-muted-foreground line-clamp-2">
                      {stripHtml(cat.description)}
                    </div>
                  )}
                  </CardContent>
                </Card>

                {cat.children && cat.children.length > 0 && (
                  <div className="pl-4 space-y-2 border-l-2 border-border ml-3">
                    {cat.children.map(subCat => (
                      <div key={subCat.id} className="group bg-muted/50 rounded-lg border border-border hover:border-ring/40 transition-all duration-200 flex flex-col p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground/60 shrink-0"><CornerDownRight size={16} /></div>
                          <div className="w-8 h-8 rounded-md bg-card border border-border overflow-hidden shrink-0">
                            {subCat.image ? <img src={subCat.image} alt={subCat.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Tag className="w-3 h-3 text-muted-foreground" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate" title={subCat.name}>{subCat.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground truncate" title={`/${subCat.slug}`}>/{subCat.slug}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEdit(subCat)} className="text-muted-foreground"><Pencil size={12} /></Button>
                            <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(subCat.id)} disabled={deletingId === subCat.id} className="text-muted-foreground hover:text-destructive">{deletingId === subCat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}</Button>
                          </div>
                        </div>
                        {subCat.description && (
                          <div className="mt-2 ml-14 text-[11px] text-muted-foreground line-clamp-1">
                            {stripHtml(subCat.description)}
                          </div>
                        )}

                        {/* 3rd level categories */}
                        {subCat.children && subCat.children.length > 0 && (
                          <div className="pl-4 space-y-2 border-l-2 border-border ml-3 mt-3">
                            {subCat.children.map(deepCat => (
                              <div key={deepCat.id} className="group bg-card rounded border border-border hover:border-ring/40 transition-all duration-200 flex flex-col p-2">
                                <div className="flex items-center gap-2">
                                  <div className="text-muted-foreground/60 shrink-0"><CornerDownRight size={14} /></div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-foreground truncate" title={deepCat.name}>{deepCat.name}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground truncate" title={`/${deepCat.slug}`}>/{deepCat.slug}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(deepCat)} className="text-muted-foreground"><Pencil size={10} /></Button>
                                    <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(deepCat.id)} disabled={deletingId === deepCat.id} className="text-muted-foreground hover:text-destructive">{deletingId === deepCat.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}</Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
