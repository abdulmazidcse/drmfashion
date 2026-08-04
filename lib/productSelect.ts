import type { Prisma } from "@prisma/client"

/**
 * The exact shape `ProductCard` renders — nothing more.
 *
 * Storefront listings used to fetch products with `include: { category: true,
 * brand: true, variants: true, images: true }`. `include` returns every scalar
 * column, so each product in the RSC payload carried its full `description`,
 * `metaTitle` / `metaDescription` / `metaKeywords`, `sizeAndFit`,
 * `fabricAndCare`, `tags`, `sku`, `deletedAt`, `updatedAt` — and `costPrice`,
 * i.e. purchase cost, readable by anyone who opened view-source. Each variant
 * additionally carried its `images` JSON blob.
 *
 * Keep this in sync with the `Product` interface in `components/ProductCard.tsx`.
 * `variant.image` is here because `formatProductUrls` rewrites it.
 */
export const PRODUCT_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  thumbnail: true,
  basePrice: true,
  discountPrice: true,
  flashSaleEndDate: true,
  featured: true,
  brand: { select: { name: true } },
  category: { select: { name: true, slug: true } },
  variants: {
    select: {
      id: true,
      size: true,
      color: true,
      length: true,
      stock: true,
      price: true,
      image: true,
    },
  },
} satisfies Prisma.ProductSelect
