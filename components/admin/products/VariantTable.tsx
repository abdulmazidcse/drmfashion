"use client"

import { useMemo, useState } from "react"
import { formatImageUrl } from "@/lib/utils"
import {
  readVariantImages,
  variantImageAlt,
  variantImageCaption,
  type VariantImageEntry,
} from "@/lib/imageMeta"
import { Check, Images, Pencil, Trash2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { stagePendingFile } from "@/lib/pendingUploads"
import { compareVariantsForDisplay } from "@/lib/variants"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

type Variant = {
  size: string
  color: string
  length?: string
  stock: number
  sku: string
  image?: string
  /** Plain URLs, or `{ url, alt, caption }` once SEO copy has been written. */
  images: Array<string | VariantImageEntry>
}

type Props = {
  variants: Variant[]
  /** Used to build the suggested alt/caption — "Title in Colour, size M". */
  productTitle?: string
  brandName?: string
  onRemove: (index: number) => void
  onUpdateSku?: (index: number, newSku: string) => void
  /**
   * Replace one row's photos. `applyToColor` mirrors how variants are created —
   * one upload shared by every size of that colour — so the default keeps a
   * colour's rows in step instead of letting them drift apart silently.
   */
  onUpdateImages?: (
    index: number,
    images: Array<string | VariantImageEntry>,
    applyToColor: boolean,
    /**
     * Which photo is this colour's thumbnail. Omitted keeps the old rule (the
     * first image), so uploading and removing behave exactly as before; only
     * "Set thumb" passes it. Naming it beats reordering the array — moving the
     * chosen photo to the front left the badge sitting on slot one either way,
     * which read as "the button does nothing".
     */
    thumbnail?: string
  ) => void
}

/**
 * A variant's photos as one list. Rows saved before the gallery existed carry a
 * single `image` and an empty `images`, so that lone photo is folded in —
 * otherwise editing such a row would look like it had nothing to edit.
 */
function imagesOf(variant: Variant): VariantImageEntry[] {
  const entries = readVariantImages(variant.images)
  if (entries.length > 0) return entries
  return variant.image ? [{ url: variant.image, alt: null, caption: null }] : []
}

export default function VariantTable({ variants, productTitle, brandName, onRemove, onUpdateSku, onUpdateImages }: Props) {
  const [editing, setEditing] = useState<number | null>(null)
  const [applyToColor, setApplyToColor] = useState(true)

  /**
   * Rows are displayed by colour then size, but every callback here addresses a
   * variant by its position in the *prop* array — so the original index travels
   * with the row rather than being recomputed from the sorted order.
   */
  const rows = useMemo(
    () =>
      variants
        .map((variant, index) => ({ variant, index }))
        .sort((a, b) => compareVariantsForDisplay(a.variant, b.variant)),
    [variants]
  )

  const editingVariant = editing !== null ? variants[editing] : null
  const sameColorCount = editingVariant
    ? variants.filter((v) => v.color === editingVariant.color).length
    : 0

  /**
   * The alt/caption a photo gets when nothing has been written for it. Shown as
   * the input placeholder and filled in for real on upload, so the merchant can
   * see it, keep it, or replace it.
   */
  function suggestionFor(variantIndex: number, imageIndex: number, total: number) {
    const v = variants[variantIndex]
    const meta = {
      title: productTitle || "",
      brand: brandName,
      color: v?.color,
      size: v?.size,
      index: imageIndex,
      total,
    }
    return { alt: variantImageAlt(meta), caption: variantImageCaption(meta) }
  }

  /** Files are staged locally; the product form uploads them on submit. */
  function addFiles(index: number, files: FileList | null) {
    if (!files || files.length === 0 || !onUpdateImages) return
    const existing = imagesOf(variants[index])
    const staged = Array.from(files).map(stagePendingFile)
    const total = existing.length + staged.length

    // Newly added shots arrive with the generated copy already written in, so
    // an image never ships with an empty alt just because nobody typed one.
    const added = staged.map((url, i) => {
      const s = suggestionFor(index, existing.length + i, total)
      return { url, alt: s.alt, caption: s.caption }
    })

    onUpdateImages(index, [...existing, ...added], applyToColor)
  }

  function dropImage(index: number, imageIndex: number) {
    if (!onUpdateImages) return
    onUpdateImages(
      index,
      imagesOf(variants[index]).filter((_, i) => i !== imageIndex),
      applyToColor
    )
  }

  /** Write alt text or a caption onto one photo, leaving the rest untouched. */
  function updateImageMeta(index: number, imageIndex: number, field: "alt" | "caption", value: string) {
    if (!onUpdateImages) return
    const images = imagesOf(variants[index]).map((entry, i) =>
      i === imageIndex ? { ...entry, [field]: value } : entry
    )
    onUpdateImages(index, images, applyToColor, variants[index].image)
  }

  /** Rewrite one photo's copy from the product name, colour and size. */
  function autoFillMeta(index: number, imageIndex: number) {
    if (!onUpdateImages) return
    const images = imagesOf(variants[index])
    const s = suggestionFor(index, imageIndex, images.length)
    onUpdateImages(
      index,
      images.map((entry, i) => (i === imageIndex ? { ...entry, alt: s.alt, caption: s.caption } : entry)),
      applyToColor,
      variants[index].image
    )
  }

  /**
   * Promote one photo to be this colourway's thumbnail.
   *
   * The list is passed back untouched and the choice travels as its own
   * argument, so the merchant's ordering survives. The storefront then picks it
   * up for free: the product page leads its collage with `variant.image`, and
   * the card's colour swatch switches to it.
   */
  function makeThumbnail(index: number, imageIndex: number) {
    if (!onUpdateImages) return
    const images = imagesOf(variants[index])
    const chosen = images[imageIndex]
    if (!chosen) return
    // Same list, different thumbnail — the gallery keeps the order the merchant
    // arranged it in, and the badge visibly jumps to the photo they clicked.
    onUpdateImages(index, images, applyToColor, chosen.url)
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Size Scale</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Color Label</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Length Option</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Stock Volume</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">Images</TableHead>
              <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">SKU Code</TableHead>
              <TableHead className="text-center text-xs uppercase tracking-widest text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map(({ variant, index }) => (
              <TableRow key={index}>
                {/* SIZE */}
                <TableCell>
                  <Badge className="uppercase tracking-wider">
                    {variant.size}
                  </Badge>
                </TableCell>

                {/* COLOR */}
                <TableCell className="text-sm font-semibold text-foreground">
                  {variant.color}
                </TableCell>

                {/* LENGTH */}
                <TableCell>
                  {variant.length ? (
                    <Badge variant="outline">
                      {variant.length}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      Standard
                    </span>
                  )}
                </TableCell>

                {/* STOCK */}
                <TableCell className="font-mono text-sm font-bold text-foreground">
                  {variant.stock} units
                </TableCell>

                {/* IMAGE */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {imagesOf(variant).length > 0 ? (
                      <div className="flex -space-x-2">
                        {imagesOf(variant).slice(0, 3).map((img, i) => (
                          <img key={i} src={formatImageUrl(img.url)} alt={variant.sku} className="w-8 h-8 object-cover rounded-md border border-border shadow-sm" />
                        ))}
                        {imagesOf(variant).length > 3 && (
                          <div className="w-8 h-8 rounded-md border border-border bg-muted flex items-center justify-center text-[8px] font-bold z-10">
                            +{imagesOf(variant).length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">None</span>
                    )}

                    {onUpdateImages && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Change images"
                        onClick={() => setEditing(editing === index ? null : index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {editing === index ? <X size={13} /> : <Pencil size={13} />}
                      </Button>
                    )}
                  </div>
                </TableCell>

                {/* SKU */}
                <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                  {onUpdateSku ? (
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => onUpdateSku(index, e.target.value)}
                      className="w-36 border border-zinc-200 rounded-lg px-2.5 py-1 font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary bg-white uppercase text-zinc-900 shadow-sm"
                      placeholder="SKU Code"
                    />
                  ) : (
                    variant.sku
                  )}
                </TableCell>

                {/* REMOVE ACTION */}
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {/* IMAGE EDITOR — opens under the row being edited */}
            {editing !== null && editingVariant && onUpdateImages && (
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableCell colSpan={7} className="p-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground">
                        Images for{" "}
                        <span className="uppercase">
                          {editingVariant.color} · {editingVariant.size}
                          {editingVariant.length ? ` · ${editingVariant.length}` : ""}
                        </span>
                      </p>
                      {sameColorCount > 1 && (
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={applyToColor}
                            onChange={(e) => setApplyToColor(e.target.checked)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Apply to all {sameColorCount} {editingVariant.color} variants
                        </label>
                      )}
                    </div>

                    <div className="space-y-2">
                      {imagesOf(editingVariant).map((img, i) => {
                        // The saved thumbnail, falling back to the first photo
                        // for rows that predate the picker.
                        const thumbUrl = editingVariant.image || imagesOf(editingVariant)[0]?.url
                        const isThumb = thumbUrl === img.url
                        return (
                          <div key={img.url || i} className="flex items-start gap-3 rounded-lg border border-border p-2">
                            <div
                              className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                                isThumb ? "border-primary ring-1 ring-primary" : "border-border"
                              }`}
                            >
                              <img src={formatImageUrl(img.url)} alt="Variant" className="h-full w-full object-cover" />

                              {isThumb ? (
                                <span className="absolute inset-x-0 bottom-0 bg-primary/90 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                                  Thumb
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => makeThumbnail(editing, i)}
                                  title="Use as this colour's thumbnail"
                                  className="absolute inset-x-0 bottom-0 bg-foreground/80 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-background opacity-0 transition group-hover:opacity-100"
                                >
                                  Set thumb
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => dropImage(editing, i)}
                                title="Remove image"
                                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-destructive/90 text-white opacity-0 transition group-hover:opacity-100"
                              >
                                <X size={11} />
                              </button>
                            </div>

                            {/* Image SEO. Alt is what a screen reader and Google
                                Images read; caption is visible copy under the shot
                                in the gallery. Both optional — a blank alt falls
                                back to a generated one (lib/imageMeta.ts). */}
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Image SEO
                                </span>
                                <button
                                  type="button"
                                  onClick={() => autoFillMeta(editing, i)}
                                  title="Rebuild from product name, colour and size"
                                  className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground underline underline-offset-2 transition hover:text-foreground"
                                >
                                  Auto
                                </button>
                              </div>
                              <input
                                type="text"
                                value={img.alt ?? ""}
                                onChange={(e) => updateImageMeta(editing, i, "alt", e.target.value)}
                                placeholder={suggestionFor(editing, i, imagesOf(editingVariant).length).alt}
                                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none transition focus:border-primary"
                              />
                              <input
                                type="text"
                                value={img.caption ?? ""}
                                onChange={(e) => updateImageMeta(editing, i, "caption", e.target.value)}
                                placeholder={suggestionFor(editing, i, imagesOf(editingVariant).length).caption}
                                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none transition focus:border-primary"
                              />
                            </div>
                          </div>
                        )
                      })}

                      <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                        <Images className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Add photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            addFiles(editing, e.target.files)
                            e.target.value = ""
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="button" size="sm" onClick={() => setEditing(null)}>
                        <Check className="h-3.5 w-3.5" /> Done
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        New photos upload when you save the product. Hover a photo and hit <strong>Set thumb</strong> to
                        make it this colour&apos;s thumbnail — that shot leads the product gallery and replaces the card
                        image when a shopper picks the colour.
                      </span>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
