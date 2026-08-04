import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getPage() {
  const id = "cmrmbvk6s0000o54dpcv3m3zs";
  const page = await prisma.page.findUnique({
    where: { id }
  });

  if (!page) {
    // If not found by ID, let's search by slug containing it
    console.log(`Page with ID ${id} not found. Searching by title or slug...`);
    const pages = await prisma.page.findMany();
    console.log("All pages in DB:", JSON.stringify(pages, null, 2));
    return;
  }

  console.log("=== PAGE FOUND ===");
  console.log("ID:", page.id);
  console.log("Title:", page.title);
  console.log("Slug:", page.slug);
  console.log("Published:", page.published);
  console.log("Content JSON:");
  console.log(page.content);
}

getPage()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
