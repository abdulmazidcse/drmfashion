"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import api from "@/lib/axios"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Sparkles, AlertCircle, Image as ImageIcon, Trash2, UploadCloud, FileText, Tag, DollarSign, Layers } from "lucide-react"

import VariantForm from "./VariantForm"
import ModelWearsPicker from "./ModelWearsPicker"
import VariantTable from "./VariantTable"
import ProductFormStepper, { type ProductFormStepDef } from "./ProductFormStepper"
import CustomMeasurementSection, { type CustomMeasurementValue } from "./CustomMeasurementSection"
import { productCodeSlugPart } from "@/lib/productCode"
import Swal from "sweetalert2";
import dynamic from "next/dynamic"
import { useCurrency } from "@/providers/CurrencyProvider"
import {
  stagePendingFile,
  releasePendingUrl,
  resolvePendingUrls,
  applyResolved,
  releaseResolved,
  countPending,
  isPendingUrl,
  type UploadProgress,
} from "@/lib/pendingUploads"
import { readVariantImages, writeVariantImage, type VariantImageEntry } from "@/lib/imageMeta"

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-xs text-zinc-600 border border-zinc-200 rounded-xl">Loading editor...</div>
})

type FormValues = {
  title: string
  productCode: string
  slug: string
  categoryId: string
  brandId?: string
  description: string
  thumbnail: string
  sizeChartId?: string
  basePrice: number
  costPrice?: number
  discountPrice?: number
  flashSaleEndDate?: string
  featured?: boolean
  published?: boolean
  sizeAndFit?: string
  fabricAndCare?: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  tags?: string
  modelWearsProductId?: string
}

const emptyCustomMeasurement: CustomMeasurementValue = {
  customMeasurementEnabled: false,
  measurementTemplateId: "",
  customSurchargeType: "",
  customSurchargeValue: "",
}

type Variant = {
  size: string
  color: string
  length?: string
  stock: number
  sku: string
  image?: string
  images: any
}

type ProductImageInput = {
  url: string
  color: string // Color name, or "" for General
  /// Alt text for screen readers and image search. Blank means "generate one"
  /// from the title and colourway — see lib/imageMeta.ts.
  alt?: string
  /// Optional caption shown under the shot in the storefront gallery.
  caption?: string
}

const STEPS: ProductFormStepDef[] = [
  { id: "details", title: "Add Product Details", description: "Add Product name & details", icon: FileText },
  { id: "gallery", title: "Product gallery", description: "Thumbnail & Add Product gallery", icon: ImageIcon },
  { id: "categories", title: "Product Categories", description: "Add Product category & brand", icon: Tag },
  { id: "prices", title: "Selling prices", description: "Add Product basic price & sale", icon: DollarSign },
  { id: "advance", title: "Advance", description: "Add Meta details & Inventory", icon: Layers },
]

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["title", "productCode"],
  1: ["thumbnail"],
  2: ["categoryId"],
  3: ["basePrice", "costPrice", "discountPrice"],
  4: ["slug"],
}

export default function ProductForm() {
  const router = useRouter()
  const { baseCurrency } = useCurrency()
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      sizeAndFit: "",
      fabricAndCare: "",
      published: true,
    },
  })

  useEffect(() => {
    register("sizeAndFit")
    register("fabricAndCare")
    register("modelWearsProductId")
  }, [register])

  const [categories, setCategories] = useState<{ id: string; name: string; children?: { id: string; name: string; children?: { id: string; name: string }[] }[] }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [dbColors, setDbColors] = useState<{ id: string; name: string; value: string }[]>([])

  // MULTIPLE IMAGES STATE
  const [productImages, setProductImages] = useState<ProductImageInput[]>([])
  const [imageInputUrl, setImageInputUrl] = useState("")
  const [imageInputColor, setImageInputColor] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await api.get("/admin/categories")
        setCategories(catRes.data)
        const brandRes = await api.get("/admin/brands")
        setBrands(brandRes.data)
        const colorRes = await api.get("/admin/colors")
        setDbColors(colorRes.data)
      } catch (err) {
        console.log(err)
      }
    }
    loadData()
  }, [])

  // VARIANT STATE
  const [variants, setVariants] = useState<Variant[]>([])

  // ADD VARIANT
  function addVariant(newVariants: Variant[]) {
    setVariants((prev) => [...prev, ...newVariants])
  }

  // REMOVE VARIANT
  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  // UPDATE VARIANT SKU
  function updateVariantSku(index: number, newSku: string) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, sku: newSku } : v)))
  }

  // UPDATE VARIANT IMAGES
  function updateVariantImages(index: number, images: Array<string | VariantImageEntry>, applyToColor: boolean, thumbnail?: string) {
    setVariants((prev) => {
      const target = prev[index]
      if (!target) return prev

      // `thumbnail` is only sent by the "Set thumb" control. Guarded against a
      // stale value so a photo removed in the same edit can't be left as the
      // thumbnail; everything else keeps the original first-image rule.
      const urls = readVariantImages(images).map((e) => e.url)
      const chosen = thumbnail && urls.includes(thumbnail) ? thumbnail : urls[0]

      const next = prev.map((v, i) => {
        const affected = applyToColor ? v.color === target.color : i === index
        return affected ? { ...v, images: [...images], image: chosen } : v
      })

      // A photo dropped from every variant that used it — and not kept as the
      // thumbnail or a gallery image — is a staged file nobody needs, so let it
      // go rather than uploading it on save.
      const stillUsed = new Set<string>(
        [
          watch("thumbnail"),
          ...productImages.map((img) => img.url),
          ...next.flatMap((v) => [v.image, ...readVariantImages(v.images).map((e) => e.url)]),
        ].filter(Boolean) as string[]
      )

      for (const v of prev) {
        for (const url of readVariantImages(v.images).map((e) => e.url)) {
          if (!stillUsed.has(url)) releasePendingUrl(url)
        }
      }

      return next
    })
  }

  // AUTOMATED SLUG GENERATION
  //
  // Titles are not unique, so a title-only slug collides the moment two products
  // share a name. The product code is unique, so appending it keeps the slug
  // unique too — while staying readable. The field remains editable in step 5.
  function buildSlug(title: string, code: string) {
    const titlePart = productCodeSlugPart(title)
    const codePart = productCodeSlugPart(code)
    return [titlePart, codePart].filter(Boolean).join("-")
  }

  // These inputs override register()'s own onChange, so the field has to be
  // written back explicitly — otherwise the other half of the slug reads stale.
  function handleTitleChange(title: string) {
    setValue("title", title, { shouldValidate: true })
    setValue("slug", buildSlug(title, getValues("productCode") || ""))
  }

  function handleProductCodeChange(code: string) {
    setValue("productCode", code, { shouldValidate: true })
    setValue("slug", buildSlug(getValues("title") || "", code))
  }

  // FILE UPLOAD STATES
  const [uploadError, setUploadError] = useState("")

  // The picker's options. Loaded once per form — the list is short and rarely
  // changes, so there is nothing to gain from refetching it.
  const [sizeCharts, setSizeCharts] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    fetch("/api/admin/size-charts")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSizeCharts(data) })
      .catch(() => setSizeCharts([]))
  }, [])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

  const [customMeasurement, setCustomMeasurement] = useState<CustomMeasurementValue>(emptyCustomMeasurement)

  // MULTI-FILE PICKER — previews only, the upload happens on submit
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 2 * 1024 * 1024) {
        Swal.fire({ text: "Each gallery image must be less than 2MB", icon: "warning", confirmButtonColor: "#18181b" })
        e.target.value = ""
        return
      }
    }

    setUploadError("")

    const newImages: ProductImageInput[] = []
    for (let i = 0; i < files.length; i++) {
      newImages.push({ url: stagePendingFile(files[i]), color: "", alt: "", caption: "" })
    }

    setProductImages((prev) => {
      const updated = [...prev, ...newImages]
      const currentThumbnail = watch("thumbnail")
      if (!currentThumbnail && updated.length > 0) {
        setValue("thumbnail", updated[0].url)
      }
      return updated
    })

    e.target.value = ""
  }

  /** Stage a single-slot image (thumbnail / size chart), replacing any prior pick. */
  function selectSingleImage(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "thumbnail",
    maxBytes: number,
    label: string
  ) {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (files[0].size > maxBytes) {
      Swal.fire({ text: `${label} image size must be less than ${Math.round(maxBytes / 1024)}KB`, icon: "warning", confirmButtonColor: "#18181b" })
      e.target.value = ""
      return
    }

    clearSingleImage(field)
    setValue(field, stagePendingFile(files[0]))
    e.target.value = ""
  }

  /** Clear a single-slot image, discarding its staged file unless the gallery shares it. */
  function clearSingleImage(field: "thumbnail") {
    const current = watch(field)
    if (current && !productImages.some((img) => img.url === current)) {
      releasePendingUrl(current)
    }
    setValue(field, "")
  }

  // ADD MULTIPLE COLOR MATCHED IMAGES (MANUAL URL)
  function addProductImage() {
    if (!imageInputUrl) {
      Swal.fire({ text: "Please input an image URL link.", confirmButtonColor: "#18181b" })
      return
    }
    setProductImages((prev) => {
      const updated = [
        ...prev,
        {
          url: imageInputUrl,
          color: imageInputColor, // Can be empty for General
          alt: "",
          caption: "",
        },
      ]
      const currentThumbnail = watch("thumbnail")
      if (!currentThumbnail && updated.length > 0) {
        setValue("thumbnail", imageInputUrl)
      }
      return updated
    })
    setImageInputUrl("")
  }

  /** Edit the alt text or caption of one gallery image in place. */
  function updateProductImageMeta(index: number, field: "alt" | "caption", value: string) {
    setProductImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    )
  }

  // REMOVE IMAGE
  function removeProductImage(index: number) {
    setProductImages((prev) => {
      const url = prev[index]?.url
      const remaining = prev.filter((_, i) => i !== index)

      const stillUsed =
        watch("thumbnail") === url ||
        remaining.some((img) => img.url === url) ||
        variants.some((v) => v.image === url || readVariantImages(v.images).some((e) => e.url === url))

      if (!stillUsed) releasePendingUrl(url)
      return remaining
    })
  }

  // STEP NAVIGATION
  async function goNext() {
    const ok = await trigger(STEP_FIELDS[step])
    if (!ok) return

    if (step === 0) {
      const description = watch("description")
      if (!description || description.trim() === "" || description === "<p></p>") {
        Swal.fire({ text: "Product Narrative Description is required.", icon: "warning", confirmButtonColor: "#18181b" })
        return
      }
    }

    if (step === 1 && !watch("thumbnail")) {
      Swal.fire({ text: "Main Thumbnail Image is required.", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }

    setMaxStepReached((m) => Math.max(m, step + 1))
    setStep((s) => s + 1)
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  function handleStepClick(index: number) {
    if (index <= maxStepReached) setStep(index)
  }

  function onInvalid(formErrors: typeof errors) {
    const erroredStep = Object.entries(STEP_FIELDS).find(([, fields]) =>
      fields.some((f) => f in formErrors)
    )
    if (erroredStep) {
      const stepIndex = Number(erroredStep[0])
      setMaxStepReached((m) => Math.max(m, stepIndex))
      setStep(stepIndex)
    }
  }

  async function onSubmit(data: FormValues) {
    if (!data.description || data.description.trim() === "" || data.description === "<p></p>") {
      Swal.fire({ text: "Product Narrative Description is required.", icon: "warning", confirmButtonColor: "#18181b" })
      setStep(0)
      return
    }
    if (!data.thumbnail) {
      Swal.fire({ text: "Main Thumbnail Image is required.", icon: "warning", confirmButtonColor: "#18181b" })
      setStep(1)
      return
    }
    if (variants.length === 0) {
      Swal.fire({ text: "Please add at least one stock variant.", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }
    if (customMeasurement.customMeasurementEnabled && !customMeasurement.measurementTemplateId) {
      Swal.fire({ text: "Select a garment type for custom measurement.", icon: "warning", confirmButtonColor: "#18181b" })
      setStep(3)
      return
    }

    try {
      setSubmitting(true)
      setUploadError("")

      // Everything picked during this session goes up now — nothing was sent
      // to the server while the admin was still filling the form in.
      let resolved: Map<string, string>
      try {
        resolved = await resolvePendingUrls(
          [
            data.thumbnail,
            ...productImages.map((img) => img.url),
            ...variants.flatMap((v) => [v.image, ...readVariantImages(v.images).map((e) => e.url)]),
          ],
          setUploadProgress
        )
      } catch (err: any) {
        // Nothing was created yet, so the staged files stay put and can be retried.
        setUploadError(err.response?.data?.error || err.message || "Failed to upload images.")
        setStep(1)
        Swal.fire({ text: "Image upload failed — the product was not saved. Please try again.", confirmButtonColor: "#18181b", icon: "error" })
        return
      } finally {
        setUploadProgress(null)
      }

      const thumbnail = applyResolved(data.thumbnail, resolved) as string

      const uploadedImages = productImages.map((img) => ({
        ...img,
        url: applyResolved(img.url, resolved) as string,
      }))

      const uploadedVariants = variants.map((v) => ({
        ...v,
        image: applyResolved(v.image, resolved),
        // Only the URL is swapped for its uploaded form; alt/caption survive.
        images: readVariantImages(v.images).map((entry) =>
          writeVariantImage({ ...entry, url: applyResolved(entry.url, resolved) ?? entry.url })
        ),
      }))

      // Double check that we have images
      const imagesToSend = uploadedImages.length > 0
        ? uploadedImages
        : [{ url: thumbnail, color: "" }]

      await api.post("/admin/products", {
        ...data,
        thumbnail,
        featured: data.featured || false,
        published: data.published ?? true,
        images: imagesToSend,
        variants: uploadedVariants,
        ...customMeasurement,
      })

      releaseResolved(resolved)
      reset()
      setVariants([])
      setProductImages([])
      setCustomMeasurement(emptyCustomMeasurement)
      router.push("/admin/products")
      router.refresh()
    } catch (error: any) {
      console.log(error)
      Swal.fire({ text: error.response?.data?.message || "Failed to create product. Ensure your product title/slug is unique.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploadProgress(null)
      setSubmitting(false)
    }
  }

  // Every image the admin has picked but not yet sent to the server.
  const pendingImageCount = countPending([
    watch("thumbnail"),
    ...productImages.map((img) => img.url),
    ...variants.flatMap((v) => [v.image, ...readVariantImages(v.images).map((e) => e.url)]),
  ])

  const submitButton = (
    <button
      type="submit"
      disabled={submitting}
      className="bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 text-sm"
    >
      {submitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {uploadProgress
            ? `Uploading images ${uploadProgress.done} of ${uploadProgress.total}...`
            : "Saving Luxury Product to Catalog..."}
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          {pendingImageCount > 0
            ? `Upload ${pendingImageCount} Image${pendingImageCount > 1 ? "s" : ""} & Publish`
            : "Publish Product to Store"}
        </>
      )}
    </button>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <ProductFormStepper
        steps={STEPS}
        currentStep={step}
        maxStepReached={maxStepReached}
        onStepClick={handleStepClick}
        onBack={goBack}
        onNext={goNext}
        isLastStep={step === STEPS.length - 1}
        submitSlot={submitButton}
      >
        {/* STEP 1: Add Product Details */}
        <div className={step === 0 ? "block space-y-5" : "hidden"}>
          {/* TITLE */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Product Title
            </label>
            <input
              {...register("title", { required: true })}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Minimalist Trenchcoat"
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.title ? 'border-red-500' : 'border-zinc-200'}`}
            />
            {errors.title && <span className="text-red-500 text-xs font-semibold mt-1 block">Title is required</span>}
          </div>

          {/* PRODUCT CODE */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Product Code
            </label>
            <input
              {...register("productCode", { required: true })}
              onChange={(e) => handleProductCodeChange(e.target.value)}
              placeholder="e.g. TP-1001"
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.productCode ? 'border-red-500' : 'border-zinc-200'}`}
            />
            {errors.productCode ? (
              <span className="text-red-500 text-xs font-semibold mt-1 block">Product code is required</span>
            ) : (
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Unique per product. Two products may share a title — this is what tells them apart, and the URL slug is
                built from it.
              </span>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Product Narrative Description
            </label>
            <div className="prose-sm max-w-none">
              <RichTextEditor
                initialContent={watch("description") || ""}
                onChange={(html) => setValue("description", html)}
              />
            </div>
          </div>
        </div>

        {/* STEP 2: Product gallery */}
        <div className={step === 1 ? "block space-y-5" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* THUMBNAIL */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Main Thumbnail Image (Max 800KB)
              </label>
              <div className="flex gap-4 items-center">
                {watch("thumbnail") ? (
                  <div className="relative w-16 h-16 rounded-xl border border-zinc-200 overflow-hidden shadow-sm shrink-0">
                    <img src={watch("thumbnail")} alt="Thumbnail" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => clearSingleImage("thumbnail")} className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-lg shadow transition backdrop-blur-sm cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-zinc-600 shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}

                <input type="hidden" {...register("thumbnail", { required: true })} />

                <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl cursor-pointer text-xs shadow-sm transition whitespace-nowrap">
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => selectSingleImage(e, "thumbnail", 800 * 1024, "Thumbnail")}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* SIZE CHART */}
            {/* A picker, not an upload: charts are written once in
                Admin → Size Charts and shared, so the same table no longer has
                to be re-exported as an image for every product that needs it. */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Size Chart
              </label>
              <select
                {...register("sizeChartId")}
                className="w-full border border-zinc-200 rounded-xl px-3 py-3 text-xs font-medium text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary transition"
              >
                <option value="">No size chart</option>
                {sizeCharts.map((chart) => (
                  <option key={chart.id} value={chart.id}>{chart.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1.5">
                {sizeCharts.length === 0
                  ? "None created yet — add one under Size Charts in the sidebar."
                  : "Shown in the size guide on the product page."}
              </p>
            </div>
          </div>

          {/* GALLERY Zone */}
          <div className="border-t border-zinc-100 pt-6 space-y-5">
            <div className="w-full">
              {/* FILE UPLOAD DROPZONE */}
              <div className="relative group border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-2xl bg-white p-6 transition flex flex-col items-center justify-center text-center min-h-[160px] cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-3 bg-zinc-50 rounded-2xl group-hover:scale-110 transition duration-300 shadow-sm border border-zinc-100">
                    <UploadCloud className="w-6 h-6 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-zinc-900 text-sm font-semibold">Drag & drop images here (Max 2MB each)</p>
                    <p className="text-zinc-600 text-xs mt-1 font-semibold">Click anywhere in this box to browse — files upload when you save</p>
                  </div>
                </div>
              </div>
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="font-semibold">{uploadError}</p>
              </div>
            )}

            {/* IMAGES GRID LIST */}
            {/* Sized by minimum card width rather than a fixed column count:
                each tile carries an alt-text and caption input, and a third of
                a narrow container left them about 40px wide. Columns are added
                only once there is room for a usable one. */}
            {productImages.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 pt-3">
                {productImages.map((img, idx) => {
                  return (
                    <div key={idx} className="group relative border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow transition flex gap-3 p-3">
                      <div className="w-20 h-20 shrink-0 relative overflow-hidden rounded-xl bg-zinc-100">
                        <img src={img.url} alt="Product Gallery" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        {isPendingUrl(img.url) && (
                          <span className="absolute bottom-1 left-1 bg-amber-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            Not saved
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {img.color && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">{img.color}</p>
                        )}
                        <input
                          type="text"
                          value={img.alt || ""}
                          onChange={(e) => updateProductImageMeta(idx, "alt", e.target.value)}
                          placeholder="Alt text (auto if blank)"
                          maxLength={125}
                          className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary transition"
                        />
                        <input
                          type="text"
                          value={img.caption || ""}
                          onChange={(e) => updateProductImageMeta(idx, "caption", e.target.value)}
                          placeholder="Caption (optional)"
                          maxLength={160}
                          className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary transition"
                        />
                      </div>

                      {/* In the flex row rather than absolutely positioned: floating
                          it meant reserving padding on the inputs for something that
                          overlapped them anyway. */}
                      <button
                        type="button"
                        onClick={() => removeProductImage(idx)}
                        aria-label="Remove image"
                        className="shrink-0 self-start p-1.5 bg-white hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-lg border border-zinc-200 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50/50 border border-dashed border-zinc-200 text-center text-zinc-600 text-xs font-medium flex items-center justify-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                No additional gallery images uploaded. Choose a color and drag files or paste a link above.
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: Product Categories */}
        <div className={step === 2 ? "block space-y-5" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CATEGORY */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Category Label
              </label>
              <select
                {...register("categoryId", { required: true })}
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary bg-white transition text-sm font-medium text-zinc-900 ${errors.categoryId ? 'border-red-500' : 'border-zinc-200'}`}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    <option value={cat.id} disabled>{cat.name}</option>
                    {cat.children?.map((subCat) => [
                      <option key={subCat.id} value={subCat.id} disabled>
                        — {subCat.name}
                      </option>,
                      ...(subCat.children?.map((deepCat) => (
                        <option key={deepCat.id} value={deepCat.id}>
                          —— {deepCat.name}
                        </option>
                      )) || [])
                    ])}
                  </optgroup>
                ))}
              </select>
              {errors.categoryId && <span className="text-red-500 text-xs font-semibold mt-1 block">Category is required</span>}
            </div>

            {/* BRAND */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Brand Label (Optional)
              </label>
              <select
                {...register("brandId")}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary bg-white transition text-sm font-medium text-zinc-900"
              >
                <option value="">Select Brand (No Brand)</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STEP 4: Selling prices */}
        <div className={step === 3 ? "block space-y-5" : "hidden"}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* PRICE */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Base Selling Price ({baseCurrency.symbol})
              </label>
              <input
                type="number"
                step="0.01"
                {...register("basePrice", {
                  required: true,
                  valueAsNumber: true,
                })}
                placeholder="240.00"
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.basePrice ? 'border-red-500' : 'border-zinc-200'}`}
              />
              {errors.basePrice && <span className="text-red-500 text-xs font-semibold mt-1 block">Base Price is required</span>}
            </div>

            {/* COST PRICE */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Cost Price ({baseCurrency.symbol}) (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("costPrice", {
                  valueAsNumber: true,
                  validate: (val) => {
                    if (!val) return true;
                    const base = watch("basePrice");
                    if (base && val > base) return "Cost Price cannot exceed Base Price";
                    return true;
                  }
                })}
                placeholder="120.00"
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.costPrice ? 'border-red-500' : 'border-zinc-200'}`}
              />
              {errors.costPrice && <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.costPrice.message}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Discount Price ({baseCurrency.symbol}) (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                {...register("discountPrice", {
                  valueAsNumber: true,
                  validate: (val) => {
                    if (!val) return true;
                    const base = watch("basePrice");
                    // A "discount" at or above the base price would render as a
                    // strikethrough that reads as a price rise on the storefront.
                    if (base && val >= base) return "Discount Price must be below Base Price";
                    return true;
                  }
                })}
                placeholder="99.00"
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.discountPrice ? 'border-red-500' : 'border-zinc-200'}`}
              />
              {errors.discountPrice
                ? <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.discountPrice.message}</span>
                : <span className="text-[10px] text-zinc-400 mt-1 block">Leave empty for no sale. When set, the base price shows struck through.</span>}
            </div>

            {/* FLASH SALE END DATE */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Flash Sale End Date (Optional)
              </label>
              <input
                type="datetime-local"
                {...register("flashSaleEndDate")}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* FEATURED & PUBLISHED TOGGLES */}
          <div className="flex gap-6 items-center mt-4 pt-4 border-t border-zinc-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("featured")}
                className="w-4 h-4 text-primary border-zinc-300 rounded focus:ring-primary"
              />
              <span className="text-xs font-semibold text-zinc-700">Featured Product</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("published")}
                className="w-4 h-4 text-primary border-zinc-300 rounded focus:ring-primary"
              />
              <span className="text-xs font-semibold text-zinc-700">Published</span>
            </label>
          </div>

          <CustomMeasurementSection
            value={customMeasurement}
            onChange={(next) => setCustomMeasurement((prev) => ({ ...prev, ...next }))}
            basePrice={Number(watch("basePrice")) || 0}
          />
        </div>

        {/* STEP 5: Advance */}
        <div className={step === 4 ? "block space-y-5" : "hidden"}>
          {/* SLUG */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              SEO Slug URL
            </label>
            <input
              {...register("slug", { required: true })}
              placeholder="e.g. minimalist-trenchcoat"
              className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400 ${errors.slug ? 'border-red-500' : 'border-zinc-200'}`}
            />
            {errors.slug && <span className="text-red-500 text-xs font-semibold mt-1 block">Slug is required</span>}
          </div>

          {/* SEO META FIELDS */}
          <div className="space-y-4 border-t border-b border-zinc-100 py-5 my-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                SEO Meta Title (Optional)
              </label>
              <input
                {...register("metaTitle")}
                placeholder="SEO Meta Title"
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                SEO Meta Description (Optional)
              </label>
              <textarea
                {...register("metaDescription")}
                placeholder="SEO Meta Description... (Write a detailed description here)"
                rows={3}
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                SEO Meta Keywords (Optional, comma-separated)
              </label>
              <input
                {...register("metaKeywords")}
                placeholder="e.g. trenchcoat, luxury, mens, fashion"
                className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* PRODUCT TAGS */}
          <div className="pb-5 mb-5 border-b border-zinc-100">
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Product Tags (Optional, comma-separated)
            </label>
            <input
              {...register("tags")}
              placeholder="e.g. summer, trending, cotton, minimal"
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
            />
          </div>

          {/* MODEL IS ALSO WEARING */}
          <div className="pb-5 mb-5 border-b border-zinc-100">
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Model is also wearing (Optional)
            </label>
            <p className="text-[11px] text-zinc-400 mb-2">
              The other item the model has on. Shown on the product page — left empty, the section is hidden.
            </p>
            <ModelWearsPicker
              value={watch("modelWearsProductId") || ""}
              onChange={(id) => setValue("modelWearsProductId", id)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Size & Fit Details (Optional)
            </label>
            <div className="prose-sm max-w-none">
              <RichTextEditor
                initialContent={watch("sizeAndFit") || ""}
                onChange={(html) => setValue("sizeAndFit", html)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
              Material & Care Instructions (Optional)
            </label>
            <div className="prose-sm max-w-none">
              <RichTextEditor
                initialContent={watch("fabricAndCare") || ""}
                onChange={(html) => setValue("fabricAndCare", html)}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-zinc-100 pt-5">
            <VariantForm onAdd={addVariant} existing={variants} defaultPrefix={watch("productCode") || ""} />

            {variants.length > 0 ? (
              <VariantTable
                variants={variants}
                // Feeds the suggested alt/caption on each variant photo.
                productTitle={watch("title")}
                brandName={brands.find((b) => b.id === watch("brandId"))?.name}
                onRemove={removeVariant}
                onUpdateSku={updateVariantSku}
                onUpdateImages={updateVariantImages}
              />
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50/50 border border-dashed border-zinc-200 text-center text-zinc-600 text-xs font-medium flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-600" />
                No sizes or color variants added yet. Please add variants above to save stock units.
              </div>
            )}
          </div>
        </div>
      </ProductFormStepper>
    </form>
  )
}
