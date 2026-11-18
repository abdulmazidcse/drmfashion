import type { NextConfig } from "next";
// Old URLs → new page. Inlined rather than imported: next.config.ts is
// compiled on its own and cannot reliably load other project files.
// Products are listed one by one on purpose — a pattern would also catch live
// product URLs, since redirects run before the page routes.
const legacyCategories: Record<string, string> = {
  "men-button-shirts": "/category/men",
  "men-denim-guide": "/category/men",
  "men-inspiration": "/category/men",
  "men-on-the-clock": "/category/men",
  "men-pants-chinos": "/category/formal-pant",
  "started-with-tall": "/shop",
  "women-all-dresses": "/shop",
  "women-inspiration": "/shop",
  "women-jeans-denim": "/shop",
  "women-jumpsuits": "/shop",
  "women-shirts-blouses": "/shop",
  "women-shorts-skirts": "/shop",
}

const legacyProducts: Record<string, string> = {
  "luxury-blue-crystal-floral-multi-chain-blazer-brooch-silver-royal-design-br-522": "/product/floral-rosette-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-522",
  "luxury-crystal-multi-chain-blazer-brooch-silver-diamond-design-br-515": "/product/crown-motif-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-515",
  "luxury-floral-crystal-multi-chain-blazer-brooch-silver-diamond-design-br-516": "/product/floral-rosette-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-516",
  "luxury-leaf-multi-chain-blazer-brooch-silver-diamond-white-br-514": "/product/leaf-motif-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-514",
  "luxury-pearl-crystal-multi-chain-blazer-brooch-silver-royal-design-br-518": "/product/heart-motif-crystal-pearl-lapel-pin-brooch-with-cascading-chains-drm-fashion-br-518",
  "luxury-royal-crystal-multi-chain-blazer-brooch-gold-midnight-black-br-521": "/product/concentric-rosette-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-521",
  "luxury-royal-crystal-multi-chain-blazer-brooch-gold-ruby-design-br-519": "/product/geometric-square-crystal-lapel-pin-brooch-with-multi-tiered-hanging-chains-drm-fashion-br-519",
  "luxury-multi-chain-crystal-blazer-brooch-gold-diamond-white-br-511": "/category/brooch",
  "aqua-blue-blazer-men": "/category/blazer",
  "ash-grey-stylish-blazer-men": "/category/blazer",
  "dark-navy-blue-blazer-men": "/category/blazer",
  "deep-ash-blazer-men": "/category/blazer",
  "grey-check-blazer-men": "/category/blazer",
  "maroon-blazer-men": "/category/blazer",
  "navy-check-blazer-men": "/category/blazer",
  "mans-premium-beige-blazer-b-143": "/category/blazer",
  "mans-premium-light-ash-blazer-b-135": "/category/blazer",
  "mans-premium-sky-blue-blazer-b-140": "/category/blazer",
  "premium-dark-grey-check-blazer-for-men-b-112": "/category/blazer",
  "premium-sky-blue-blazer-for-men-b-141": "/category/blazer",
  "premium-dark-navy-blue-complete-three-piece-suit-for-men-f-25": "/category/blazer",
  "classic-mens-cream-white-purple-shade-waistcoat-w-103": "/category/panjabi-waistcoat",
  "luxury-maroon-panjabi-waistcoat": "/category/panjabi-waistcoat",
  "luxury-panjabi-white-waistcoat": "/category/panjabi-waistcoat",
  "maroon-panjabi-navy-waistcoat": "/category/panjabi-waistcoat",
  "premium-cotton-panjabi-navy-waistcoat": "/category/panjabi-waistcoat",
  "premium-embossed-panjabi-waistcoat": "/category/panjabi-waistcoat",
  "premium-katan-panjabi-designer-waistcoat-513": "/category/panjabi-waistcoat",
  "premium-textured-panjabi-white-waistcoat": "/category/panjabi-waistcoat",
  "classic-white-embroidered-panjabi-code-74-1": "/category/panjabi",
  "crimson-red-heritage-panjabi-golden-thread": "/category/panjabi",
  "elegant-blue-abstract-pattern-panjabi-premium-printed-design": "/category/panjabi",
  "elegant-blush-pink-patterned-panjabi-modern-textured-design": "/category/panjabi",
  "ivory-white-regal-panjabi-silver-collar": "/category/panjabi",
  "mens-premium-ash-embroidered-panjabi": "/category/panjabi",
  "mens-premium-ash-grey-embroidered-panjabi": "/category/panjabi",
  "mens-premium-sky-blue-embroidered-panjabi": "/category/panjabi",
  "midnight-black-executive-panjabi-copper-embroidery": "/category/panjabi",
  "modern-blue-abstract-print-panjabi-premium-design": "/category/panjabi",
  "modern-blue-geometric-printed-panjabi-premium-design": "/category/panjabi",
  "premium-black-crepe-fabric-panjabi-elegant-design": "/category/panjabi",
  "premium-mens-silk-panjabi-p-10": "/category/panjabi",
  "premium-navy-blue-designer-panjabi-code-82-2": "/category/panjabi",
  "premium-white-contrast-panjabi": "/category/panjabi",
  "premium-white-embroidered-panjabi-code-81": "/category/panjabi",
  "royal-coral-red-patterned-panjabi-modern-textured-design": "/category/panjabi",
  "royal-golden-beige-patterned-panjabi-modern-textured-design": "/category/panjabi",
}

// URLs from the store's previous platform that Google still crawls and gets a
// 404 for (Search Console "Not found (404)" export, 2026-11-18). Each one is
// sent permanently to the closest page here, so old Facebook posts, backlinks
// and bookmarks land somewhere useful and pass their ranking on. Query strings
// (?page=4, ?fbclid=…) are carried over by Next automatically.
const legacyRedirects = [
  // Old SEO-style category/subcategory slugs. They all end in "-in-bd" or
  // "-in-bangladesh", which no current category does. Most specific first.
  { source: "/category/:slug(best-panjabi-waistcoat.*)", destination: "/category/panjabi-waistcoat" },
  { source: "/:kind(category|subcategory)/:slug(.*brooch.*-in-(?:bd|bangladesh))", destination: "/category/brooch" },
  { source: "/:kind(category|subcategory)/:slug(.*blazer.*-in-(?:bd|bangladesh))", destination: "/category/blazer" },
  { source: "/:kind(category|subcategory)/:slug(.*panjabi.*-in-(?:bd|bangladesh))", destination: "/category/panjabi" },
  { source: "/subcategory/:slug*", destination: "/shop" },
  // Old campaign landing pages.
  { source: "/campaign/:slug(.*panjabi.*)", destination: "/category/premium-panjabi-for-men" },
  { source: "/campaign/:slug*", destination: "/shop" },
  // Old info pages ("/page/…" → "/pages/…").
  { source: "/page/delivery-rules", destination: "/pages/shipping-policy" },
  { source: "/page/terms-and-conditions", destination: "/pages/terms-of-use" },
  { source: "/page/:slug", destination: "/pages/:slug" },
  { source: "/shipping-charge", destination: "/pages/shipping-policy" },
  // Exact old category and product slugs (lists above).
  ...Object.entries(legacyCategories).map(([slug, to]) => ({ source: `/category/${slug}`, destination: to })),
  ...Object.entries(legacyProducts).map(([slug, to]) => ({ source: `/product/${slug}`, destination: to })),
].map((rule) => ({ ...rule, permanent: true }));

const nextConfig: NextConfig = {
  allowedDevOrigins: ['172.30.21.63','159.203.1.187'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  } as any,
  images: {
    // Optimization is ON. Previously `unoptimized: true` meant full-resolution
    // originals were served to phones too, which made images the dominant cost
    // of every product grid — `next/image`'s `sizes` props were dead weight.
    //
    // WebP only, deliberately: AVIF encodes ~50% slower for ~20% more savings,
    // and the production box is a single vCPU. Revisit if it gets more cores.
    formats: ["image/webp"],
    // Required from Next 16 — an allowlist, so `?q=` can't be used to force
    // arbitrary re-encodes. 75 is the `next/image` default quality.
    qualities: [75],
    // Trimmed from the 8 default breakpoints. Every entry here lands in each
    // srcset, so the set size decides how many variants get encoded across the
    // visitor base. Product grids cap at ~33vw desktop; 2048 is kept for the
    // product-detail hero on retina, 3840 dropped as nothing renders that wide.
    deviceSizes: [640, 828, 1080, 1440, 1920, 2048],
    // Optimized output is reused for 31 days instead of the 4h default, so the
    // encode cost is paid once per variant rather than repeatedly.
    minimumCacheTTL: 2678400,
    // Scoped to the hosts that actually serve our images. A `hostname: "**"`
    // wildcard was harmless while the optimizer was off, but with it on that is
    // an open image proxy: any URL could be pushed through /_next/image to burn
    // this box's CPU and bandwidth. Add new CDN hosts here explicitly.
    remotePatterns: [
      { protocol: "https", hostname: "storage.tallplus.co" },
      { protocol: "https", hostname: "tallplus.co" },
      // This store's own domain. At least one Setting/homepage-content row
      // holds an absolute https://www.drmfashion.com/uploads/... image URL
      // rather than a relative path, and next/image 500s the whole page on
      // any host not on this list — see MediaField.tsx/handleFieldFileUpload
      // if tracking down how that URL became absolute in the first place.
      { protocol: "https", hostname: "drmfashion.com" },
      { protocol: "https", hostname: "www.drmfashion.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Grey fallback shown wherever a product or category has no image of its
      // own. Third-party, so every one of those slots depends on placehold.co
      // being up — worth replacing with a local asset at some point.
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" }
    ],
    // Next 16 blocks optimizing images served from local IPs even when they are
    // listed in remotePatterns, so the local MinIO on :9000 returned 400 for
    // every category/product image. Dev only — production serves them from
    // storage.tallplus.co, and leaving this on there would turn the optimizer
    // into a proxy for anything reachable on the box's private network.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // The build runs on the production box (1 vCPU / 2 GB, live site alongside).
  // Under that load even /_not-found took over the 60 s default to prerender
  // and the deploy failed (Deploy #13), so pages get 5 minutes each...
  staticPageGenerationTimeout: 300,
  experimental: {
    // ...and one build worker instead of several fighting over one core and
    // pushing the box into swap.
    cpus: 1,
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: 100 * 1024 * 1024,
  } as any,
  async redirects() {
    return [
      // The old /men and /women landing pages were removed; the menu links
      // are /category/men and /category/women. Permanent, so bookmarks and
      // search results move too.
      { source: "/men", destination: "/category/men", permanent: true },
      { source: "/women", destination: "/category/women", permanent: true },
      // Old About pages: one About page now, the CMS one.
      { source: "/about", destination: "/pages/about-us", permanent: true },
      { source: "/about-us", destination: "/pages/about-us", permanent: true },
      // URLs from the previous platform that Google still crawls.
      ...legacyRedirects,
    ];
  },
  async rewrites() {
    const storage = `${process.env.MINIO_ENDPOINT || "https://storage.tallplus.co"}/${process.env.MINIO_BUCKET_NAME || "fashion-store-bucket"}`;

    return [
      // The single place the storage host is resolved. Uploads store the
      // bucket-relative `/media/<key>` (see app/api/upload), so moving to a new
      // bucket, domain or CDN is an env-var change here rather than a rewrite
      // of every image column in the database. `:path*` keeps the whole key,
      // so objects in a folder ("/media/products/x.jpg") resolve too.
      {
        source: "/media/:path*",
        destination: `${storage}/:path*`,
      },
      // Legacy: rows written before the switch that hold "/products/<file>".
      // Those objects really do live under a "products/" key prefix, hence the
      // extra segment. Kept so old rows keep resolving.
      {
        source: "/products/:path*",
        destination: `${storage}/products/:path*`,
      },
    ];
  }
};

export default nextConfig;
