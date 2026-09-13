import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, getStoreName } from "@/lib/settings";
import { formatImageUrl } from "@/lib/utils";
import QuickBuy from "@/components/QuickBuy";
import { freeShippingThresholdFromSettings, shippingMethodsFromSettings } from "@/lib/shipping"
import { taxSettingsFromSettings } from "@/lib/tax";

interface BuyPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: BuyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, product] = await Promise.all([
    getStoreName(),
    prisma.product.findFirst({ where: { slug, deletedAt: null }, select: { title: true } }),
  ]);

  if (!product) return { title: `Not Found | ${storeName}` };

  return {
    title: `Order ${product.title} | ${storeName}`,
    // A near-duplicate of /product/[slug] that exists for paid social traffic —
    // indexing it would split ranking signals between the two.
    robots: { index: false, follow: true },
  };
}

/** Single-product, single-screen order form for social/ad traffic. */
export default async function BuyPage({ params }: BuyPageProps) {
  const { slug } = await params;

  const [product, settings] = await Promise.all([
    // findFirst, not findUnique: a deleted product keeps its row and would
    // otherwise still be orderable through this page.
    prisma.product.findFirst({
      where: { slug, deletedAt: null, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        basePrice: true,
        discountPrice: true,
        images: { select: { url: true }, take: 4 },
        variants: {
          where: { deletedAt: null },
          select: { id: true, color: true, size: true, length: true, stock: true, price: true },
        },
      },
    }),
    getSettings(),
  ]);

  if (!product) notFound();

  return (
    <QuickBuy
      product={{
        ...product,
        thumbnail: formatImageUrl(product.thumbnail),
        images: product.images.map((i) => formatImageUrl(i.url)),
      }}
      payments={{
        cod: settings.payment_cod_enabled !== "false",
        codCountry: settings.payment_cod_country || "",
        stripe: settings.payment_stripe_enabled !== "false",
        bkash: settings.payment_bkash_enabled !== "false",
        nagad: settings.payment_nagad_enabled !== "false",
        square: settings.payment_square_enabled !== "false",
      }}
      shipping={{
        enabled: settings.shipping_enabled !== "false",
        methods: shippingMethodsFromSettings(settings),
        freeThreshold: freeShippingThresholdFromSettings(settings),
      }}
      tax={taxSettingsFromSettings(settings)}
      showLowStockNotice={settings.product_low_stock_notice_enabled !== "false"}
    />
  );
}
