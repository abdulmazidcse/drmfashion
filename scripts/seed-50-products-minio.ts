import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import "dotenv/config";

const prisma = new PrismaClient();

// Configure MinIO Client
const s3Client = new S3Client({
  region: 'us-east-1', // MinIO requires a region, even if fake
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'password123',
  },
  forcePathStyle: true, // Needed for MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'fashion-store-bucket';

const MEN_IMAGES = [
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=600",
  "https://images.unsplash.com/photo-1593030761757-71fae46af504?q=80&w=600",
  "https://images.unsplash.com/photo-1507680434267-dc3cea9aee4e?q=80&w=600",
  "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=600",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=600",
  "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?q=80&w=600",
  "https://images.unsplash.com/photo-1550246140-5119ae4790b8?q=80&w=600",
];

const WOMEN_IMAGES = [
  "https://images.unsplash.com/photo-1515347619252-736025114dbd?q=80&w=600",
  "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=600",
  "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=600",
  "https://images.unsplash.com/photo-1485230895905-eb56f66378ac?q=80&w=600",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600",
  "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600",
];

const ADJECTIVES = ["Premium", "Minimalist", "Classic", "Urban", "Vintage", "Luxury", "Essential", "Modern"];
const MEN_NOUNS = ["Leather Jacket", "Cotton Tee", "Denim Jeans", "Wool Blazer", "Chino Pants", "Sneakers", "Polo", "Hoodie"];
const WOMEN_NOUNS = ["Silk Dress", "Trenchcoat", "Cashmere Sweater", "Skirt", "Blouse", "Cardigan", "Boots", "Loafers"];

function generateTitle(gender: 'men' | 'women') {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = gender === 'men' 
    ? MEN_NOUNS[Math.floor(Math.random() * MEN_NOUNS.length)]
    : WOMEN_NOUNS[Math.floor(Math.random() * WOMEN_NOUNS.length)];
  return `${adj} ${noun}`;
}

function generateSlug(title: string, index: number) {
  return title.toLowerCase().replace(/\s+/g, '-') + '-' + index + '-' + Math.random().toString(36).substring(7);
}

async function downloadAndUploadImage(imageUrl: string, fileName: string): Promise<string> {
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');
  const contentType = response.headers['content-type'] || 'image/jpeg';
  const key = `products/${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType as string,
      ACL: 'public-read',
    })
  );
  
  // Return the relative path without the MinIO endpoint and bucket prefix
  return `/products/${fileName}`;
}

async function main() {
  console.log("Starting DB wipe...");

  // Wipe data in reverse dependency order
  await prisma.review.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productQuestion.deleteMany({});
  await prisma.stockAlert.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.color.deleteMany({});
  await prisma.size.deleteMany({});
  await prisma.length.deleteMany({});
  
  console.log("DB wiped clean. Starting seed...");

  // 1. Setup Categories (3 Levels)
  console.log("Seeding Categories...");
  
  // Level 1: Root
  const catMen = await prisma.category.create({ data: { name: "Man", slug: "man" } });
  const catWomen = await prisma.category.create({ data: { name: "Woman", slug: "woman" } });

  // Level 2 & 3 for Woman (based on screenshot)
  const womanCategoriesStructure = [
    {
      name: "Featured Collections",
      slug: "woman-featured-collections",
      leaves: [
        { name: "Activewear", slug: "woman-activewear" },
        { name: "Camping Gear", slug: "woman-camping-gear" },
        { name: "Graphic Tees", slug: "woman-graphic-tees" },
        { name: "Summer", slug: "woman-summer" }
      ]
    },
    {
      name: "Sale",
      slug: "woman-sale",
      leaves: []
    },
    {
      name: "Tops",
      slug: "woman-tops",
      leaves: [
        { name: "Tees, Tanks + Bodysuits", slug: "woman-tees-tanks-bodysuits" },
        { name: "Long Sleeve Tees", slug: "woman-long-sleeve-tees" },
        { name: "Shirts + Blouses", slug: "woman-shirts-blouses" },
        { name: "Hoodies + Sweatshirts", slug: "woman-hoodies-sweatshirts" },
        { name: "Sweaters", slug: "woman-sweaters" },
        { name: "Jackets + Outerwear", slug: "woman-jackets-outerwear" },
        { name: "Blazers", slug: "woman-blazers" },
        { name: "Sports Bras", slug: "woman-sports-bras" }
      ]
    },
    {
      name: "Dresses",
      slug: "woman-dresses",
      leaves: [
        { name: "All Dresses", slug: "woman-all-dresses" },
        { name: "Jumpsuits", slug: "woman-jumpsuits" }
      ]
    },
    {
      name: "Specialty",
      slug: "woman-specialty",
      leaves: []
    },
    {
      name: "Bottoms",
      slug: "woman-bottoms",
      leaves: [
        { name: "Athletic Pants", slug: "woman-athletic-pants" },
        { name: "Leggings", slug: "woman-leggings" },
        { name: "Pajama + Lounge Pants", slug: "woman-pajama-lounge-pants" },
        { name: "Pants + Trousers", slug: "woman-pants-trousers" },
        { name: "Jeans + Denim", slug: "woman-jeans-denim" },
        { name: "Shorts + Skirts", slug: "woman-shorts-skirts" },
        { name: "Swimwear", slug: "woman-swimwear" }
      ]
    },
    {
      name: "Footwear",
      slug: "woman-footwear",
      leaves: [
        { name: "All Shoes", slug: "woman-all-shoes" }
      ]
    },
    {
      name: "Accessories",
      slug: "woman-accessories",
      leaves: [
        { name: "Socks", slug: "woman-socks" },
        { name: "Other Accessories", slug: "woman-other-accessories" }
      ]
    },
    {
      name: "Inspiration",
      slug: "woman-inspiration",
      leaves: [
        { name: "10 Years Tall", slug: "woman-10-years-tall" },
        { name: "Denim Guide", slug: "woman-denim-guide" },
        { name: "On The Clock", slug: "woman-on-the-clock" }
      ]
    }
  ];

  const leafCategoriesWomen: any[] = [];

  for (const group of womanCategoriesStructure) {
    const parentCat = await prisma.category.create({
      data: {
        name: group.name,
        slug: group.slug,
        parentId: catWomen.id
      }
    });

    for (const leaf of group.leaves) {
      const leafCat = await prisma.category.create({
        data: {
          name: leaf.name,
          slug: leaf.slug,
          parentId: parentCat.id
        }
      });
      leafCategoriesWomen.push(leafCat);
    }
  }

  // Level 2 & 3 for Man (based on screenshot)
  const manCategoriesStructure = [
    {
      name: "Featured Collections",
      slug: "man-featured-collections",
      leaves: [
        { name: "Activewear", slug: "man-activewear" },
        { name: "Camping Gear", slug: "man-camping-gear" },
        { name: "Graphic Tees", slug: "man-graphic-tees" },
        { name: "Summer", slug: "man-summer" },
        { name: "Semi Tall for 6' - 6'3\"", slug: "man-semi-tall-6-63" }
      ]
    },
    {
      name: "Sale",
      slug: "man-sale",
      leaves: []
    },
    {
      name: "Tops",
      slug: "man-tops",
      leaves: [
        { name: "Tees + Tanks", slug: "man-tees-tanks" },
        { name: "Button Shirts", slug: "man-button-shirts" },
        { name: "Long Sleeve Tees + Thermals", slug: "man-long-sleeve-tees-thermals" },
        { name: "Hoodies + Sweatshirts", slug: "man-hoodies-sweatshirts" },
        { name: "Sweaters", slug: "man-sweaters" },
        { name: "Polos", slug: "man-polos" },
        { name: "Jackets + Coats", slug: "man-jackets-coats" },
        { name: "Blazers + Suit Separates", slug: "man-blazers-suit-separates" }
      ]
    },
    {
      name: "Accessories",
      slug: "man-accessories",
      leaves: [
        { name: "Socks", slug: "man-socks" },
        { name: "Underwear", slug: "man-underwear" },
        { name: "Other Accessories", slug: "man-other-accessories" }
      ]
    },
    {
      name: "Bottoms",
      slug: "man-bottoms",
      leaves: [
        { name: "Jeans", slug: "man-jeans" },
        { name: "Pants + Chinos", slug: "man-pants-chinos" },
        { name: "Athletic Pants", slug: "man-athletic-pants" },
        { name: "Pajama + Lounge Pants", slug: "man-pajama-lounge-pants" },
        { name: "Shorts", slug: "man-shorts" },
        { name: "Swimwear", slug: "man-swimwear" }
      ]
    },
    {
      name: "Footwear",
      slug: "man-footwear",
      leaves: [
        { name: "All Shoes", slug: "man-all-shoes" }
      ]
    },
    {
      name: "Specialty",
      slug: "man-specialty",
      leaves: [
        { name: "Suit Shop", slug: "man-suit-shop" },
        { name: "Scrubs", slug: "man-scrubs" }
      ]
    },
    {
      name: "Inspiration",
      slug: "man-inspiration",
      leaves: [
        { name: "10 Years Tall", slug: "man-10-years-tall" },
        { name: "Denim Guide", slug: "man-denim-guide" },
        { name: "Jarrett Allen x AT", slug: "man-jarrett-allen-at" },
        { name: "On The Clock", slug: "man-on-the-clock" }
      ]
    }
  ];

  const leafCategoriesMen: any[] = [];

  for (const group of manCategoriesStructure) {
    const parentCat = await prisma.category.create({
      data: {
        name: group.name,
        slug: group.slug,
        parentId: catMen.id
      }
    });

    for (const leaf of group.leaves) {
      const leafCat = await prisma.category.create({
        data: {
          name: leaf.name,
          slug: leaf.slug,
          parentId: parentCat.id
        }
      });
      leafCategoriesMen.push(leafCat);
    }
  }

  // 2. Setup Attributes
  console.log("Seeding Attributes (Color, Size, Length)...");
  const colors = ["Black", "White", "Navy Blue", "Crimson Red", "Olive Green"];
  for (const c of colors) await prisma.color.create({ data: { name: c, value: c.toLowerCase().replace(" ", "-") } });
  
  const sizes = ["S", "M", "L", "XL"];
  for (const s of sizes) await prisma.size.create({ data: { name: s, value: s.toLowerCase() } });
  
  const lengths = ["Short", "Regular", "Long"];
  for (const l of lengths) await prisma.length.create({ data: { name: l, value: l.toLowerCase() } });

  // 3. Generate 50 Products
  console.log("Seeding 50 Products (with MinIO uploads)...");
  
  for (let i = 1; i <= 50; i++) {
    const isMan = i <= 25;
    const gender: 'men' | 'women' = isMan ? 'men' : 'women';
    const category = isMan 
      ? leafCategoriesMen[Math.floor(Math.random() * leafCategoriesMen.length)]
      : leafCategoriesWomen[Math.floor(Math.random() * leafCategoriesWomen.length)];
      
    const title = generateTitle(gender);
    const slug = generateSlug(title, i);
    const price = Math.floor(Math.random() * 2000) + 500;
    
    const sourceImages = isMan ? MEN_IMAGES : WOMEN_IMAGES;
    let minioUrl = '';
    let retries = 0;
    while (retries < 3) {
      try {
        const sourceImgUrl = sourceImages[Math.floor(Math.random() * sourceImages.length)];
        console.log(`[${i}/50] Uploading image to MinIO for: ${title}`);
        minioUrl = await downloadAndUploadImage(sourceImgUrl, `product-${i}-${Math.random().toString(36).substring(7)}.jpg`);
        break;
      } catch (error) {
        console.error(`Failed to upload image, retrying... (${retries + 1}/3)`);
        retries++;
      }
    }
    
    if (!minioUrl) {
      console.error(`Could not upload image for product ${i} after 3 retries, skipping.`);
      continue;
    }

    // Pick random colors, sizes, lengths for this product
    const productColors = colors.slice(0, Math.floor(Math.random() * 2) + 1);
    const productSizes = sizes.slice(0, Math.floor(Math.random() * 3) + 2);
    const productLengths = lengths.slice(0, Math.floor(Math.random() * 2) + 1);
    
    const variantsToCreate = [];
    for (const c of productColors) {
      for (const s of productSizes) {
        for (const l of productLengths) {
          variantsToCreate.push({
            sku: `SKU-${i}-${c.replace(/\s+/g, '')}-${s}-${l}`,
            size: s,
            color: c,
            length: l,
            stock: Math.floor(Math.random() * 50) + 10,
            price: price + (s === 'XL' ? 100 : 0) + (l === 'Long' ? 50 : 0),
            image: minioUrl,
            images: []
          });
        }
      }
    }

    const productImages = [
      { url: minioUrl, color: productColors[0] }
    ];

    await prisma.product.create({
      data: {
        title,
        slug,
        description: `Premium ${title} details for ${gender}. High-quality fabric, tailored for comfort and style.`,
        basePrice: price,
        categoryId: category.id,
        featured: Math.random() > 0.8,
        thumbnail: minioUrl,
        images: {
          create: productImages
        },
        variants: {
          create: variantsToCreate
        }
      }
    });
  }

  console.log("Successfully seeded 50 products with images in MinIO, 3-level categories, and Color/Size/Length attributes!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
