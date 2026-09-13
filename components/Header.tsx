import { prisma } from "@/lib/prisma";
import HeaderClient from "./HeaderClient";
import { fetchWithCache } from "@/lib/redis";
import { productNameSearchFilter } from "@/lib/search";

/**
 * The search terms the empty panel offers, in the order they are preferred.
 *
 * Written as a shopper would type them, not as the catalogue files them: a
 * category is a shelf ("Jeans+Denim", "Shirts + Blouses") and nobody searches
 * for a shelf. Every candidate is checked against the catalogue before it is
 * offered, so a term for stock the shop does not carry simply drops out rather
 * than opening on "no results" — which is what makes it safe to list more of
 * them here than the panel will ever show.
 */
const POPULAR_SEARCH_CANDIDATES = [
  "Dress Shirt",
  "Jeans",
  "Chinos",
  "Button Up Shirt",
  "Linen Shirt",
  "Wide-Leg Jeans",
  "Straight-Leg Jeans",
  "Tapered Pants",
  "Chambray Shirt",
  "Polo Shirt",
  "T-Shirt",
  "Shorts",
  "Joggers",
  "Denim Jacket",
];

/** How many of them the panel lists. */
const POPULAR_SEARCH_COUNT = 6;

export default async function Header({ transparent = false }: { transparent?: boolean }) {
  // `select`, not `include`: the header renders on every page, so its whole menu
  // tree is serialised into every RSC payload on the site. `include` shipped
  // `createdAt`/`updatedAt` for each of the three levels — dates HeaderClient
  // never reads, and the most verbose thing in the payload once encoded.
  const menuFields = { id: true, title: true, url: true, imageUrl: true } as const;

  const [menus, categoryImages, popularSearches] = await Promise.all([
    fetchWithCache("header:menus:v2", () =>
      prisma.menuItem.findMany({
        where: { parentId: null },
        orderBy: { position: 'asc' },
        select: {
          ...menuFields,
          children: {
            orderBy: { position: 'asc' },
            select: {
              ...menuFields,
              children: {
                orderBy: { position: 'asc' },
                select: menuFields
              }
            }
          }
        }
      }),
      600 // cache for 10 minutes
    ),
    // The mega menu's promo tile falls back to the category's own card image
    // when the menu item carries no picture of its own, so the header no longer
    // has to ship a stock photo for a category the admin already illustrated.
    fetchWithCache("header:category-images:v1", () =>
      prisma.category.findMany({
        where: { deletedAt: null, image: { not: null } },
        select: { slug: true, image: true }
      }),
      600
    ),
    // Suggestions for the empty search panel: the candidates above, minus the
    // ones nothing answers. `findFirst` rather than a count — existence is the
    // whole question — and the same name matcher the search itself uses, so a
    // term that survives here returns those products when tapped.
    fetchWithCache(
      "header:popular-searches:v2",
      async () => {
        const hits = await Promise.all(
          POPULAR_SEARCH_CANDIDATES.map((term) =>
            prisma.product.findFirst({
              where: {
                published: true,
                deletedAt: null,
                ...(productNameSearchFilter(term) ?? {}),
              },
              select: { id: true },
            })
          )
        );
        return POPULAR_SEARCH_CANDIDATES.filter((_, i) => hits[i] !== null).slice(
          0,
          POPULAR_SEARCH_COUNT
        );
      },
      600
    ),
  ]);

  const imageBySlug = new Map(categoryImages.map((c) => [c.slug, c.image]));

  // Menu urls are authored by hand, so both shapes are in the table:
  // `/category/men` and `/shop?category=men`.
  const slugFromUrl = (url?: string | null) => {
    if (!url) return null;
    const path = url.split("#")[0];
    const [pathname, query] = path.split("?");
    const direct = pathname.match(/\/category\/([^/]+)\/?$/);
    if (direct) return decodeURIComponent(direct[1]);
    const param = new URLSearchParams(query || "").get("category");
    return param || null;
  };

  const menusWithImages = menus.map((menu) => ({
    ...menu,
    categoryImage: imageBySlug.get(slugFromUrl(menu.url) ?? "") ?? null,
  }));

  return (
    <HeaderClient
      menus={menusWithImages as any}
      transparent={transparent}
      popularSearches={popularSearches}
    />
  );
}
