import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateProductCaches } from "@/lib/productCache"

export const dynamic = "force-dynamic"

const TARGETS = [
  "images",
  "variants",
  "products",
  "categories",
  "brands",
  "colors",
  "sizes",
  "lengths",
  "measurements",
] as const
type Target = (typeof TARGETS)[number]

/**
 * A variant is untouchable once it appears in a financial or audit record.
 * These FKs are `Restrict` in the schema, so a hard delete would throw anyway —
 * matching on the relation lets us skip those rows and report them instead.
 *
 * Cart and wishlist rows are deliberately absent: they are session data, and
 * the single-product DELETE handler already clears them the same way.
 */
const HAS_HISTORY: Prisma.ProductVariantWhereInput = {
  OR: [
    { orderItems: { some: {} } },
    { inventoryLogs: { some: {} } },
    { purchaseItems: { some: {} } },
  ],
}

/** A product survives the purge if any single one of its variants has history. */
const PRODUCT_IS_FREE: Prisma.ProductWhereInput = { variants: { none: HAS_HISTORY } }

export async function POST(req: NextRequest) {
  // Guard: ensure request is from an authenticated admin
  let adminId: string
  try {
    const payload = await getAdminPayload(req)
    adminId = payload.userId as string
  } catch (err) {
    console.warn("[ADMIN_GUARD_DATA_PURGE]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const requested = Array.isArray(body?.targets) ? body.targets : []
  const targets = TARGETS.filter((t) => requested.includes(t))
  const password = typeof body?.password === "string" ? body.password : ""

  if (targets.length === 0) {
    return NextResponse.json({ message: "Select at least one thing to delete" }, { status: 400 })
  }

  // A valid admin cookie is not enough for an irreversible wipe — re-check the
  // password against the signed-in account, the same way the profile screen
  // does before a password change.
  if (!password) {
    return NextResponse.json({ message: "Password is required" }, { status: 400 })
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin?.password || !(await bcrypt.compare(password, admin.password))) {
    return NextResponse.json({ message: "Incorrect password" }, { status: 401 })
  }

  const want = (t: Target) => targets.includes(t)

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const before = {
          variants: await tx.productVariant.count(),
          products: await tx.product.count(),
          categories: await tx.category.count(),
          brands: await tx.brand.count(),
        }

        const deleted: Record<Target, number> = {
          images: 0,
          variants: 0,
          products: 0,
          categories: 0,
          brands: 0,
          colors: 0,
          sizes: 0,
          lengths: 0,
          measurements: 0,
        }

        if (want("images")) {
          deleted.images = (await tx.productImage.deleteMany({})).count
        }

        // Deleting a product takes its variants with it, so the variant sweep
        // runs whenever either box is ticked — only the scope differs. With
        // "variants" ticked every history-free variant goes; with only
        // "products" ticked we leave surviving products' variants alone.
        const variantScope: Prisma.ProductVariantWhereInput | null = want("variants")
          ? { NOT: HAS_HISTORY }
          : want("products")
            ? { product: PRODUCT_IS_FREE }
            : null

        if (variantScope) {
          const doomed = await tx.productVariant.findMany({
            where: variantScope,
            select: { id: true },
          })
          const ids = doomed.map((v) => v.id)

          if (ids.length > 0) {
            await tx.cartItem.deleteMany({ where: { variantId: { in: ids } } })
            await tx.wishlistItem.deleteMany({ where: { variantId: { in: ids } } })
            await tx.stockAlert.deleteMany({ where: { variantId: { in: ids } } })
            deleted.variants = (await tx.productVariant.deleteMany({ where: { id: { in: ids } } }))
              .count
          }
        }

        if (want("products")) {
          // After the sweep above, a product with no variants left is one
          // nothing is holding on to. Its reviews, questions and images are
          // meaningless without it, so they go too.
          const doomed = await tx.product.findMany({
            where: { variants: { none: {} } },
            select: { id: true },
          })
          const ids = doomed.map((p) => p.id)

          if (ids.length > 0) {
            deleted.images += (
              await tx.productImage.deleteMany({ where: { productId: { in: ids } } })
            ).count
            await tx.review.deleteMany({ where: { productId: { in: ids } } })
            await tx.productQuestion.deleteMany({ where: { productId: { in: ids } } })
            deleted.products = (await tx.product.deleteMany({ where: { id: { in: ids } } })).count
          }
        }

        // ─── Taxonomy ────────────────────────────────────────────────────────
        // Runs after the catalogue sweep on purpose: products holding a category
        // or brand are gone by now, which frees those rows for deletion.

        if (want("categories")) {
          // Categories nest, and both the product FK and the parent FK are
          // Restrict. Peel the tree leaf-first — each pass drops the categories
          // nothing points at any more, freeing their parents for the next.
          for (;;) {
            const { count } = await tx.category.deleteMany({
              where: { products: { none: {} }, children: { none: {} } },
            })
            if (count === 0) break
            deleted.categories += count
          }
        }

        if (want("brands")) {
          deleted.brands = (await tx.brand.deleteMany({ where: { products: { none: {} } } })).count
        }

        // Colour, size and length rows are pure lookup lists — variants store
        // their values as plain strings, with no foreign key back here — so
        // nothing can block them.
        if (want("colors")) deleted.colors = (await tx.color.deleteMany({})).count
        if (want("sizes")) deleted.sizes = (await tx.size.deleteMany({})).count
        if (want("lengths")) deleted.lengths = (await tx.length.deleteMany({})).count

        // Fields and their price tiers cascade; any product still pointing at a
        // template has its reference set to null by the schema's SetNull rule.
        if (want("measurements")) {
          deleted.measurements = (await tx.measurementTemplate.deleteMany({})).count
        }

        return {
          deleted,
          skipped: {
            variants: want("variants") ? before.variants - deleted.variants : 0,
            products: want("products") ? before.products - deleted.products : 0,
            categories: want("categories") ? before.categories - deleted.categories : 0,
            brands: want("brands") ? before.brands - deleted.brands : 0,
          },
        }
      },
      { timeout: 120_000, maxWait: 15_000 }
    )

    await invalidateProductCaches()
    revalidatePath("/", "layout")

    return NextResponse.json(result)
  } catch (error) {
    console.error("[DATA_PURGE_ERROR]", error)
    return NextResponse.json({ message: "Delete failed — nothing was removed." }, { status: 500 })
  }
}
