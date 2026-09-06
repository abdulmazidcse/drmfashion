import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPlainText } from "@/lib/googleFeed";

/**
 * Product export for the admin list's "Export CSV" button.
 *
 *   GET /api/admin/products/export            one row per product
 *   GET /api/admin/products/export?rows=variants  one row per variant
 *
 * The per-variant view is what stock and pricing work actually needs — the
 * product view can only ever say "4 variants, 12 in stock", which is no help
 * when you are trying to find which size ran out.
 *
 * Every field goes through `csvField`. The previous version quoted the title
 * and description but left the slug, category and brand bare, so a single
 * comma in a category name would have shifted every column after it.
 */

export const dynamic = "force-dynamic";

/**
 * One CSV field, quoted per RFC 4180.
 *
 * Always quoting is deliberate: it costs a few bytes and removes the entire
 * class of bug where a value nobody expected to contain a comma, quote or
 * newline silently splits a row.
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(fields: unknown[]): string {
  return fields.map(csvField).join(",");
}

/** Money as a plain decimal — no currency symbol, so spreadsheets read it as a number. */
function money(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : value.toFixed(2);
}

function isoDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export async function GET(req: NextRequest) {
  try {
    const perVariant = req.nextUrl.searchParams.get("rows") === "variants";

    const products = await prisma.product.findMany({
      // Soft-deleted products were being exported alongside live ones with
      // nothing to tell them apart.
      where: { deletedAt: null },
      select: {
        id: true,
        productCode: true,
        title: true,
        slug: true,
        description: true,
        basePrice: true,
        costPrice: true,
        discountPrice: true,
        published: true,
        featured: true,
        createdAt: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
        brand: { select: { name: true } },
        variants: {
          // Deleted variants were counted into TotalVariants and TotalStock,
          // overstating both.
          where: { deletedAt: null },
          select: { sku: true, size: true, color: true, length: true, stock: true, price: true },
          orderBy: { sku: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows: string[] = [];

    if (perVariant) {
      rows.push(csvRow([
        "Product Code", "Title", "Slug", "Category", "Brand",
        "SKU", "Color", "Size", "Length", "Stock",
        "Variant Price", "Base Price", "Discount Price", "Published",
      ]));

      for (const p of products) {
        const category = p.category
          ? [p.category.parent?.name, p.category.name].filter(Boolean).join(" > ")
          : "";
        for (const v of p.variants) {
          rows.push(csvRow([
            p.productCode || "",
            p.title,
            p.slug,
            category,
            p.brand?.name || "",
            v.sku,
            v.color || "",
            v.size || "",
            v.length || "",
            v.stock,
            money(v.price),
            money(p.basePrice),
            money(p.discountPrice),
            p.published ? "Yes" : "No",
          ]));
        }
      }
    } else {
      rows.push(csvRow([
        "Product Code", "Title", "Slug", "Description", "Category", "Brand",
        "Base Price", "Cost Price", "Discount Price",
        "Variants", "Total Stock", "Published", "Featured", "Created",
      ]));

      for (const p of products) {
        const category = p.category
          ? [p.category.parent?.name, p.category.name].filter(Boolean).join(" > ")
          : "";
        rows.push(csvRow([
          p.productCode || "",
          p.title,
          p.slug,
          // The description is rich text from the editor. It used to be written
          // out raw — "<p>Designed for men…</p>" — and cut to 100 characters
          // with an ellipsis appended whether or not anything had been cut.
          toPlainText(p.description),
          category,
          p.brand?.name || "",
          money(p.basePrice),
          money(p.costPrice),
          money(p.discountPrice),
          p.variants.length,
          p.variants.reduce((sum, v) => sum + v.stock, 0),
          p.published ? "Yes" : "No",
          p.featured ? "Yes" : "No",
          isoDate(p.createdAt),
        ]));
      }
    }

    // CRLF per RFC 4180, and a UTF-8 BOM so Excel does not read the file as
    // the local codepage — without it every non-ASCII character in a title
    // arrives as mojibake.
    const csv = "﻿" + rows.join("\r\n") + "\r\n";
    const filename = perVariant ? "products_variants.csv" : "products.csv";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[CSV_EXPORT_ERROR]", error);
    return new NextResponse("Error generating CSV", { status: 500 });
  }
}
