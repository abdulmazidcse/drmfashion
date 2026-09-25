import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, getStoreName } from "@/lib/settings";
import { formatImageUrl } from "@/lib/utils";
import LandingRenderer from "@/components/landing/LandingRenderer";
import { legacySections, LEGACY_THEME, parseSections, parseTheme } from "@/lib/landing/sections";
import { bkashFreeShippingMaxFromSettings, freeShippingThresholdFromSettings, shippingMethodsFromSettings } from "@/lib/shipping";
import { taxSettingsFromSettings } from "@/lib/tax";

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0;

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, page] = await Promise.all([
    getStoreName(),
    prisma.landingPage.findFirst({
      where: { slug, active: true },
      select: { title: true, heading: true, subheading: true, metaTitle: true, metaDescription: true },
    }),
  ]);

  if (!page) return { title: `Not Found | ${storeName}` };

  const title = page.metaTitle || page.heading || page.title;
  const description = page.metaDescription || page.subheading || undefined;

  return {
    title: `${title} | ${storeName}`,
    description,
    // Unlike /buy/[slug], this isn't a duplicate of any other page — it's
    // unique curated content, so it stays indexable (see app/sitemap.ts).
  };
}

/** A curated set of admin-picked products a shopper can add to the normal cart, then check out inline on this same page — same single-screen pattern as /buy/[slug], just built from the cart instead of a single product. */
export default async function LandingPage({ params }: LandingPageProps) {
  const { slug } = await params;

  const [page, settings] = await Promise.all([
    prisma.landingPage.findFirst({
      where: { slug, active: true },
      select: {
        title: true,
        heading: true,
        subheading: true,
        bannerImage: true,
        sections: true,
        theme: true,
        products: {
          orderBy: { sortOrder: "asc" },
          select: {
            product: {
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
            },
          },
        },
      },
    }),
    getSettings(),
  ]);

  if (!page) notFound();

  // A product removed/unpublished after being featured is dropped rather
  // than shown broken — same "quietly tolerate stale picks" approach the
  // shipping-method resolver and homepage showcase rows already use.
  const products = page.products
    .map((row) => row.product)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      ...p,
      thumbnail: formatImageUrl(p.thumbnail),
      images: p.images.map((i) => formatImageUrl(i.url)),
    }));

  if (products.length === 0) notFound();

  // Pages saved before the section builder existed have no `sections` — render
  // them as the equivalent section list instead, so they keep their exact old
  // look (see lib/landing/sections.ts's legacySections/LEGACY_THEME).
  const hasBuilderContent = Array.isArray(page.sections) && page.sections.length > 0;
  const sections = hasBuilderContent
    ? parseSections(page.sections)
    : legacySections({
        heading: page.heading || page.title,
        subheading: page.subheading || "",
        bannerImage: page.bannerImage ? formatImageUrl(page.bannerImage) : "",
      });
  const theme = hasBuilderContent ? parseTheme(page.theme) : LEGACY_THEME;

  return (
    <LandingRenderer
      sections={sections}
      theme={theme}
      products={products}
      showLowStockNotice={settings.product_low_stock_notice_enabled !== "false"}
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
        bkashFreeShippingMax: bkashFreeShippingMaxFromSettings(settings),
      }}
      tax={taxSettingsFromSettings(settings)}
    />
  );
}
