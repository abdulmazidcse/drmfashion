import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const OLD_URL = "http://localhost:9000";
  // change this to your server's actual IP or Domain (e.g. "http://123.45.67.89:9000")
  const NEW_URL = process.env.MINIO_ENDPOINT || "http://YOUR_SERVER_IP:9000"; 
  
  if (NEW_URL === OLD_URL) {
    console.log("Your MINIO_ENDPOINT is still localhost. Please set it to the public server IP in .env first.");
    process.exit(1);
  }

  console.log(`Replacing ${OLD_URL} with ${NEW_URL} in database...`);

  // 1. Update Product Thumbnails
  const products = await prisma.product.findMany({
    where: { thumbnail: { contains: OLD_URL } }
  });
  
  for (const product of products) {
    if (product.thumbnail) {
      await prisma.product.update({
        where: { id: product.id },
        data: { thumbnail: product.thumbnail.replace(OLD_URL, NEW_URL) }
      });
    }
  }
  console.log(`Updated ${products.length} product thumbnails.`);

  // 2. Update Product Images
  const images = await prisma.productImage.findMany({
    where: { url: { contains: OLD_URL } }
  });

  for (const img of images) {
    await prisma.productImage.update({
      where: { id: img.id },
      data: { url: img.url.replace(OLD_URL, NEW_URL) }
    });
  }
  console.log(`Updated ${images.length} gallery images.`);

  console.log("URL Replacement Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
