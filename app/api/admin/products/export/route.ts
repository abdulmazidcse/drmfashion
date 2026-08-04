import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const csvRows = [];
    // Header
    csvRows.push([
      "ID",
      "Title",
      "Slug",
      "Description",
      "BasePrice",
      "Category",
      "Brand",
      "TotalVariants",
      "TotalStock",
      "Published",
    ].join(","));

    // Data
    for (const p of products) {
      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      const row = [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        p.slug,
        `"${p.description.replace(/"/g, '""').substring(0, 100)}..."`,
        p.basePrice,
        p.category?.name || "",
        p.brand?.name || "",
        p.variants.length,
        totalStock,
        p.published ? "Yes" : "No",
      ];
      csvRows.push(row.join(","));
    }

    const csvString = csvRows.join("\n");

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products_export.csv"',
      },
    });
  } catch (error) {
    console.error("[CSV_EXPORT_ERROR]", error);
    return new NextResponse("Error generating CSV", { status: 500 });
  }
}
