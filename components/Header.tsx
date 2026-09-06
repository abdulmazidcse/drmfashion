import { prisma } from "@/lib/prisma";
import HeaderClient from "./HeaderClient";
import { fetchWithCache } from "@/lib/redis";

export default async function Header({ transparent = false }: { transparent?: boolean }) {
  // `select`, not `include`: the header renders on every page, so its whole menu
  // tree is serialised into every RSC payload on the site. `include` shipped
  // `createdAt`/`updatedAt` for each of the three levels — dates HeaderClient
  // never reads, and the most verbose thing in the payload once encoded.
  const menuFields = { id: true, title: true, url: true, imageUrl: true } as const;

  const [menus, categoryImages] = await Promise.all([
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

  return <HeaderClient menus={menusWithImages as any} transparent={transparent} />;
}
