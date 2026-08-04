"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import api from "@/lib/axios"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, AlertCircle, Image as ImageIcon, Trash2, UploadCloud, Save, ArrowLeft, Plus, FileText, Tag, DollarSign, Layers } from "lucide-react"
import Link from "next/link"

import VariantForm from "./VariantForm"
import VariantTable from "./VariantTable"
import ProductFormStepper, { type ProductFormStepDef } from "./ProductFormStepper"
import CustomMeasurementSection, { type CustomMeasurementValue } from "./CustomMeasurementSection"
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

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-center text-xs text-zinc-600 border border-zinc-200 rounded-xl">Loading editor...</div>
})

type Props = {
  productId: string
}

type FormValues = {
  title: string
  slug: string
  categoryId: string
  brandId: string
  description: string
  thumbnail: string
  sizeChart?: string
  basePrice: number
  costPrice?: number
  flashSaleEndDate?: string
  featured?: boolean
  sizeAndFit?: string
  fabricAndCare?: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  tags?: string
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
}

const STEPS: ProductFormStepDef[] = [
  { id: "details", title: "Add Product Details", description: "Add Product name & details", icon: FileText },
  { id: "gallery", title: "Product gallery", description: "Thumbnail & Add Product gallery", icon: ImageIcon },
  { id: "categories", title: "Product Categories", description: "Add Product category & brand", icon: Tag },
  { id: "prices", title: "Selling prices", description: "Add Product basic price & sale", icon: DollarSign },
  { id: "advance", title: "Advance", description: "Add Meta details & Inventory", icon: Layers },
]

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["title"],
  1: ["thumbnail"],
  2: ["categoryId"],
  3: ["basePrice", "costPrice"],
  4: ["slug"],
}

export default function ProductEditForm({ productId }: Props) {
  const router = useRouter()
  const { baseCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      sizeAndFit: "",
      fabricAndCare: "",
    },
  })

  useEffect(() => {
    register("sizeAndFit")
    register("fabricAndCare")
  }, [register])

  const [categories, setCategories] = useState<{ id: string; name: string; children?: { id: string; name: string; children?: { id: string; name: string }[] }[] }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [dbColors, setDbColors] = useState<{ id: string; name: string; value: string }[]>([])

  // MULTIPLE IMAGES STATE
  const [productImages, setProductImages] = useState<ProductImageInput[]>([])
  const [imageInputUrl, setImageInputUrl] = useState("")
  const [imageInputColor, setImageInputColor] = useState("")

  // VARIANT STATE
  const [variants, setVariants] = useState<Variant[]>([])

  const [customMeasurement, setCustomMeasurement] = useState<CustomMeasurementValue>({
    customMeasurementEnabled: false,
    measurementTemplateId: "",
    customSurchargeType: "",
    customSurchargeValue: "",
  })

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch auxiliary dropdown elements
        const catRes = await api.get("/admin/categories")
        setCategories(catRes.data)
        const brandRes = await api.get("/admin/brands")
        setBrands(brandRes.data)
        const colorRes = await api.get("/admin/colors")
        setDbColors(colorRes.data)

        // 2. Fetch the target product
        const prodRes = await api.get(`/admin/products/${productId}`)
        const product = prodRes.data

        // 3. Prepopulate FormValues
        reset({
          title: product.title,
          slug: product.slug,
          categoryId: product.categoryId,
          brandId: product.brandId || "",
          description: product.description,
          thumbnail: product.thumbnail,
          sizeChart: product.sizeChart || "",
          basePrice: product.basePrice,
          costPrice: product.costPrice || undefined,
          flashSaleEndDate: product.flashSaleEndDate ? new Date(product.flashSaleEndDate).toISOString().slice(0, 16) : "",
          sizeAndFit: product.sizeAndFit || "",
          fabricAndCare: product.fabricAndCare || "",
          metaTitle: product.metaTitle || "",
          metaDescription: product.metaDescription || "",
          metaKeywords: product.metaKeywords || "",
          tags: product.tags || "",
        })

        // 3b. Prepopulate made-to-measure settings
        setCustomMeasurement({
          customMeasurementEnabled: Boolean(product.customMeasurementEnabled),
          measurementTemplateId: product.measurementTemplateId || "",
          customSurchargeType: product.customSurchargeType || "",
          customSurchargeValue: product.customSurchargeValue ?? "",
        })

        // 4. Prepopulate image list
        if (product.images) {
          setProductImages(
            product.images.map((img: any) => ({
              url: img.url,
              color: img.color || "",
            }))
          )
        }

        // 5. Prepopulate variants list
        if (product.variants) {
          setVariants(
            product.variants.map((v: any) => ({
              size: v.size,
              color: v.color,
              length: v.length || undefined,
              stock: v.stock,
              sku: v.sku,
              image: v.image || undefined,
              images: v.images || [],
            }))
          )
        }

        // Existing record is already complete — unlock every step upfront
        setMaxStepReached(STEPS.length - 1)
      } catch (err) {
        console.error("Failed to load edit details:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [productId, reset])

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

  // AUTOMATED SLUG GENERATION
  function handleTitleChange(title: string) {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
    setValue("slug", slug)
  }

  // FILE UPLOAD STATES
  const [uploadError, setUploadError] = useState("")
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

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
      newImages.push({ url: stagePendingFile(files[i]), color: "" })
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
    field: "thumbnail" | "sizeChart",
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
  function clearSingleImage(field: "thumbnail" | "sizeChart") {
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

  // REMOVE IMAGE
  function removeProductImage(index: number) {
    setProductImages((prev) => {
      const url = prev[index]?.url
      const remaining = prev.filter((_, i) => i !== index)

      const stillUsed =
        watch("thumbnail") === url ||
        watch("sizeChart") === url ||
        remaining.some((img) => img.url === url) ||
        variants.some((v) => v.image === url || (Array.isArray(v.images) && v.images.includes(url)))

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

      // Newly picked files go up now; images already saved on this product are
      // plain URLs and pass straight through.
      let resolved: Map<string, string>
      try {
        resolved = await resolvePendingUrls(
          [
            data.thumbnail,
            data.sizeChart,
            ...productImages.map((img) => img.url),
            ...variants.flatMap((v) => [v.image, ...(Array.isArray(v.images) ? v.images : [])]),
          ],
          setUploadProgress
        )
      } catch (err: any) {
        // Nothing was saved yet, so the staged files stay put and can be retried.
        setUploadError(err.response?.data?.error || err.message || "Failed to upload images.")
        setStep(1)
        Swal.fire({ text: "Image upload failed — the product was not saved. Please try again.", confirmButtonColor: "#18181b", icon: "error" })
        return
      } finally {
        setUploadProgress(null)
      }

      const thumbnail = applyResolved(data.thumbnail, resolved) as string
      const sizeChart = applyResolved(data.sizeChart, resolved)

      const uploadedImages = productImages.map((img) => ({
        ...img,
        url: applyResolved(img.url, resolved) as string,
      }))

      const uploadedVariants = variants.map((v) => ({
        ...v,
        image: applyResolved(v.image, resolved),
        images: Array.isArray(v.images)
          ? v.images.map((url: string) => applyResolved(url, resolved))
          : v.images,
      }))

      const imagesToSend = uploadedImages.length > 0
        ? uploadedImages
        : [{ url: thumbnail, color: "" }]

      await api.put(`/admin/products/${productId}`, {
        ...data,
        thumbnail,
        sizeChart,
        featured: data.featured || false,
        images: imagesToSend,
        variants: uploadedVariants,
        ...customMeasurement,
      })

      releaseResolved(resolved)
      router.push("/admin/products")
      router.refresh()
    } catch (error: any) {
      console.log(error)
      Swal.fire({ text: error.response?.data?.message || "Failed to update product. Ensure the product slug/title remains unique.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUploadProgress(null)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border border-zinc-100">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <span className="text-zinc-500 font-bold uppercase tracking-wider text-xs">Loading Catalog Spec sheets...</span>
      </div>
    )
  }

  // Every image the admin has picked but not yet sent to the server.
  const pendingImageCount = countPending([
    watch("thumbnail"),
    watch("sizeChart"),
    ...productImages.map((img) => img.url),
    ...variants.flatMap((v) => [v.image, ...(Array.isArray(v.images) ? v.images : [])]),
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
            : "Saving Luxury Modifications to Catalog..."}
        </>
      ) : (
        <>
          <Save className="w-4 h-4" />
          {pendingImageCount > 0
            ? `Upload ${pendingImageCount} Image${pendingImageCount > 1 ? "s" : ""} & Save`
            : "Save Product Changes"}
        </>
      )}
    </button>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {/* BRAND CARD HEADER */}
      <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200/60 p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl">
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Editing: {watch("title")}</h2>
            <p className="text-sm font-medium text-zinc-400 tracking-widest mt-0.5">Edit specifications, stock levels, size chart & galleries.</p>
          </div>
        </div>

        <Link
          href="/admin/products"
          className="px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 transition text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <ArrowLeft size={12} />
          Back to List
        </Link>
      </div>

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
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                Size Chart Image (Max 800KB)
              </label>
              <div className="flex gap-4 items-center">
                {watch("sizeChart") ? (
                  <div className="relative w-16 h-16 rounded-xl border border-zinc-200 overflow-hidden shadow-sm shrink-0">
                    <img src={watch("sizeChart")} alt="Size Chart" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => clearSingleImage("sizeChart")} className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-lg shadow transition backdrop-blur-sm cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-zinc-600 shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}

                <input type="hidden" {...register("sizeChart")} />

                <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl cursor-pointer text-xs shadow-sm transition whitespace-nowrap">
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => selectSingleImage(e, "sizeChart", 800 * 1024, "Size chart")}
                    className="hidden"
                  />
                </label>
              </div>
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
            {productImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-3">
                {productImages.map((img, idx) => {
                  return (
                    <div key={idx} className="group relative border border-zinc-150 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow transition">
                      <div className="aspect-square relative overflow-hidden bg-zinc-100">
                        <img src={img.url} alt="Product Gallery" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        {isPendingUrl(img.url) && (
                          <span className="absolute bottom-1.5 left-1.5 bg-amber-500/90 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            Not saved
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeProductImage(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-zinc-500 hover:text-red-500 rounded-lg shadow-sm transition backdrop-blur-md opacity-0 group-hover:opacity-100"
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
              Fabric & Care Instructions (Optional)
            </label>
            <div className="prose-sm max-w-none">
              <RichTextEditor
                initialContent={watch("fabricAndCare") || ""}
                onChange={(html) => setValue("fabricAndCare", html)}
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-zinc-100 pt-5">
            <VariantForm onAdd={addVariant} existing={variants} />

            {variants.length > 0 ? (
              <VariantTable variants={variants} onRemove={removeVariant} onUpdateSku={updateVariantSku} />
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
