import { prisma } from "@/lib/prisma";

async function main() {
  console.log("Starting database query time measurements...");
  
  const startTotal = Date.now();

  // 1. Measure Categories Query
  const start1 = Date.now();
  await prisma.category.findMany({
    where: { parentId: null, deletedAt: null },
    include: { children: { include: { children: true } } }
  });
  console.log(`1. Categories query: ${Date.now() - start1}ms`);

  // 2. Measure Trending Categories Query
  const start2 = Date.now();
  await prisma.category.findMany({
    where: { isTrending: true, deletedAt: null },
    include: { parent: true },
    orderBy: { createdAt: "desc" },
    take: 24
  });
  console.log(`2. Trending Categories query: ${Date.now() - start2}ms`);

  // 3. Measure Products Query
  const start3 = Date.now();
  await prisma.product.findMany({
    where: { published: true, deletedAt: null },
    include: {
      category: true,
      brand: true,
      variants: true,
      images: true
    },
    orderBy: { createdAt: 'desc' },
    take: 40
  });
  console.log(`3. Products query: ${Date.now() - start3}ms`);

  // 4. Measure Best Sellers Query
  const start4 = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const topSellers = await prisma.orderItem.groupBy({
    by: ['variantId'],
    _sum: {
      quantity: true
    },
    where: {
      order: {
        status: { not: "CANCELLED" },
        createdAt: { gte: monthStart }
      },
      variant: {
        product: { published: true }
      }
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 40
  });

  if (topSellers.length > 0) {
    const variantIds = topSellers.map(ts => ts.variantId);
    await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            variants: true,
            images: true
          }
        }
      }
    });
  }
  console.log(`4. Best Sellers query: ${Date.now() - start4}ms`);

  // 5. Measure Brands Query
  const start5 = Date.now();
  await prisma.brand.findMany({
    take: 6
  });
  console.log(`5. Brands query: ${Date.now() - start5}ms`);

  // 6. Measure Settings Queries
  const start6 = Date.now();
  await prisma.setting.findUnique({
    where: { key: "home_hero_slides" }
  });
  await prisma.setting.findUnique({
    where: { key: "home_community_tabs" }
  });
  await prisma.setting.findUnique({
    where: { key: "flash_sale_products" }
  });
  console.log(`6. Settings queries: ${Date.now() - start6}ms`);

  // 7. Measure Menu Items Query (Header)
  const start7 = Date.now();
  await prisma.menuItem.findMany({
    where: { parentId: null },
    orderBy: { position: 'asc' },
    include: { 
      children: { 
        orderBy: { position: 'asc' }, 
        include: { 
          children: { 
            orderBy: { position: 'asc' } 
          } 
        } 
      } 
    }
  });
  console.log(`7. Menu Items query (Header): ${Date.now() - start7}ms`);

  console.log(`\nTotal Database Time (Sequential): ${Date.now() - startTotal}ms`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
