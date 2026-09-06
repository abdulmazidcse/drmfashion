/**
 * Seeds five example promo banners so the Banners feature can be seen working:
 *
 *   home_top     1 banner  → full-width strip under the hero
 *   home_middle  2 banners → two-column grid after best sellers
 *   men_top      1 banner  → top of /men
 *   women_top    1 banner  → top of /women
 *
 *   npx tsx scripts/seed-banners.ts
 *
 * Images are borrowed from existing product photos; swap them from
 * Admin → Banners (single: 21:9, grid: 4:3, mobile: 4:5). Safe to re-run —
 * matched by title.
 */
import { PrismaClient } from "@prisma/client"
import { invalidateBannerCache } from "@/lib/banners"

const prisma = new PrismaClient()

async function main() {
  const pick = async (keyword: string) => {
    const p = await prisma.product.findFirst({
      where: { deletedAt: null, published: true, title: { contains: keyword, mode: "insensitive" } },
      select: { thumbnail: true, images: { select: { url: true }, take: 1 } },
    })
    return p?.images[0]?.url || p?.thumbnail || null
  }

  const banners = [
    {
      title: "New Arrivals Are Here",
      subtitle: "Fresh tall-fit shirts and denim, cut with the length you've been missing.",
      buttonText: "Shop New In",
      link: "/collection/new-arrivals",
      position: "home_top",
      sortOrder: 0,
      image: await pick("Chinos"),
    },
    {
      title: "The Tall Shirt Edit",
      subtitle: "Longer sleeves. Longer bodies. Cuffs that end where they should.",
      buttonText: "Explore Shirts",
      link: "/collection/tall-shirt-edit",
      position: "home_middle",
      sortOrder: 0,
      image: await pick("Linen"),
    },
    {
      title: "Denim Guide",
      subtitle: "34, 36 and 38 inch inseams in every wash.",
      buttonText: "Find Your Jeans",
      link: "/collection/denim-guide",
      position: "home_middle",
      sortOrder: 1,
      image: await pick("Straight-Leg Jeans"),
    },
    {
      title: "Men's Tall Edit",
      subtitle: "Built for 6'3\" and up.",
      buttonText: "Shop Men",
      link: "/collection/mens-tall-edit",
      position: "men_top",
      sortOrder: 0,
      image: await pick("Five-Pocket"),
    },
    {
      title: "Women's Tall Edit",
      subtitle: "Proportions that finally work, from 5'9\" up.",
      buttonText: "Shop Women",
      link: "/collection/womens-tall-edit",
      position: "women_top",
      sortOrder: 0,
      image: await pick("Wide-Leg"),
    },
  ]

  for (const b of banners) {
    if (!b.image) {
      console.log(`skip "${b.title}" — no product image found`)
      continue
    }
    const data = { ...b, image: b.image, active: true }
    const existing = await prisma.banner.findFirst({ where: { title: b.title } })
    if (existing) {
      await prisma.banner.update({ where: { id: existing.id }, data })
    } else {
      await prisma.banner.create({ data })
    }
    console.log(`${b.position.padEnd(12)} ${b.title}`)
  }

  await invalidateBannerCache()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
