import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatImageUrl } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    const products = await prisma.product.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { category: { name: { contains: q } } },
          { brand: { name: { contains: q } } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        basePrice: true,
        discountPrice: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
      take: 8, // Limit autocomplete to 8 items
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = products.map(product => ({
      ...product,
      thumbnail: formatImageUrl(product.thumbnail)
    }));

    return NextResponse.json({ products: formattedProducts }, { status: 200 });
  } catch (error) {
    console.error("[SEARCH_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
