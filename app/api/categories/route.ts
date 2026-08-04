import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";

export const revalidate = 300;

export async function GET() {
  try {
    const CACHE_KEY = "api:categories"
    const cached = await getCache(CACHE_KEY)
    if (cached) return NextResponse.json(cached)

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    await setCache(CACHE_KEY, categories, 3600) // 1 hour cache
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("[CATEGORIES_PUBLIC_GET]", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
