import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailsClient from "@/components/ProductDetailsClient";
import Header from "@/components/Header";
import { getStoreName } from "@/lib/settings";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { formatImageUrl, formatProductUrls } from "@/lib/utils";
import { absoluteImageUrl, productImageAlt, productImageUrls } from "@/lib/imageMeta";
import { siteUrl } from "@/lib/siteUrl";
import { getSettings, baseCurrencyCode } from "@/lib/settings";
import { productSchema, breadcrumbSchema } from "@/lib/structuredData";
import JsonLd from "@/components/JsonLd";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, product] = await Promise.all([
    getStoreName(),
    // findFirst, not findUnique: deleting a product only sets deletedAt, so the
    // row is still there and a unique lookup by slug would happily return it.
    prisma.product.findFirst({
      where: { slug, deletedAt: null },
      // The photography is here for the social/image tags below, which had none
      // — a shared product link rendered as a bare text card. Variants included
      // because most shots live on them rather than in `ProductImage`.
      include: {
        images: { select: { url: true, alt: true } },
        variants: { where: { deletedAt: null }, select: { image: true, images: true } },
        brand: { select: { name: true } },
      }
    })
  ]);

  if (!product) {
    return { title: `Product Not Found | ${storeName}` };
  }

  const headline = product.metaTitle || product.title;
  const description = product.metaDescription || product.description;

  // Thumbnail first — it is the shot chosen to represent the product — then the
  // gallery and the variant shots. Crawlers read the first entry as the primary
  // image, and OpenGraph consumers rarely show more than a handful.
  const gallery = productImageUrls(product)
    .map((url) => absoluteImageUrl(formatImageUrl(url), siteUrl()))
    .filter((url): url is string => Boolean(url))
    .slice(0, 6);

  const altByUrl = new Map(
    product.images.map((img) => [absoluteImageUrl(formatImageUrl(img.url), siteUrl()), img.alt])
  );

  const ogImages = gallery.map((url, index) => ({
    url,
    alt: productImageAlt({
      custom: altByUrl.get(url),
      title: product.title,
      brand: product.brand?.name,
      index,
      total: gallery.length,
    }),
  }));

  return {
    title: product.metaTitle ? `${product.metaTitle} | ${storeName}` : `${product.title} | ${storeName}`,
    description,
    keywords: product.metaKeywords || undefined,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      url: `/product/${product.slug}`,
      title: headline,
      description,
      siteName: storeName,
      images: ogImages,
    },
    twitter: {
      card: ogImages.length > 0 ? "summary_large_image" : "summary",
      title: headline,
      description,
      images: gallery,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // 1. Fetch product, categories, and colors concurrently
  const [productRow, categories, dbColors] = await Promise.all([
    // findFirst so the deletedAt filter applies — a deleted product must 404
    // rather than keep serving its page.
    prisma.product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        // Two levels of parent so the "how to measure" guide can be inherited
        // from anywhere in the three-level category tree — see lib/sizeChart.ts.
        category: { include: { parent: { include: { parent: true } } } },
        // The chart is picked per product, so it comes along with it.
        sizeChart: true,
        brand: true,
        variants: true,
        images: true,
        measurementTemplate: {
          include: {
            fields: {
              orderBy: [{ position: "asc" }, { createdAt: "asc" }],
              include: { tiers: { orderBy: [{ position: "asc" }, { minValue: "asc" }] } }
            }
          }
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
  const { costPrice: _costPrice, ...rawProduct } = productRow;
  const product = formatProductUrls(rawProduct) || rawProduct;

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

  // The curated "Model is also wearing" item, if one is set — re-checked for
  // published/not-deleted here since the FK is only cleared on a hard delete.
  const modelWearsRow = product.modelWearsProductId
    ? await prisma.product.findFirst({
        where: { id: product.modelWearsProductId, published: true, deletedAt: null },
        select: PRODUCT_CARD_SELECT,
      })
    : null;
  const modelWearsProduct = modelWearsRow ? formatProductUrls(modelWearsRow) : null;

  // ─── Structured data ───────────────────────────────────────────────────────
  // Rendered server-side so a crawler sees it without running JavaScript.
  const [settings, reviewStats] = await Promise.all([
    getSettings(),
    prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  // Crumbs mirror what the page shows above the title, deepest category last.
  const crumbs = [
    { name: "Home", path: "/" },
    ...[
      product.category?.parent?.parent,
      product.category?.parent,
      product.category,
    ]
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ name: c.name, path: `/category/${c.slug}` })),
    { name: product.title, path: `/product/${product.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema({
            ...product,
            currency: baseCurrencyCode(settings),
            // Only advertised when reviews exist — a fabricated rating is a
            // structured-data violation.
            rating:
              reviewStats._count.rating > 0 && reviewStats._avg.rating
                ? { value: reviewStats._avg.rating, count: reviewStats._count.rating }
                : null,
          }),
          breadcrumbSchema(crumbs),
        ]}
      />
      <Header />
      <ProductDetailsClient
        product={product}
        categories={categories}
        relatedProducts={finalRelated}
        modelWearsProduct={modelWearsProduct}
        dbColors={dbColors}
      />
    </>
  );
}
