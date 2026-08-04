import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailsClient from "@/components/ProductDetailsClient";
import Header from "@/components/Header";
import { getStoreName } from "@/lib/settings";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, product] = await Promise.all([
    getStoreName(),
    prisma.product.findUnique({
      where: { slug }
    })
  ]);
  
  if (!product) {
    return { title: `Product Not Found | ${storeName}` };
  }
  
  return {
    title: product.metaTitle ? `${product.metaTitle} | ${storeName}` : `${product.title} | ${storeName}`,
    description: product.metaDescription || product.description,
    keywords: product.metaKeywords || undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // 1. Fetch product, categories, and colors concurrently
  const [productRow, categories, dbColors] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        variants: true,
        images: true,
        measurementTemplate: {
          include: { fields: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] } }
        }
      }
    }),
    // Passed straight through to <Footer>, which renders four names.
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
      take: 4
    }),
    prisma.color.findMany()
  ]);

  if (!productRow) {
    notFound();
  }

  // The detail view genuinely needs most of the row, but `costPrice` is our
  // purchase cost — it has no business being serialised into the page.
  const { costPrice: _costPrice, ...product } = productRow;

  // 3. Fetch related dynamic products
  const relatedProducts = await prisma.product.findMany({
    where: {
      published: true,
      deletedAt: null,
      categoryId: product.categoryId,
      NOT: { id: product.id }
    },
    // Rendered as <ProductCard>, same as every other listing.
    select: PRODUCT_CARD_SELECT,
    take: 6
  });

  // Fallback to other featured items if current category has sparse listings
  let finalRelated = relatedProducts;
  if (finalRelated.length < 3) {
    finalRelated = await prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        NOT: { id: product.id }
      },
      // Same card shape as the primary related-products query above.
      select: PRODUCT_CARD_SELECT,
      take: 6
    });
  }

  return (
    <>
      <Header />
      <ProductDetailsClient 
        product={product} 
        categories={categories} 
        relatedProducts={finalRelated} 
        dbColors={dbColors}
      />
    </>
  );
}
