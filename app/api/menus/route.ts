import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function GET() {
  try {
    const menus = await prisma.menuItem.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      include: {
        children: {
          orderBy: { position: "asc" },
          include: {
            children: {
              orderBy: { position: "asc" },
            }
          }
        },
      },
    });
    return NextResponse.json(menus);
  } catch (error: any) {
    console.error("[MENUS_PUBLIC_GET]", error);
    return NextResponse.json(
      { message: "Something went wrong", error: error.message || String(error) },
      { status: 500 }
    );
  }
}
