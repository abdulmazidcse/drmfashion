import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatProductUrls } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category") || undefined;
    const sort = searchParams.get("sort") || "newest";
    const query = searchParams.get("query") || searchParams.get("q") || "";
    const size = searchParams.get("size") || undefined;
    const color = searchParams.get("color") || undefined;
    const sale = searchParams.get("sale") || undefined;
    
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Resolve category hierarchy
    let categoryIds: string[] | undefined = undefined;
    if (categorySlug) {
      const activeCategory = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: { children: { include: { children: true } } },
      });
      if (activeCategory) {
        categoryIds = [activeCategory.id];
        activeCategory.children.forEach((c) => {
          categoryIds!.push(c.id);
          if (c.children) {
            c.children.forEach((gc) => categoryIds!.push(gc.id));
          }
        });
      }
    }

    // Sort options
    const orderBy =
      sort === "price-asc"
        ? { basePrice: "asc" as const }
        : sort === "price-desc"
        ? { basePrice: "desc" as const }
        : sort === "bestseller"
        ? { reviews: { _count: "desc" as const } }
        : sort === "featured"
        ? { featured: "desc" as const }
        : { createdAt: "desc" as const };

    // Where conditions
    const whereClause: any = {
      published: true,
      deletedAt: null,
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(size || color
        ? {
            variants: {
              some: {
                ...(size ? { size: size } : {}),
                ...(color ? { color: color } : {}),
              },
            },
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            basePrice: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
      ...(sale === "true" ? { discountPrice: { not: null } } : {}),
    };

    // Execute queries
    const [total, products] = await Promise.all([
      prisma.product.count({ where: whereClause }),
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          brand: true,
          variants: true,
          images: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    // Format relative image paths to absolute URLs for the Mobile App
    const formattedProducts = products.map(product => formatProductUrls(product));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error("[PRODUCTS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products: " + (error.message || error.toString()) },
      { status: 500 }
    );
  }
}
