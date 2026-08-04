import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/redis";
import { formatImageUrl, formatProductUrls, footerCategories } from "@/lib/utils";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import Link from "next/link";
import BestSellers from "@/components/home/BestSellers";
import NewArrivals from "@/components/home/NewArrivals";
import FlashSale from "@/components/FlashSale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RecentlyViewed from "@/components/RecentlyViewed";
import HomeHero from "@/components/home/HomeHero";
import PillarsCarousel from "@/components/home/PillarsCarousel";
import TrendingCategories from "@/components/home/TrendingCategories";
import ValueProps from "@/components/home/ValueProps";
import Reviews from "@/components/home/Reviews";
import NewsletterCard from "@/components/home/NewsletterCard";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 300;

export default async function Home() {
  // Fetch real categories, products, and brands from DB
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // `:v2` — the cached shapes below were narrowed (see PRODUCT_CARD_SELECT), so
  // the old entries have to be bypassed rather than reused.
  const CACHE_KEYS = {
    categories: "home:categories:v2",
    products: "home:products:v2",
    bestSellers: `home:bestSellers:v2:${monthStart.getTime()}`,
    brands: "home:brands"
  }

  async function fetchWithCache(key: string, fetcher: () => Promise<any>, ttl = 3600) {
    const cached = await getCache(key)
    if (cached) return cached

    const freshData = await fetcher()
    await setCache(key, freshData, ttl)
    return freshData
  }

  // Fetch all initial cached values concurrently using Promise.all
  const [
    categories,
    trendingCategories,
    products,
    bestSellerProducts,
    brands,
    heroSlidesSetting,
    communityTabsSetting,
    flashSaleProducts
  ] = await Promise.all([
    // The only consumer on this page is <Footer>, which lists four root category
    // names. The previous query pulled two levels of children and every scalar on
    // each, formatted their images, and serialised the whole tree into the
    // payload for four links.
    fetchWithCache(CACHE_KEYS.categories, () =>
      prisma.category.findMany({
        where: { parentId: null, deletedAt: null },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "asc" },
        take: 4
      })
    ),
    // Only the men/women heuristic and `toTile` below read these, and between
    // them they touch name, slug, image and the parent's name/slug.
    fetchWithCache("home:trendingCategories:v2", async () => {
      const raw = await prisma.category.findMany({
        where: { isTrending: true, deletedAt: null },
        select: {
          name: true,
          slug: true,
          image: true,
          parent: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 24
      });
      return raw.map(c => ({
        ...c,
        image: c.image ? formatImageUrl(c.image) : null
      }));
    }),
    fetchWithCache(CACHE_KEYS.products, async () => {
      const raw = await prisma.product.findMany({
        where: { published: true, deletedAt: null },
        select: PRODUCT_CARD_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 40
      });
      return raw.map(p => formatProductUrls(p));
    }),
    fetchWithCache(CACHE_KEYS.bestSellers, async () => {
      // 1. Group order items by variantId to find the top sellers this month
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
        take: 40 // Limit to top 40 variant IDs to optimize fetch size
      });

      if (topSellers.length === 0) return [];

      const variantIds = topSellers.map(ts => ts.variantId);
      
      // 2. Fetch the corresponding products and variants
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          product: { select: PRODUCT_CARD_SELECT }
        }
      });

      // 3. Aggregate quantities per product in memory (since multiple variants can belong to the same product)
      const productTotals = new Map<string, { product: any; quantity: number }>();
      
      topSellers.forEach(ts => {
        const variant = variants.find(v => v.id === ts.variantId);
        if (!variant || !variant.product) return;
        
        const product = variant.product;
        const quantity = ts._sum.quantity || 0;
        const current = productTotals.get(product.id);
        
        if (current) {
          current.quantity += quantity;
        } else {
          productTotals.set(product.id, { product, quantity });
        }
      });

      // 4. Sort products by total quantity sold
      const rawProducts = Array.from(productTotals.values())
        .sort((a, b) => b.quantity - a.quantity)
        .map(entry => entry.product);
      return rawProducts.map(p => formatProductUrls(p));
    }),
    fetchWithCache(CACHE_KEYS.brands, async () => {
      const raw = await prisma.brand.findMany({
        take: 6
      });
      return raw.map(b => ({
        ...b,
        image: b.image ? formatImageUrl(b.image) : null,
      }));
    }),
    fetchWithCache("home:hero:slides", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: "home_hero_slides" }
      });
      if (!s) return null;
      try {
        const parsed = JSON.parse(s.value);
        if (parsed.men) {
          if (parsed.men.image) parsed.men.image = formatImageUrl(parsed.men.image);
          if (parsed.men.video) parsed.men.video = formatImageUrl(parsed.men.video);
          if (parsed.men.videoFallback) parsed.men.videoFallback = formatImageUrl(parsed.men.videoFallback);
        }
        if (parsed.women) {
          if (parsed.women.image) parsed.women.image = formatImageUrl(parsed.women.image);
          if (parsed.women.video) parsed.women.video = formatImageUrl(parsed.women.video);
          if (parsed.women.videoFallback) parsed.women.videoFallback = formatImageUrl(parsed.women.videoFallback);
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }),
    fetchWithCache("home:community:tabs", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: "home_community_tabs" }
      });
      if (!s) return null;
      try {
        const parsed = JSON.parse(s.value);
        if (parsed.heights && parsed.heights.image) parsed.heights.image = formatImageUrl(parsed.heights.image);
        if (parsed.fit && parsed.fit.image) parsed.fit.image = formatImageUrl(parsed.fit.image);
        if (parsed.purpose && parsed.purpose.image) parsed.purpose.image = formatImageUrl(parsed.purpose.image);
        return parsed;
      } catch (e) {
        return null;
      }
    }),
    fetchWithCache("home:flash_sale:products_data", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: "flash_sale_products" }
      });
      if (!s) return [];
      try {
        const ids = JSON.parse(s.value);
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const specificProducts = await prisma.product.findMany({
          where: { id: { in: ids } },
          select: PRODUCT_CARD_SELECT
        });
        const sorted = ids.map(id => specificProducts.find(p => p.id === id)).filter(Boolean);
        return sorted.map(p => formatProductUrls(p));
      } catch (e) {
        return [];
      }
    })
  ]);

  // Split trending categories into men/women for the category tabs.
  // Safe heuristic (check women first — "women" contains "men"); matches parent + own slug/name.
  const catText = (c: any) =>
    `${c.slug ?? ""} ${c.name ?? ""} ${c.parent?.slug ?? ""} ${c.parent?.name ?? ""}`.toLowerCase();
  const isWomenCat = (c: any) => /women|womens|ladies/.test(catText(c));
  const isMenCat = (c: any) => !isWomenCat(c) && /\bmen|mens/.test(catText(c));
  const toTile = (c: any) => ({
    title: c.name,
    image: c.image || "/images/hero.jpg",
    href: `/category/${c.slug}`
  });
  const menCategoryTiles = trendingCategories.filter(isMenCat).slice(0, 6).map(toTile);
  const womenCategoryTiles = trendingCategories.filter(isWomenCat).slice(0, 6).map(toTile);

  // `spotlightProducts` and the `heroLeft`/`heroRight` image pair used to be
  // derived here for <FeaturedProductsSlider> and a category-driven hero. Neither
  // is rendered any more (the hero comes from the home_hero_slides setting), so
  // the passes over `products` and the unused imports went with them.

  // Fallback to newest products if no flash sale products are configured
  const finalFlashSaleProducts = flashSaleProducts && flashSaleProducts.length > 0
    ? flashSaleProducts
    : products;

  return (
    <div className="flex flex-col min-h-screen selection:bg-brand-200 selection:text-brand-950">

      <Header />

      {/* Signature runs one column of panels on the cream page — each section
          owns its own max-width and padding, so `main` only holds them. */}
      <main className="w-full">

        {/* Hero panel */}
        <HomeHero slides={heroSlidesSetting} />

        {/* Categories */}
        <ScrollReveal>
          <TrendingCategories men={menCategoryTiles} women={womenCategoryTiles} />
        </ScrollReveal>

        {/* Best sellers */}
        <ScrollReveal>
          <BestSellers products={bestSellerProducts.length > 0 ? bestSellerProducts : products} />
        </ScrollReveal>

        {/* Flash sale — copper band + the discounted grid */}
        <ScrollReveal>
          <FlashSale products={finalFlashSaleProducts} />
        </ScrollReveal>

        {/* The four promises */}
        <ScrollReveal>
          <ValueProps />
        </ScrollReveal>

        {/* New arrivals */}
        {products.length > 0 && (
          <ScrollReveal>
            <NewArrivals products={products} />
          </ScrollReveal>
        )}

        {/* Brand showcase */}
        {brands.length > 0 && (
          <ScrollReveal>
            <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
              <div className="sg-card sg-card-lg overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
                  <span className="sg-kicker">Our brand collection</span>
                  <h2 className="text-[28px] sm:text-[34px] font-extrabold mt-2.5">
                    {brands.length} premium brands, one fit standard
                  </h2>
                  <p className="text-soft text-[15px] leading-relaxed mt-3 max-w-[46ch]">
                    We partner with labels that will cut for height. Every piece is selected,
                    authenticity-verified and held to the same length standard as our own.
                  </p>
                  <Link href="/shop" className="sg-btn sg-btn-primary self-start mt-7">
                    Shop all brands →
                  </Link>
                </div>

                <div className="bg-cream p-8 sm:p-12 lg:p-14 grid grid-cols-2 sm:grid-cols-3 gap-3.5 content-center">
                  {brands.map((brand: any) => (
                    <div
                      key={brand.id}
                      className="sg-card grid place-items-center min-h-[86px] p-4"
                    >
                      {brand.image ? (
                        <img src={brand.image} alt={brand.name} className="max-h-9 object-contain opacity-80" />
                      ) : (
                        <span className="text-soft text-[12px] font-bold text-center">{brand.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* Reviews */}
        <ScrollReveal>
          <Reviews />
        </ScrollReveal>

        {/* Pillars — Designed For Real Heights (content from home_community_tabs Setting) */}
        <ScrollReveal>
          <PillarsCarousel initialTabs={communityTabsSetting} />
        </ScrollReveal>

        {/* Recently viewed */}
        <ScrollReveal>
          <RecentlyViewed currentProductId="" />
        </ScrollReveal>

        {/* Newsletter */}
        <ScrollReveal>
          <NewsletterCard />
        </ScrollReveal>

      </main>

      <Footer categories={footerCategories(categories)} />

    </div>
  );
}

