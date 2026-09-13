import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatImageUrl } from "@/lib/utils";
import {
  productSearchFilter,
  productNameSearchFilter,
  matchedColorway,
  searchResultColor,
  MIN_SEARCH_LENGTH,
} from "@/lib/search";

/** How many products the header's suggestion panel previews — two even rows
 *  of four on a wide screen. */
const PREVIEW_LIMIT = 8;

const PREVIEW_SELECT = {
  id: true,
  title: true,
  slug: true,
  thumbnail: true,
  basePrice: true,
  discountPrice: true,
  category: { select: { name: true } },
  brand: { select: { name: true } },
  // Enough of each colourway to name the one the shopper asked for and show
  // its photograph instead of the product's default thumbnail.
  variants: {
    where: { deletedAt: null },
    select: { color: true, image: true },
  },
} as const;

// Featured first so the panel leads with what the shop wants seen; the date is
// the tie-break the previous version ordered by alone.
const PREVIEW_ORDER = [{ featured: "desc" as const }, { createdAt: "desc" as const }];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const broad = q.length >= MIN_SEARCH_LENGTH ? productSearchFilter(q) : undefined;
    if (!broad) {
      return NextResponse.json({ products: [], total: 0 }, { status: 200 });
    }
    const byName = productNameSearchFilter(q);

    const published = { published: true, deletedAt: null };
    const broadWhere = { ...published, ...broad };

    // Two tiers, so the panel opens with the garments actually called this and
    // only then falls back to ones that merely mention the words. `total`
    // counts the wide set, because that is what "View All Results" navigates to.
    const [named, total] = await Promise.all([
      prisma.product.findMany({
        where: { ...published, ...byName },
        select: PREVIEW_SELECT,
        take: PREVIEW_LIMIT,
        orderBy: PREVIEW_ORDER,
      }),
      prisma.product.count({ where: broadWhere }),
    ]);

    let products = named;
    if (products.length < PREVIEW_LIMIT) {
      const rest = await prisma.product.findMany({
        where: { ...broadWhere, id: { notIn: named.map((p) => p.id) } },
        select: PREVIEW_SELECT,
        take: PREVIEW_LIMIT - products.length,
        orderBy: PREVIEW_ORDER,
      });
      products = [...products, ...rest];
    }

    // Every card is labelled with a colour — the one the query named where it
    // named one, the product's first otherwise. A named colour additionally
    // decides the picture: the card shows that colourway's shot rather than the
    // default thumbnail, which may well be a different colour from the one that
    // was asked for. `variants` itself is dropped — the panel only ever needed
    // the colour and the image.
    const formattedProducts = products.map(({ variants, ...product }) => {
      const colorway = matchedColorway(q, variants);
      const image = colorway?.image?.trim() || product.thumbnail;

      return {
        ...product,
        thumbnail: formatImageUrl(image),
        matchedColor: searchResultColor(q, variants),
      };
    });

    return NextResponse.json({ products: formattedProducts, total }, { status: 200 });
  } catch (error) {
    console.error("[SEARCH_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
