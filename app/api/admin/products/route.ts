import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { parseCustomMeasurementInput } from "@/lib/measurement"

export async function POST(
  req: NextRequest
) {
  // Guard: ensure request is from an authenticated admin
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_POST]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
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

    const product =
      await prisma.product.create({
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
          basePrice,
          costPrice: costPrice || null,
          categoryId,
          brandId: brandId || null,
          featured,
          flashSaleEndDate: flashSaleEndDate ? new Date(flashSaleEndDate) : null,
          ...parseCustomMeasurementInput(body),

          images: {
            create: images
              .filter(Boolean)
              .map((img: any) => {
                if (typeof img === "string") {
                  return {
                    url: img,
                    color: null,
                  }
                }
                return {
                  url: img.url,
                  color: img.color || null,
                }
              }),
          },

          variants: {
            create: variants,
          },
        },

        include: {
          images: true,
          variants: true,
          brand: true,
          category: true,
        },
      })

    revalidatePath("/")
    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(
      product
    )
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      {
        message:
          "Something went wrong",
      },
      {
        status: 500,
      }
    )
  }
}

/**
 * A category id plus every id beneath it. Nesting is capped at three levels
 * (see the categories route), so this settles in at most three round trips;
 * the `seen` guard keeps a bad parent link from looping forever.
 */
async function collectCategoryTree(rootId: string): Promise<string[]> {
  const seen = new Set([rootId])
  let frontier = [rootId]

  while (frontier.length > 0) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    })

    frontier = children.map((c) => c.id).filter((id) => !seen.has(id))
    frontier.forEach((id) => seen.add(id))
  }

  return Array.from(seen)
}

export async function GET(req: NextRequest) {
  // Guard: admin-only listing
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn('[ADMIN_GUARD_GET]', err.message)
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const categoryId = searchParams.get("categoryId") || "ALL"
    const categorySlug = searchParams.get("categorySlug") || ""
    // Callers that don't render a full product card can ask for a narrower
    // shape. The image/brand joins dominate the payload, so skipping them is
    // worth far more than the row count: at 50 products the full shape is
    // 169 KB / 171 ms, the inventory shape 121 KB / 12 ms, the picker 5 KB.
    const view = searchParams.get("view") || (searchParams.get("slim") === "1" ? "picker" : "full")

    const skip = (page - 1) * limit

    const whereClause: any = {
      deletedAt: null
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { variants: { some: { sku: { contains: search, mode: "insensitive" } } } }
      ]
    }
    const brandId = searchParams.get("brandId") || "ALL"
    if (brandId && brandId !== "ALL") {
      whereClause.brandId = brandId
    }

    // Products are filed against a leaf category, so filtering by a parent has
    // to match the whole subtree — otherwise picking "Woman" returns nothing.
    let categoryIds: string[] | null = null

    if (categorySlug) {
      const root = await prisma.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      })
      categoryIds = root ? await collectCategoryTree(root.id) : []
    } else if (categoryId && categoryId !== "ALL") {
      categoryIds = await collectCategoryTree(categoryId)
    }

    if (categoryIds) {
      whereClause.categoryId = { in: categoryIds }
    } else {
      // Exclude gift cards from the general products list
      whereClause.category = { slug: { not: "gift-cards" } }
    }

    // Kept as separate calls rather than a spread: Prisma's overloads reject a
    // `select | include` union, since each shape returns a different row type.
    const listArgs = {
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" as const },
    }

    const listQuery =
      view === "picker"
        ? prisma.product.findMany({
            ...listArgs,
            select: { id: true, title: true, thumbnail: true },
          })
        : view === "inventory"
          ? prisma.product.findMany({
              ...listArgs,
              select: {
                id: true,
                title: true,
                thumbnail: true,
                basePrice: true,
                category: { select: { id: true, name: true, slug: true } },
                variants: true,
              },
            })
          : prisma.product.findMany({
              ...listArgs,
              include: {
                images: true,
                variants: true,
                brand: true,
                category: true,
              },
            })

    const [products, total] = await Promise.all([
      listQuery,
      prisma.product.count({ where: whereClause })
    ])

    return NextResponse.json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.log(error)

    return NextResponse.json(
      {
        message:
          "Something went wrong",
      },
      {
        status: 500,
      }
    )
  }
}