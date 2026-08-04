"use client"

import { useState, useEffect } from "react"
import api from "@/lib/axios"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Gift } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function GiftCardForm() {
  const router = useRouter()
  const { baseCurrency } = useCurrency()
  const [submitting, setSubmitting] = useState(false)
  const [giftCardCategory, setGiftCardCategory] = useState<any>(null)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [thumbnail, setThumbnail] = useState("")
  const [description, setDescription] = useState("Give the gift of pure luxury and infinite style. The digital gift card is delivered instantly via email and can be redeemed across our entire fashion catalog.")
  const [sku, setSku] = useState("")

  useEffect(() => {
    async function loadCategory() {
      try {
        const catRes = await api.get("/admin/categories")
        const allCats = catRes.data
        const found = allCats.find((c: any) => c.slug === "gift-cards")
        setGiftCardCategory(found)
      } catch (err) {
        console.log(err)
      }
    }
    loadCategory()
  }, [])

  function handleTitleChange(val: string) {
    setTitle(val)
    const newSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
    setSlug(newSlug)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!giftCardCategory) {
      Swal.fire({ text: "Gift Cards category not found. Please create it first.", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)

      const imagesToSend = [{ url: thumbnail, color: "" }]
      const priceVal = parseFloat(basePrice)

      const variants = [{
        size: "One Size",
        color: "Gold",
        length: "",
        stock: 9999,
        sku: sku || `GC-${priceVal}`
      }]

      await api.post("/admin/products", {
        title,
        slug,
        categoryId: giftCardCategory.id,
        brandId: "",
        description,
        thumbnail,
        basePrice: priceVal,
        featured: true,
        images: imagesToSend,
        variants,
      })

      router.push("/admin/gift-cards")
      router.refresh()
    } catch (error: any) {
      console.log(error)
      Swal.fire({ text: error.response?.data?.message || "Failed to create gift card. Ensure the title/slug is unique.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Gift size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold tracking-tight">Gift Card Details</CardTitle>
            <CardDescription className="text-xs">Define denomination and presentation.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="gc-title">Card Title</Label>
              <Input
                id="gc-title"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. $500 Gift Card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gc-slug">URL Slug</Label>
              <Input
                id="gc-slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="gc-price">Card Value ({baseCurrency.symbol})</Label>
              <Input
                id="gc-price"
                required
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="500.00"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gc-sku">Card SKU (Optional)</Label>
              <Input
                id="gc-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. GC-500"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gc-thumbnail">Card Image URL</Label>
            <Input
              id="gc-thumbnail"
              required
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="e.g. https://images.unsplash.com/photo-..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gc-description">Card Description</Label>
            <Textarea
              id="gc-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-24 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        size="lg"
        disabled={submitting || !giftCardCategory}
        className="w-full"
      >
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Issuing Card...</>
        ) : (
          <><Plus className="w-5 h-5" /> Publish Gift Card</>
        )}
      </Button>
    </form>
  )
}
