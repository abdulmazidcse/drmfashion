import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function list() {
  const pages = await prisma.page.findMany({
    select: {
      id: true,
      title: true,
      slug: true
    }
  });
  console.log("Pages:", JSON.stringify(pages, null, 2));
}

list()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
