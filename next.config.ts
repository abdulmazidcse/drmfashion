import type { NextConfig } from "next";

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
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
    proxyClientMaxBodySize: 100 * 1024 * 1024,
  } as any,
  async rewrites() {
    return [
      {
        source: "/products/:path*",
        destination: `${process.env.MINIO_ENDPOINT || "https://storage.tallplus.co"}/${process.env.MINIO_BUCKET_NAME || "fashion-store-bucket"}/products/:path*`,
      },
    ];
  }
};

export default nextConfig;
