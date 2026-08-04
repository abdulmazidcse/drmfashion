import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  let resolvedUrl = url;

  // 1. Determine the Minio/CDN endpoint context-aware
  const isServer = typeof window === "undefined";
  let endpoint = process.env.MINIO_ENDPOINT || process.env.NEXT_PUBLIC_MINIO_ENDPOINT;

  let isLocal = true;
  if (!isServer) {
    isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  } else {
    isLocal = !endpoint || endpoint.includes("localhost") || endpoint.includes("127.0.0.1");
  }

  if (!endpoint) {
    endpoint = isLocal ? "http://localhost:9000" : "https://storage.tallplus.co";
  }

  // 2. Rewrite local Minio absolute URLs to the relative proxy path /products/...
  // On production, replace with CDN/storage endpoint directly to bypass Node.js proxying.
  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";
  
  if (isLocal) {
    const localPrefix = `http://localhost:9000/${bucketName}/products/`;
    if (resolvedUrl.startsWith(localPrefix)) {
      return "/products/" + resolvedUrl.substring(localPrefix.length);
    }
  } else {
    resolvedUrl = resolvedUrl.replace("http://localhost:9000", endpoint);
  }

  if (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://")) {
    return resolvedUrl;
  }
  
  if (resolvedUrl.startsWith("/products/")) {
    return resolvedUrl;
  }

  // Prevent static public folder assets from being formatted with Minio endpoints
  if (
    resolvedUrl.startsWith("/images/") ||
    resolvedUrl.startsWith("/videos/") ||
    resolvedUrl.startsWith("/logo.") ||
    resolvedUrl.startsWith("/favicon.")
  ) {
    return resolvedUrl;
  }
  
  if (resolvedUrl.startsWith("/uploads/")) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (isServer ? "http://localhost:3000" : window.location.origin);
    return `${appUrl}${resolvedUrl}`;
  }

  const cleanPath = resolvedUrl.startsWith("/") ? resolvedUrl : `/${resolvedUrl}`;
  return `${endpoint}/${bucketName}${cleanPath}`;
}

/**
 * `Footer` renders `categories.slice(0, 4)` and reads only `id`, `name` and
 * `slug` off each. Pages were handing it the whole root-category tree —
 * `include: { children: { include: { children: true } } }` — every level of
 * which then had to be serialised into the RSC payload of every page with a
 * footer. Trim at the call site instead.
 */
export function footerCategories(
  categories: Array<{ id: string; name: string; slug: string }> | null | undefined
) {
  if (!categories) return [];
  return categories.slice(0, 4).map(({ id, name, slug }) => ({ id, name, slug }));
}

export function formatProductUrls(product: any) {
  if (!product) return null;
  return {
    ...product,
    thumbnail: formatImageUrl(product.thumbnail),
    images: product.images
      ? product.images.map((img: any) => ({
          ...img,
          url: formatImageUrl(img.url),
        }))
      : [],
    variants: product.variants
      ? product.variants.map((v: any) => ({
          ...v,
          image: v.image ? formatImageUrl(v.image) : null,
        }))
      : [],
  };
}
