import { prisma } from "@/lib/prisma"

/**
 * A gender landing page's root category (`men` / `women`) plus every category
 * id beneath it.
 *
 * The /men and /women grids need the id list because products hang off leaf
 * categories ("Button Shirts", "Jeans"), not off the root — filtering on the
 * root id alone would return nothing. Without any filter at all, which is what
 * both pages used to do, each one showed the other gender's products.
 *
 * The tree is capped at three levels by the categories API, so children +
 * grandchildren covers it.
 */
export async function getGenderCategory(slug: string) {
  const root = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      image: true,
      bannerImage: true,
      children: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          children: { where: { deletedAt: null }, select: { id: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!root) return null

  return {
    id: root.id,
    /** Wide artwork for the page header, falling back to the tile image. */
    image: root.bannerImage || root.image,
    /** Direct children — what the landing page lists as "collections". */
    collections: root.children.map(({ id, name, slug, image }) => ({ id, name, slug, image })),
    categoryIds: [
      root.id,
      ...root.children.flatMap((child) => [child.id, ...child.children.map((g) => g.id)]),
    ],
  }
}
