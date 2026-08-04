import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { parseCustomMeasurementInput } from "@/lib/measurement"

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
      slug,
      description,
      sizeAndFit,
      fabricAndCare,
      thumbnail,
      sizeChart,
      basePrice,
      costPrice,
      categoryId,
      brandId,
      featured,
      flashSaleEndDate,
      images,
      variants,
      metaTitle,
      metaDescription,
      metaKeywords,
      tags,
    } = body

    if (!title || !slug || !description || !thumbnail || basePrice === undefined || !categoryId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
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
            url: typeof img === "string" ? img : img.url,
            color: typeof img === "string" ? null : img.color || null,
          }))
        });
      }

      // 2. Safe update for variants
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id }
      });
      
      const newVariantSkus = (variants || []).map((v: any) => v.sku).filter(Boolean);
      
      const variantsToDelete = existingVariants.filter(ev => !newVariantSkus.includes(ev.sku));
      
      for (const vToDelete of variantsToDelete) {
        try {
           // Cleanup constraints if possible
           await tx.cartItem.deleteMany({ where: { variantId: vToDelete.id } });
           await tx.wishlistItem.deleteMany({ where: { variantId: vToDelete.id } });
           await tx.inventoryLog.deleteMany({ where: { variantId: vToDelete.id } });
           
           await tx.productVariant.delete({ where: { id: vToDelete.id } });
        } catch (e) {
           // If still constrained by OrderItems, just set stock to 0
           await tx.productVariant.update({ where: { id: vToDelete.id }, data: { stock: 0 } });
        }
      }
      
      for (const v of variants || []) {
        const sku = v.sku || `SKU-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const variantData = {
          size: v.size,
          color: v.color,
          length: v.length || null,
          stock: parseInt(v.stock.toString()),
          price: v.price ? parseFloat(v.price.toString()) : null,
          image: v.image || null,
          images: v.images || [],
        };
        
        const exists = existingVariants.find(ev => ev.sku === sku);
        if (exists) {
          await tx.productVariant.update({
            where: { id: exists.id },
            data: variantData
          });
        } else {
          await tx.productVariant.create({
            data: {
              ...variantData,
              productId: id,
              sku
            }
          });
        }
      }

      // 3. Update the base product details
      return await tx.product.update({
        where: { id },
        data: {
          title,
          slug,
          description,
          sizeAndFit: sizeAndFit || null,
          fabricAndCare: fabricAndCare || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          tags: tags || null,
          thumbnail,
          sizeChart: sizeChart || null,
          basePrice: parseFloat(basePrice.toString()),
          costPrice: costPrice ? parseFloat(costPrice.toString()) : null,
          categoryId,
          brandId: brandId || null,
          featured: featured ?? false,
          flashSaleEndDate: flashSaleEndDate ? new Date(flashSaleEndDate) : null,
          ...parseCustomMeasurementInput(body),
        },
        include: {
          images: true,
          variants: true,
        },
      })
    })

    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(product)
  } catch (error) {
    console.log("[PRODUCT_PUT]", error)
    return NextResponse.json(
      { message: "Something went wrong during update" },
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

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete the Product
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date() }
      })

      // 2. Soft delete all variants of this product
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { deletedAt: new Date() }
      })

      // 3. Find variant IDs to clean up active user sessions (carts/wishlists)
      const variants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true },
      })
      const variantIds = variants.map((v) => v.id)

      if (variantIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { variantId: { in: variantIds } },
        })
        await tx.wishlistItem.deleteMany({
          where: { variantId: { in: variantIds } },
        })
      }
    })

    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json({
      success: true,
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