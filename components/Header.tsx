import { prisma } from "@/lib/prisma";
import HeaderClient from "./HeaderClient";
import { fetchWithCache } from "@/lib/redis";

export default async function Header() {
  // `select`, not `include`: the header renders on every page, so its whole menu
  // tree is serialised into every RSC payload on the site. `include` shipped
  // `createdAt`/`updatedAt` for each of the three levels — dates HeaderClient
  // never reads, and the most verbose thing in the payload once encoded.
  const menuFields = { id: true, title: true, url: true, imageUrl: true } as const;

  const menus = await fetchWithCache("header:menus:v2", () =>
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
  );

  return <HeaderClient menus={menus as any} />;
}
