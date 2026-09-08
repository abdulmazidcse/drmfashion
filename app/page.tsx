import React from "react";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { getCache, setCache } from "@/lib/redis";
import { getSettings } from "@/lib/settings";
import { formatImageUrl, formatProductUrls, footerCategories } from "@/lib/utils";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import Link from "next/link";
import BestSellers from "@/components/home/BestSellers";
import NewArrivals from "@/components/home/NewArrivals";
import FlashSale from "@/components/FlashSale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromoBanners from "@/components/PromoBanners";
import RecentlyViewed from "@/components/RecentlyViewed";
import HomeHero from "@/components/home/HomeHero";
import PillarsCarousel from "@/components/home/PillarsCarousel";
import StyleSection from "@/components/home/StyleSection";
import TrendingCategories from "@/components/home/TrendingCategories";
import Reels from "@/components/home/Reels";
import SocialProof from "@/components/home/SocialProof";
import CustomerReviews from "@/components/home/CustomerReviews";
import JournalTeaser from "@/components/home/JournalTeaser";
import ProductShowcase from "@/components/home/ProductShowcase";
import { HOME_REELS_SETTING_KEY, parseHomeReels } from "@/lib/homeReels";
import IconsGrid from "@/components/home/IconsGrid";
import { HOME_ICONS_SETTING_KEY, parseHomeIcons, type HomeIconTile } from "@/lib/homeIcons";
import VideoBanner from "@/components/home/VideoBanner";
import {
  HOME_VIDEO_BANNERS_SETTING_KEY,
  parseHomeVideoBanners,
  type HomeVideoBanner,
  type HomeVideoBannerSlot
} from "@/lib/homeVideoBanners";
import { REVIEW_CARD_SELECT, REVIEW_VISIBLE_WHERE, toReviewCards } from "@/lib/reviews";
import { HOME_SHOWCASE_SETTING_KEY, parseHomeShowcase } from "@/lib/homeShowcase";
import {
  HOME_SECTIONS_SETTING_KEY,
  parseHomeSections,
  type HomeSectionKey
} from "@/lib/homeSections";
import { categoryImageAlt } from "@/lib/imageMeta";
import { FALLBACK_MEN, FALLBACK_WOMEN, FALLBACK_SLUGS, type FallbackTile } from "@/lib/homeTiles";
import {
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Truck
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 300;

// Resolved against `metadataBase` in app/layout.tsx. Set per page rather than in
// the root layout — inherited metadata would make every route claim "/" as its
// canonical.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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
    flashSaleProducts,
    styleSections,
    reelsSection,
    showcaseRows,
    socialProofStats,
    homeReviews,
    journalPosts,
    videoBanners,
    iconsSection
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
    // them they touch name, slug, image, its alt text and the parent's
    // name/slug. Key bumped to v3 with imageAlt: a cache entry written before
    // it existed would tile without any alt at all.
    fetchWithCache("home:trendingCategories:v4", async () => {
      const raw = await prisma.category.findMany({
        where: { isTrending: true, deletedAt: null },
        select: {
          name: true,
          slug: true,
          image: true,
          imageAlt: true,
          parent: { select: { name: true, slug: true } },
          // How many products the tile is offering, for its subtitle. A
          // filtered relation count, so drafts and deleted rows are not
          // advertised — the tile would otherwise promise more than the
          // category page delivers.
          _count: { select: { products: { where: { published: true, deletedAt: null } } } }
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
        // The product slide plays a video, and the carousel's shared imagery
        // (figures, before/after pairs) lives under `media`.
        if (parsed.product) {
          if (parsed.product.video) parsed.product.video = formatImageUrl(parsed.product.video);
          if (parsed.product.poster) parsed.product.poster = formatImageUrl(parsed.product.poster);
        }
        if (parsed.media) {
          for (const key of Object.keys(parsed.media)) {
            if (parsed.media[key]) parsed.media[key] = formatImageUrl(parsed.media[key]);
          }
        }
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
          // The setting keeps ids indefinitely, so a product deleted after it
          // was picked would otherwise still headline the flash sale.
          where: { id: { in: ids }, deletedAt: null },
          select: PRODUCT_CARD_SELECT
        });
        const sorted = ids.map(id => specificProducts.find(p => p.id === id)).filter(Boolean);
        return sorted.map(p => formatProductUrls(p));
      } catch (e) {
        return [];
      }
    }),
    // Seasonal category tiles ("Summer Styles"). The admin
    // picks categories per gender; the tile image/name/link are derived from the
    // category itself, so renaming a category updates the homepage too.
    // Returns null when the setting has never been saved — <StyleSection> then
    // falls back to its built-in tiles instead of rendering nothing.
    fetchWithCache("home:style:sections:v2", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: "home_style_sections" }
      });
      if (!s) return null;
      try {
        const parsed = JSON.parse(s.value);
        // Only `summer` is configurable now; a `winter` key surviving in an
        // older stored value is deliberately not rendered.
        const order: Array<"summer"> = ["summer"];
        const active = order
          .map(key => ({ key, ...(parsed?.[key] || {}) }))
          .filter(sec => sec.active !== false);

        const ids = Array.from(
          new Set(
            active.flatMap(sec => [
              ...(Array.isArray(sec.men) ? sec.men : []),
              ...(Array.isArray(sec.women) ? sec.women : [])
            ])
          )
        );
        if (ids.length === 0) return [];

        const cats = await prisma.category.findMany({
          // A category deleted after it was picked would otherwise still tile.
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true, name: true, slug: true, image: true, imageAlt: true }
        });
        const byId = new Map(cats.map(c => [c.id, c]));

        // Map by the admin's selected order, not the DB's.
        const toTiles = (selected: unknown) =>
          (Array.isArray(selected) ? selected : [])
            .map((id: string) => byId.get(id))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
            .map(c => ({
              title: c.name,
              image: c.image ? formatImageUrl(c.image) : "/images/hero.jpg",
              alt: categoryImageAlt({ custom: c.imageAlt, name: c.name, kind: "tile" }),
              href: `/category/${c.slug}`
            }));

        return active
          .map(sec => ({
            key: sec.key,
            title: sec.title || "Summer Styles",
            highlight: sec.highlight || "Styles",
            men: toTiles(sec.men),
            women: toTiles(sec.women)
          }))
          .filter(sec => sec.men.length > 0 || sec.women.length > 0);
      } catch (e) {
        return null;
      }
    }),
    // Reels strip — vertical clips uploaded in Settings → Homepage. Empty rows
    // are already dropped by parseHomeReels, so `reels.length` is the whole
    // "should this render" test.
    fetchWithCache("home:reels", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: HOME_REELS_SETTING_KEY }
      });
      const config = parseHomeReels(s?.value);
      return {
        ...config,
        reels: config.reels.map(r => ({
          ...r,
          video: formatImageUrl(r.video),
          poster: r.poster ? formatImageUrl(r.poster) : ""
        }))
      };
    }),
    // Editorial product strips ("Our Bestselling Jeans") — Settings → Homepage →
    // Product Showcase. Each row names itself and picks where its products come
    // from; rows that resolve to nothing are dropped so no empty strip renders.
    fetchWithCache("home:showcase:v1", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: HOME_SHOWCASE_SETTING_KEY }
      });
      const config = parseHomeShowcase(s?.value);
      if (!config.active || config.rows.length === 0) return [];

      const resolved = await Promise.all(
        config.rows.map(async row => {
          let raw: any[] = [];

          if (row.source === "manual") {
            // The setting keeps ids indefinitely, so a product unpublished or
            // deleted after it was picked would otherwise still headline the row.
            const picked = await prisma.product.findMany({
              where: { id: { in: row.productIds }, published: true, deletedAt: null },
              select: PRODUCT_CARD_SELECT
            });
            const byId = new Map(picked.map(p => [p.id, p]));
            // The admin's order, not the DB's.
            raw = row.productIds.map(id => byId.get(id)).filter(Boolean) as any[];
          } else if (row.source === "category") {
            // Sub-categories count: a row pointing at "Jeans" should still fill
            // when every product hangs off "Men's Jeans" / "Women's Jeans".
            const children = await prisma.category.findMany({
              where: { parentId: row.categoryId, deletedAt: null },
              select: { id: true }
            });
            const grandChildren = children.length
              ? await prisma.category.findMany({
                  where: { parentId: { in: children.map(c => c.id) }, deletedAt: null },
                  select: { id: true }
                })
              : [];
            const categoryIds = [
              row.categoryId,
              ...children.map(c => c.id),
              ...grandChildren.map(c => c.id)
            ];
            raw = await prisma.product.findMany({
              where: { categoryId: { in: categoryIds }, published: true, deletedAt: null },
              select: PRODUCT_CARD_SELECT,
              orderBy: { createdAt: "desc" },
              take: row.limit
            });
          } else {
            raw = await prisma.product.findMany({
              where: {
                published: true,
                deletedAt: null,
                ...(row.source === "featured" ? { featured: true } : {})
              },
              select: PRODUCT_CARD_SELECT,
              orderBy: { createdAt: "desc" },
              take: row.limit
            });
          }

          return {
            title: row.title,
            highlight: row.highlight,
            subtitle: row.subtitle,
            ctaLabel: row.ctaLabel,
            ctaHref: row.ctaHref,
            products: raw.map(p => formatProductUrls(p))
          };
        })
      );

      return resolved.filter(row => row.products.length > 0);
    }),
    // Counted rather than typed into a setting — see components/home/SocialProof.
    // A day's TTL: these move slowly and each one is a full-table aggregate.
    fetchWithCache("home:socialProof:v1", async () => {
      const [ratings, orderCount, customerCount, publishedProducts] = await Promise.all([
        prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
        prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
        // An EXISTS subquery, not a groupBy over every order row.
        prisma.user.count({ where: { orders: { some: { status: { not: "CANCELLED" } } } } }),
        prisma.product.count({ where: { published: true, deletedAt: null } })
      ]);
      return {
        avgRating: ratings._avg.rating ?? null,
        reviewCount: ratings._count.rating,
        orderCount,
        customerCount,
        publishedProducts
      };
    }, 86400),
    // Only 4- and 5-star reviews on this strip — it is a marketing block, and
    // /reviews is where the full, unfiltered list lives. Shape and author
    // handling are shared with that page via lib/reviews.
    fetchWithCache("home:reviews:v1", async () => {
      const raw = await prisma.review.findMany({
        where: { ...REVIEW_VISIBLE_WHERE, rating: { gte: 4 } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: REVIEW_CARD_SELECT
      });
      return toReviewCards(raw);
    }, 900),
    fetchWithCache("home:journal:v1", async () => {
      const raw = await prisma.journalPost.findMany({
        where: { published: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          coverImage: true,
          readTime: true,
          publishedAt: true,
          createdAt: true,
          category: { select: { name: true, slug: true } }
        }
      });
      // Dates are serialised because this shape goes through the Redis cache —
      // JournalCard already accepts a string here.
      return raw.map(p => ({
        ...p,
        publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString()
      }));
    }, 900),
    // Full-bleed video banners — Settings → Homepage → Video Banners. Inactive
    // and file-less rows are already dropped by parseHomeVideoBanners.
    fetchWithCache("home:videoBanners:v1", async () => {
      const s = await prisma.setting.findUnique({
        where: { key: HOME_VIDEO_BANNERS_SETTING_KEY }
      });
      return parseHomeVideoBanners(s?.value).map(b => ({
        ...b,
        video: formatImageUrl(b.video),
        videoMobile: b.videoMobile ? formatImageUrl(b.videoMobile) : "",
        poster: b.poster ? formatImageUrl(b.poster) : "",
        posterMobile: b.posterMobile ? formatImageUrl(b.posterMobile) : ""
      }));
    }),
    // Featured icons — Settings → Homepage → Featured Icons. Tiles carry their
    // own artwork and link rather than pointing at a Product, so there is
    // nothing to resolve here beyond rewriting the image paths.
    fetchWithCache("home:icons:v1", async () => {
      const setting = await prisma.setting.findUnique({
        where: { key: HOME_ICONS_SETTING_KEY }
      });
      const config = parseHomeIcons(setting?.value);
      const withUrls = (tiles: HomeIconTile[]) =>
        tiles.map(t => ({ ...t, image: formatImageUrl(t.image) }));

      return { ...config, men: withUrls(config.men), women: withUrls(config.women) };
    })
  ]);

  // Split trending categories into men/women for the Trending Tall Categories tabs.
  // Safe heuristic (check women first — "woman"/"women" both contain "man"/"men");
  // matches parent + own slug/name.
  //
  // `m[ae]n` on purpose: the seeded slugs are singular (`woman-socks`, `man-jeans`)
  // while the display names are plural ("Women", "Men"), and only matching one
  // spelling silently dropped every category into neither tab.
  const catText = (c: any) =>
    `${c.slug ?? ""} ${c.name ?? ""} ${c.parent?.slug ?? ""} ${c.parent?.name ?? ""}`.toLowerCase();
  const isWomenCat = (c: any) => /wom[ae]n|ladies/.test(catText(c));
  // \b keeps "woman" from matching as "man" — belt and braces, since women win above.
  const isMenCat = (c: any) => !isWomenCat(c) && /\bm[ae]n/.test(catText(c));
  const toTile = (c: any) => ({
    title: c.name,
    image: c.image || "/images/hero.jpg",
    // Resolved here rather than in the tile components: they are client
    // components, and the fallback only needs the category name they already have.
    alt: categoryImageAlt({ custom: c.imageAlt, name: c.name, kind: "tile" }),
    href: `/category/${c.slug}`,
    count: c._count?.products ?? 0
  });
  // Free-text block above the footer. Read through getSettings rather than a
  // cache key of its own — it is already memoised per request and the settings
  // save handler invalidates it.
  const settings = await getSettings();
  const homeDescription = settings.home_description?.trim() || "";
  // Read through getSettings rather than a cache key of its own — it is already
  // memoised per request and the settings save handler invalidates it.
  const sectionOrder = parseHomeSections(settings[HOME_SECTIONS_SETTING_KEY]);

  const curatedMen = trendingCategories.filter(isMenCat).slice(0, 6).map(toTile);
  const curatedWomen = trendingCategories.filter(isWomenCat).slice(0, 6).map(toTile);

  // With nothing flagged isTrending the row falls back to a built-in list. Those
  // tiles name categories that usually do exist, so resolve each one and link to
  // the category page; the /shop text search they used to point at is a strictly
  // worse destination than the category they are named after.
  const needFallback = curatedMen.length === 0 && curatedWomen.length === 0;
  const fallbackCategories = needFallback
    ? await prisma.category
        .findMany({
          where: { slug: { in: FALLBACK_SLUGS }, deletedAt: null },
          select: {
            slug: true,
            name: true,
            image: true,
            imageAlt: true,
            _count: { select: { products: { where: { published: true, deletedAt: null } } } },
          },
        })
        .catch(() => [])
    : [];
  const bySlug = new Map(fallbackCategories.map(c => [c.slug, c]));

  const toFallbackTile = (tile: FallbackTile) => {
    const category = bySlug.get(tile.slug);
    return {
      title: tile.title,
      // The category's own artwork wins; most stores never upload one, which is
      // what the bundled image is for.
      image: category?.image ? formatImageUrl(category.image) : tile.image,
      alt: categoryImageAlt({ custom: category?.imageAlt, name: category?.name || tile.title, kind: "tile" }),
      href: category ? `/category/${category.slug}` : tile.search,
      // 0 for a tile whose category this store never created — the subtitle
      // hides itself rather than claiming "0 items".
      count: category?._count?.products ?? 0,
    };
  };

  const menCategoryTiles = needFallback ? FALLBACK_MEN.map(toFallbackTile) : curatedMen;
  const womenCategoryTiles = needFallback ? FALLBACK_WOMEN.map(toFallbackTile) : curatedWomen;

  // `spotlightProducts` and the `heroLeft`/`heroRight` image pair used to be
  // derived here for <FeaturedProductsSlider> and a category-driven hero. Neither
  // is rendered any more (the hero comes from the home_hero_slides setting), so
  // the passes over `products` and the unused imports went with them.

  // Fallback to newest products if no flash sale products are configured
  const finalFlashSaleProducts = flashSaleProducts && flashSaleProducts.length > 0
    ? flashSaleProducts
    : products;

  // Banners name the section they follow rather than an index, so inserting or
  // reordering a section above them does not silently move them somewhere else.
  const bannersAt = (slot: HomeVideoBannerSlot) =>
    (videoBanners as HomeVideoBanner[])
      .filter(b => b.position === slot)
      .map((banner, i) => (
        <ScrollReveal key={`${slot}-${i}`}>
          <VideoBanner banner={banner} />
        </ScrollReveal>
      ));

  // Every block the homepage can show, keyed the same way as the stored order
  // in `home_sections`. A block whose content is empty still belongs here — it
  // renders null, which is how "on but nothing to show" and "switched off" stay
  // two different things.
  // The product on the hero's float card. Taken from the best-seller list the
  // page already computed — the top seller if there is one, otherwise the newest
  // product — so the card costs no extra query and is never empty on a store
  // that has stock but no orders yet.
  const heroHighlightSource = bestSellerProducts[0] ?? products[0] ?? null;
  const heroHighlight = heroHighlightSource
    ? {
        title: heroHighlightSource.title,
        slug: heroHighlightSource.slug,
        thumbnail: heroHighlightSource.thumbnail,
        price: heroHighlightSource.discountPrice ?? heroHighlightSource.basePrice,
        note: bestSellerProducts.length > 0 ? "Best seller this month" : "New this week",
      }
    : null;

  const sectionNodes: Record<HomeSectionKey, React.ReactNode> = {
    hero: <HomeHero slides={heroSlidesSetting} highlight={heroHighlight} />,

    pillars: (
      <ScrollReveal>
        <PillarsCarousel initialTabs={communityTabsSetting} />
      </ScrollReveal>
    ),

    "flash-sale": (
      <ScrollReveal>
        <FlashSale products={finalFlashSaleProducts} />
      </ScrollReveal>
    ),

    style:
      styleSections === null ? (
        <ScrollReveal>
          <StyleSection />
        </ScrollReveal>
      ) : (
        styleSections.map((section: any) => (
          <ScrollReveal key={section.key}>
            <StyleSection
              title={section.title}
              highlight={section.highlight}
              men={section.men}
              women={section.women}
            />
          </ScrollReveal>
        ))
      ),

    showcase: showcaseRows.map((row: any, i: number) => (
      <ScrollReveal key={`${row.title}-${i}`}>
        <ProductShowcase
          title={row.title}
          highlight={row.highlight}
          subtitle={row.subtitle}
          ctaLabel={row.ctaLabel}
          ctaHref={row.ctaHref}
          products={row.products}
          listId={`showcase-${i + 1}`}
        />
      </ScrollReveal>
    )),

    bestsellers: (
      <ScrollReveal>
        <BestSellers products={bestSellerProducts.length > 0 ? bestSellerProducts : products} />
      </ScrollReveal>
    ),

    trending: (
      <ScrollReveal>
        <TrendingCategories men={menCategoryTiles} women={womenCategoryTiles} />
      </ScrollReveal>
    ),

    reels:
      reelsSection.active && reelsSection.reels.length > 0 ? (
        <ScrollReveal>
          <Reels
            title={reelsSection.title}
            highlight={reelsSection.highlight}
            subtitle={reelsSection.subtitle}
            reels={reelsSection.reels}
          />
        </ScrollReveal>
      ) : null,

    icons:
      iconsSection.active && (iconsSection.men.length > 0 || iconsSection.women.length > 0) ? (
        <ScrollReveal>
          <IconsGrid
            title={iconsSection.title}
            highlight={iconsSection.highlight}
            subtitle={iconsSection.subtitle}
            ctaLabel={iconsSection.ctaLabel}
            ctaHref={iconsSection.ctaHref}
            men={iconsSection.men}
            women={iconsSection.women}
          />
        </ScrollReveal>
      ) : null,

    brands: (
      <ScrollReveal>
        <section className="w-full grid grid-cols-1 md:grid-cols-2 bg-zinc-950 text-white min-h-[50vh] overflow-hidden">
          <div className="flex flex-col justify-center p-8 sm:p-24 max-w-xl">
            <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-3 block">Our Brand Collection</span>
            <h2 className="at-heading text-at-subheading mb-4">
              {brands.length > 0 ? `${brands.length} Premium Brands` : "Premium Brands"}
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base mb-6 font-light leading-relaxed">
              We partner with the world&apos;s finest labels. Every piece in our collection is carefully selected, authenticity-verified, and crafted to the highest standards of luxury fashion.
            </p>
            <div className="flex items-center gap-6 mb-8 text-zinc-300 text-sm">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-white" /> Authentic Items</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-white" /> Quality Assured</span>
            </div>
            <Link href="/shop" className="rounded-at-btn bg-white text-at-ink px-8 py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-white/90 transition-colors shadow-lg self-start">
              Shop All Brands
            </Link>
          </div>
          <div className="relative min-h-[35vh] md:min-h-0 flex items-center justify-center p-8">
            {brands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-sm">
                {brands.map((brand: any) => (
                  <div key={brand.id} className="bg-zinc-800/60 border border-zinc-700/50 rounded-at-btn p-4 flex items-center justify-center min-h-[80px]">
                    {brand.image ? (
                      <img src={brand.image} alt={brand.name} className="max-h-12 max-w-full object-contain" />
                    ) : (
                      <span className="text-zinc-300 text-xs font-bold uppercase tracking-widest text-center">{brand.name}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center">
                <span className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Premium Fashion</span>
              </div>
            )}
          </div>
        </section>
      </ScrollReveal>
    ),

    "new-arrivals":
      products.length > 0 ? (
        <ScrollReveal>
          <NewArrivals products={products} />
        </ScrollReveal>
      ) : null,

    // Every figure is counted out of the DB, so the strip is held back until
    // there is something worth showing.
    "social-proof":
      socialProofStats.reviewCount > 0 ? (
        <ScrollReveal>
          <SocialProof stats={socialProofStats} />
        </ScrollReveal>
      ) : null,

    reviews:
      homeReviews.length > 0 ? (
        <ScrollReveal>
          <CustomerReviews reviews={homeReviews} />
        </ScrollReveal>
      ) : null,

    "recently-viewed": (
      <ScrollReveal>
        <RecentlyViewed currentProductId="" />
      </ScrollReveal>
    ),

    "value-props": (
      <ScrollReveal>
        <section className="bg-sig-cream pb-12 pt-2.5 lg:pb-[70px]">
          <div className="sig-wrap grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Truck, title: "Free shipping", text: "On every order over $150, dispatched the same day." },
              { icon: RotateCcw, title: "30-day returns", text: "Wrong fit? Send it back free, no restocking fee." },
              { icon: ShieldCheck, title: "Secure checkout", text: "Every payment encrypted end to end." },
              { icon: Sparkles, title: "Elite quality", text: "Carefully sourced materials, built to keep their shape." }
            ].map((item, idx) => (
              <div key={item.title} className="rounded-sig border border-sig-line bg-sig-card px-6 py-[26px]">
                {/* Alternating accent, so the row reads as a set of four rather
                    than four copies of the same card. */}
                <div
                  className={`mb-4 grid h-[46px] w-[46px] place-items-center rounded-[14px] ${
                    idx % 2 === 0
                      ? "bg-sig-copper-50 text-sig-copper-600"
                      : "bg-sig-aqua-50 text-sig-aqua-700"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <b className="mb-1.5 block text-[15px] font-extrabold text-sig-ink">{item.title}</b>
                <p className="text-[13.5px] leading-[1.65] text-sig-soft">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>
    ),

    journal:
      journalPosts.length > 0 ? (
        <ScrollReveal>
          <JournalTeaser posts={journalPosts} />
        </ScrollReveal>
      ) : null,

    description: homeDescription ? (
      <ScrollReveal>
        {/* Container mirrors <FooterOpenGrid> exactly — same outer padding,
            same 1280px card, same inner padding — so the copy lines up with
            the footer directly beneath it. */}
        <section className="w-full bg-white px-4 py-10 sm:px-6 md:py-14 lg:px-8">
          <div className="mx-auto max-w-[1280px]">
            {/* Rich text from the admin editor — same trust model and prose
                styling as the category description block. */}
            <div
              className="home-prose max-w-none px-6 text-[13px] leading-6 text-at-muted sm:px-8 lg:px-12"
              dangerouslySetInnerHTML={{ __html: homeDescription }}
            />
          </div>
        </section>
      </ScrollReveal>
    ) : null,
  };

  return (
    <div className="flex min-h-screen flex-col bg-sig-cream text-sig-ink antialiased selection:bg-sig-copper-600 selection:text-white">

      {/* Solid, not `transparent`: the Signature hero is a card sitting on the
          cream ground rather than a full-bleed image for the header to float
          over, so an overlaid header would have nothing dark to read against. */}
      <Header />

      <main className="w-full">

        {/* Order and visibility come from Settings → Homepage → Section Order.
            Video banners are emitted with the section they are anchored to, so
            moving that section takes its banner along instead of stranding it. */}
        {sectionOrder.map(({ key, active }) => (
          <React.Fragment key={key}>
            {active ? (
              <>
                {sectionNodes[key]}
                {bannersAt(`after-${key}` as HomeVideoBannerSlot)}
              </>
            ) : null}

            {/* Promo banners (Admin → Banners) sit outside the section toggles:
                they follow the hero / best-sellers slot whether or not that
                section is switched on, and hide themselves when empty. */}
            {key === "hero" && <PromoBanners position="home_top" />}
            {key === "bestsellers" && <PromoBanners position="home_middle" />}
          </React.Fragment>
        ))}

        <PromoBanners position="home_bottom" />

      </main>

      <Footer categories={footerCategories(categories)} />

    </div>
  );
}
