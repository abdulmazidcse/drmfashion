import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAdminPayload } from "@/lib/auth"
import { parseCustomMeasurementInput } from "@/lib/measurement"
import { normalizeProductCode } from "@/lib/productCode"
import { invalidateProductCaches } from "@/lib/productCache"
import { readVariantImages, writeVariantImage } from "@/lib/imageMeta"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  // Guard: admin-only (defense-in-depth)
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_PRODUCT_GET]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        images: true,
        variants: true,
        modelWearsProduct: { select: { id: true, title: true, thumbnail: true } },
      },
    })

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.log("[PRODUCT_GET]", error)
    return NextResponse.json(
      { message: "Failed to fetch product details" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  // Guard
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_PRODUCT_PUT]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const {
      title,
      productCode,
      slug,
      description,
      sizeAndFit,
      fabricAndCare,
      thumbnail,
      sizeChartId,
      basePrice,
      costPrice,
      discountPrice,
      categoryId,
      brandId,
      featured,
      published,
      flashSaleEndDate,
      images,
      variants,
      metaTitle,
      metaDescription,
      metaKeywords,
      tags,
      modelWearsProductId,
    } = body

    if (!title || !slug || !description || !thumbnail || basePrice === undefined || !categoryId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Deleting a product only sets deletedAt — the row, and its code, stay. The
    // unique index covers those rows too, so they are checked here as well;
    // otherwise the clash surfaces as an unexplained 500 from Postgres.
    const code = normalizeProductCode(productCode)
    if (code) {
      const clash = await prisma.product.findFirst({
        where: {
          productCode: { equals: code, mode: "insensitive" },
          NOT: { id },
        },
        select: { title: true, deletedAt: true },
      })
      if (clash) {
        return NextResponse.json(
          {
            message: clash.deletedAt
              ? `Product code "${code}" still belongs to the deleted product "${clash.title}". Give this one a different code.`
              : `Product code "${code}" is already used by "${clash.title}".`,
          },
          { status: 400 }
        )
      }
    }

    // Run atomic transaction to update product details and recreate images/variants
    const product = await prisma.$transaction(async (tx) => {
      // 1. Safe update for images: delete existing and recreate (images don't have constraints)
      await tx.productImage.deleteMany({
        where: { productId: id },
      })

      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img: any) => ({
            productId: id,
            // Stored exactly as uploaded, matching the create route. Stripping
            // this to a bare file name used to break the image on every edit:
            // uploads land in the bucket root, but a bare name is resolved
            // against <bucket>/products/ on read, which 404s.
            url: typeof img === "string" ? img : img.url,
            color: typeof img === "string" ? null : img.color || null,
            // Blank stays null rather than "": the storefront treats an empty
            // alt as "generate one" and an empty string would defeat that.
            alt: typeof img === "string" ? null : String(img.alt || "").trim() || null,
            caption: typeof img === "string" ? null : String(img.caption || "").trim() || null,
          }))
        });
      }

      // 2. Reconcile variants. Rows are matched first by SKU, then by their
      //    size/color/length combo — so editing a row's SKU updates that row in
      //    place. Treating a renamed SKU as "delete old + create new" (the old
      //    behaviour) loses the variant id and simply fails when order history
      //    pins the row.
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id }
      });

      const claimed = new Set<string>();
      const incoming = (variants || []).map((v: any) => {
        const sku = v.sku || `SKU-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        // Soft-deleted rows are never matched: they exist only to keep order
        // history intact and must not be silently resurrected.
        const match =
          existingVariants.find(ev => !claimed.has(ev.id) && !ev.deletedAt && ev.sku === sku) ??
          existingVariants.find(
            ev =>
              !claimed.has(ev.id) &&
              !ev.deletedAt &&
              ev.size === v.size &&
              ev.color === v.color &&
              (ev.length || null) === (v.length || null)
          );
        if (match) claimed.add(match.id);
        return { v, sku, match };
      });

      // Rows no longer on the form. Order/purchase lines pin a variant row in
      // Postgres, so deletability is checked up front rather than attempted —
      // one failed statement aborts the whole transaction and would take every
      // other change down with it.
      const variantsToDelete = existingVariants.filter(ev => !claimed.has(ev.id) && !ev.deletedAt);

      for (const vToDelete of variantsToDelete) {
        const [orderLines, purchaseLines] = await Promise.all([
          tx.orderItem.count({ where: { variantId: vToDelete.id } }),
          tx.purchaseOrderItem.count({ where: { variantId: vToDelete.id } }),
        ]);

        // Live shopper state never blocks removal and is never worth keeping.
        await tx.cartItem.deleteMany({ where: { variantId: vToDelete.id } });
        await tx.wishlistItem.deleteMany({ where: { variantId: vToDelete.id } });

        if (orderLines > 0 || purchaseLines > 0) {
          // Pinned by history — keep the row but take it out of circulation.
          await tx.productVariant.update({ where: { id: vToDelete.id }, data: { stock: 0 } });
        } else {
          await tx.inventoryLog.deleteMany({ where: { variantId: vToDelete.id } });
          await tx.stockAlert.deleteMany({ where: { variantId: vToDelete.id } });
          await tx.productVariant.delete({ where: { id: vToDelete.id } });
        }
      }

      for (const { v, sku, match } of incoming) {
        const variantData = {
          sku,
          size: v.size,
          color: v.color,
          length: v.length || null,
          stock: parseInt(v.stock.toString()),
          price: v.price ? parseFloat(v.price.toString()) : null,
          image: v.image || null,
          // URLs pass through untouched, as on create; alt/caption ride along.
          // Cast because the column is Json: an entry is a string or an object
          // depending on whether copy was written, which Prisma's input type
          // cannot express as a union.
          images: readVariantImages(v.images).map(writeVariantImage) as Prisma.InputJsonValue,
        };

        if (match) {
          await tx.productVariant.update({
            where: { id: match.id },
            data: variantData
          });
        } else {
          await tx.productVariant.create({
            data: {
              ...variantData,
              productId: id
            }
          });
        }
      }

      // 3. Update the base product details
      return await tx.product.update({
        where: { id },
        data: {
          title,
          productCode: code,
          slug,
          description,
          sizeAndFit: sizeAndFit || null,
          fabricAndCare: fabricAndCare || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          tags: tags || null,
          thumbnail,
          sizeChartId: sizeChartId || null,
          basePrice: parseFloat(basePrice.toString()),
          costPrice: costPrice ? parseFloat(costPrice.toString()) : null,
          // Cleared back to null when emptied, so a sale can be ended by
          // blanking the field rather than needing a separate action.
          discountPrice:
            discountPrice === "" || discountPrice === undefined || discountPrice === null
              ? null
              : parseFloat(discountPrice.toString()),
          categoryId,
          brandId: brandId || null,
          featured: featured ?? false,
          published: published ?? true,
          flashSaleEndDate: flashSaleEndDate ? new Date(flashSaleEndDate) : null,
          // A product can't be the model's other item for itself.
          modelWearsProductId:
            modelWearsProductId && modelWearsProductId !== id ? modelWearsProductId : null,
          ...parseCustomMeasurementInput(body),
        },
        include: {
          images: true,
          variants: true,
        },
      })
    })

    // revalidatePath only clears Next's render cache; the home page's product
    // lists live in Redis for an hour and need their own purge.
    await invalidateProductCaches()
    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(product)
  } catch (error) {
    console.log("[PRODUCT_PUT]", error)
    // SKUs are unique across the whole catalogue — surface a clash as what it
    // is instead of a generic failure.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "A SKU on this product is already used by another variant. Make every SKU unique and save again." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Something went wrong during update" },
      { status: 500 }
    )
  }
}

// Quick status flip from the product list — unlike PUT this touches nothing
// but the published flag, so images/variants are left alone.
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  // Guard
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_PRODUCT_PATCH]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    if (typeof body.published !== "boolean") {
      return NextResponse.json(
        { message: "published must be a boolean" },
        { status: 400 }
      )
    }

    const product = await prisma.product.update({
      where: { id },
      data: { published: body.published },
      select: { id: true, published: true },
    })

    // revalidatePath only clears Next's render cache; the home page's product
    // lists live in Redis for an hour and need their own purge.
    await invalidateProductCaches()
    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(product)
  } catch (error) {
    console.log("[PRODUCT_PATCH]", error)
    return NextResponse.json(
      { message: "Failed to update product status" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  // Guard
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_PRODUCT_DELETE]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, variants: { select: { id: true, sku: true } } },
    })
    if (!product) {
      return NextResponse.json({ success: true })
    }

    const variantIds = product.variants.map((v) => v.id)

    // Order and purchase lines pin their variant rows — Postgres will not let
    // those be deleted, and they must survive for the order history to stay
    // intact. When any exist we cannot truly delete; we scrub the row instead.
    const [orderLines, purchaseLines] = await Promise.all([
      variantIds.length
        ? prisma.orderItem.count({ where: { variantId: { in: variantIds } } })
        : 0,
      variantIds.length
        ? prisma.purchaseOrderItem.count({ where: { variantId: { in: variantIds } } })
        : 0,
    ])
    const pinnedByHistory = orderLines > 0 || purchaseLines > 0

    await prisma.$transaction(async (tx) => {
      // Live shopper state never blocks a delete and is never worth keeping.
      if (variantIds.length > 0) {
        await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } })
        await tx.wishlistItem.deleteMany({ where: { variantId: { in: variantIds } } })
        await tx.stockAlert.deleteMany({ where: { variantId: { in: variantIds } } })
      }

      if (pinnedByHistory) {
        // Soft delete, but free the identifiers so the product code and every
        // SKU can be reused on a new product. The `#<id>` suffix keeps them
        // unique and still legible in an exported order.
        const now = new Date()
        await tx.product.update({
          where: { id },
          data: { deletedAt: now, productCode: null },
        })
        for (const v of product.variants) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { deletedAt: now, sku: `${v.sku}#${v.id.slice(-6)}` },
          })
        }
        return
      }

      // Nothing references it — really delete, rows and all.
      if (variantIds.length > 0) {
        await tx.inventoryLog.deleteMany({ where: { variantId: { in: variantIds } } })
        await tx.productVariant.deleteMany({ where: { productId: id } })
      }
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.review.deleteMany({ where: { productId: id } })
      await tx.productQuestion.deleteMany({ where: { productId: id } })
      await tx.product.delete({ where: { id } })
    })

    // revalidatePath only clears Next's render cache; the home page's product
    // lists live in Redis for an hour and need their own purge.
    await invalidateProductCaches()
    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json({
      success: true,
      hardDeleted: !pinnedByHistory,
      message: pinnedByHistory
        ? "Product has order history, so its records were kept — but it is hidden and its code and SKUs are now free to reuse."
        : "Product permanently deleted.",
    })
  } catch (error) {
    console.log("[PRODUCT_DELETE_ERROR]", error)

    return NextResponse.json(
      {
        message: "Delete failed due to active constraints or database issue.",
      },
      {
        status: 500,
      }
    )
  }
}