/**
 * Seeds ten example collections and fills them with whatever published
 * products exist, matched by category / title keywords.
 *
 *   npx tsx scripts/seed-collections.ts
 *
 * Safe to re-run: collections are upserted by slug and their product list is
 * replaced each time. Tile and banner images are borrowed from the first
 * matching product so the storefront has something to show — replace them from
 * Admin → Collections with real artwork (tile 5:6, banner 3:1).
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type Rule = {
  name: string
  slug: string
  description: string
  featured?: boolean
  sortOrder: number
  metaTitle?: string
  metaDescription?: string
  /** Category slugs (own or parent) that qualify a product. */
  categories?: string[]
  /** Case-insensitive words; a product qualifies if its title or tags contain any. */
  keywords?: string[]
  /** Newest N products regardless of category. */
  newest?: number
  /** Only products with a discount price. */
  onSale?: boolean
}

const RULES: Rule[] = [
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "<p>The latest tall-fit pieces to land in the store, cut with the extra length that off-the-rack never gives you.</p>",
    featured: true,
    sortOrder: 1,
    newest: 8,
  },
  {
    name: "The Tall Shirt Edit",
    slug: "tall-shirt-edit",
    description: "<p>Button-ups, dress shirts and linen shirts built with longer sleeves and bodies so the cuff ends where it should.</p>",
    featured: true,
    sortOrder: 2,
    categories: ["men-button-shirts", "women-shirts-blouses", "man-tops", "women-tops"],
  },
  {
    name: "Denim Guide",
    slug: "denim-guide",
    description: "<p>Every jean we make in 34, 36 and 38 inch inseams — straight, tapered and wide-leg.</p>",
    featured: true,
    sortOrder: 3,
    categories: ["men-jeans-denim", "women-jeans-denim"],
  },
  {
    name: "Chinos & Pants",
    slug: "chinos-and-pants",
    description: "<p>Smart-casual trousers and stretch chinos with a true tall rise and inseam.</p>",
    sortOrder: 4,
    categories: ["men-pants-chinos", "women-pants-trousers"],
  },
  {
    name: "Workwear Essentials",
    slug: "workwear-essentials",
    description: "<p>Office-ready shirts and trousers that hold their shape from the first meeting to the last train.</p>",
    sortOrder: 5,
    keywords: ["dress shirt", "formal", "business", "five-pocket", "smart casual", "chino"],
  },
  {
    name: "Weekend Casual",
    slug: "weekend-casual",
    description: "<p>Soft-touch shirts, athletic chinos and relaxed denim for days off.</p>",
    sortOrder: 6,
    keywords: ["soft-touch", "casual", "athletic", "linen", "chambray", "tapered"],
  },
  {
    name: "Women's Tall Edit",
    slug: "womens-tall-edit",
    description: "<p>Our womenswear, cut for 5'9\" and up: longer sleeves, longer inseams, proportions that finally work.</p>",
    featured: true,
    sortOrder: 7,
    categories: ["women", "women-tops", "women-bottoms", "women-shirts-blouses", "women-jeans-denim"],
  },
  {
    name: "Men's Tall Edit",
    slug: "mens-tall-edit",
    description: "<p>Menswear built for 6'3\" and up, from everyday shirts to the pants you'll live in.</p>",
    sortOrder: 8,
    categories: ["men", "man-tops", "men-bottoms", "men-button-shirts", "men-jeans-denim", "men-pants-chinos", "men-suit-shop"],
  },
  {
    name: "Wedding & Occasion",
    slug: "wedding-and-occasion",
    description: "<p>Crisp white shirts, black denim and tailored pieces for the days that get photographed.</p>",
    sortOrder: 9,
    keywords: ["dress shirt", "white", "black", "suit", "premium", "linen"],
  },
  {
    name: "Sale",
    slug: "sale",
    description: "<p>Everything currently marked down. Sizes go fast in the long lengths.</p>",
    sortOrder: 10,
    onSale: true,
  },
]

function contains(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase()
  return needles.some((n) => h.includes(n.toLowerCase()))
}

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      tags: true,
      thumbnail: true,
      discountPrice: true,
      category: { select: { slug: true, parent: { select: { slug: true } } } },
      images: { select: { url: true }, take: 1 },
    },
  })

  if (products.length === 0) {
    console.log("No published products found — collections will be created empty.")
  }

  for (const rule of RULES) {
    let matches = products.filter((p) => {
      if (rule.onSale) return p.discountPrice != null && p.discountPrice > 0
      const cats = [p.category.slug, p.category.parent?.slug || ""]
      const byCategory = rule.categories ? cats.some((c) => rule.categories!.includes(c)) : false
      const byKeyword = rule.keywords ? contains(`${p.title} ${p.tags || ""}`, rule.keywords) : false
      return byCategory || byKeyword
    })
    if (rule.newest) matches = products.slice(0, rule.newest)

    const first = matches[0]
    const image = first?.thumbnail || null
    const bannerImage = first?.images[0]?.url || first?.thumbnail || null

    const collection = await prisma.collection.upsert({
      where: { slug: rule.slug },
      update: {
        name: rule.name,
        description: rule.description,
        featured: !!rule.featured,
        sortOrder: rule.sortOrder,
        metaTitle: rule.metaTitle ?? `${rule.name} | Tall Fit`,
        metaDescription: rule.metaDescription ?? rule.description.replace(/<[^>]+>/g, ""),
      },
      create: {
        name: rule.name,
        slug: rule.slug,
        description: rule.description,
        image,
        bannerImage,
        active: true,
        featured: !!rule.featured,
        sortOrder: rule.sortOrder,
        metaTitle: rule.metaTitle ?? `${rule.name} | Tall Fit`,
        metaDescription: rule.metaDescription ?? rule.description.replace(/<[^>]+>/g, ""),
      },
    })

    await prisma.$transaction([
      prisma.collectionProduct.deleteMany({ where: { collectionId: collection.id } }),
      prisma.collectionProduct.createMany({
        data: matches.map((p, i) => ({ collectionId: collection.id, productId: p.id, sortOrder: i })),
        skipDuplicates: true,
      }),
    ])

    console.log(`${rule.name.padEnd(22)} ${String(matches.length).padStart(2)} products`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
