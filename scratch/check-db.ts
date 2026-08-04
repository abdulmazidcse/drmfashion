import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const prisma = new PrismaClient();

async function check() {
  console.log("=== CHECKING DATABASE PRODUCTS ===");
  const products = await prisma.product.findMany({
    where: {
      title: {
        in: ["TEST PRODUCT", "Urban Blouse", "Classic Boots", "Minimalist Silk Dress"]
      }
    },
    select: {
      id: true,
      title: true,
      thumbnail: true
    }
  });
  console.log("Products in DB:", JSON.stringify(products, null, 2));

  console.log("=== CHECKING FLASH SALE SETTING ===");
  const setting = await prisma.setting.findUnique({
    where: { key: "flash_sale_products" }
  });
  console.log("flash_sale_products setting:", setting);

  console.log("=== CHECKING REDIS VALUE FOR home:products ===");
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const redis = new Redis(url);
  try {
    const cachedProducts = await redis.get("home:products");
    if (cachedProducts) {
      const parsed = JSON.parse(cachedProducts);
      console.log("Redis cache (home:products) has data. First product thumbnail:");
      if (parsed && parsed.length > 0) {
        console.log(`Title: ${parsed[0].title}, Thumbnail: ${parsed[0].thumbnail}`);
      }
    } else {
      console.log("Redis cache (home:products) is EMPTY.");
    }
  } catch (err: any) {
    console.log("Redis connection error:", err.message);
  } finally {
    redis.disconnect();
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
