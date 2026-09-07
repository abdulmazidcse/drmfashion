import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripScriptTags(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 * Public path prefix for objects that live in the MinIO/S3 bucket.
 *
 * Uploads used to be stored as `https://storage.tallplus.co/<bucket>/<key>`,
 * which meant the storage host was written into ~600 rows across eleven
 * columns: changing the domain, the bucket, or http→https required a database
 * migration (`scripts/fix-image-urls.ts`) rather than an env var. What goes in
 * the database now is the bucket-relative `/media/<key>`, and the rewrite in
 * `next.config.ts` maps that onto whatever `MINIO_ENDPOINT` currently is.
 */
export const BUCKET_URL_PREFIX = "/media";

/** Public URL for a bucket object key. */
export function bucketMediaUrl(key: string): string {
  return `${BUCKET_URL_PREFIX}/${String(key).replace(/^\/+/, "")}`;
}

/**
 * Rewrite a legacy absolute bucket URL to its `/media/<key>` form. Anything
 * else — a relative path, a third-party URL, a data URI — is returned as-is,
 * so this is safe to run over a column of mixed values.
 */
export function toBucketMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  const value = url.toString().trim();
  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";
  const absolute = new RegExp(`^https?://[^/]+/${bucketName}/(.+)$`, "i");
  const match = value.match(absolute);
  return match ? bucketMediaUrl(match[1]) : value;
}

export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  let resolvedUrl = url.trim();
  if (!resolvedUrl) return "";

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

  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";

  if (isLocal) {
    const localPrefix = `http://localhost:9000/${bucketName}/products/`;
    if (resolvedUrl.startsWith(localPrefix)) {
      return "/products/" + resolvedUrl.substring(localPrefix.length);
    }
    const localBucketPrefix = `http://localhost:9000/${bucketName}/`;
    if (resolvedUrl.startsWith(localBucketPrefix)) {
      const rest = resolvedUrl.substring(localBucketPrefix.length);
      return rest.startsWith("products/") ? "/" + rest : "/products/" + rest;
    }
  } else {
    resolvedUrl = resolvedUrl.replace("http://localhost:9000", endpoint);
  }

  // Canonical stored form: already endpoint-independent, the rewrite resolves it.
  if (resolvedUrl.startsWith(`${BUCKET_URL_PREFIX}/`)) {
    return resolvedUrl;
  }

  if (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://") || resolvedUrl.startsWith("//")) {
    return resolvedUrl;
  }

  // Prevent static public folder assets from being formatted with Minio endpoints
  if (
    resolvedUrl.startsWith("/images/") ||
    resolvedUrl.startsWith("/videos/") ||
    resolvedUrl.startsWith("/logo.") ||
    resolvedUrl.startsWith("/favicon.") ||
    resolvedUrl.startsWith("/placeholder") ||
    resolvedUrl.startsWith("data:") ||
    // Object URL for a file staged in the admin but not uploaded yet. Without
    // this it falls through to the bare-filename branch below and comes back as
    // "/products/blob:…", which is why staged photos previewed as broken.
    resolvedUrl.startsWith("blob:")
  ) {
    return resolvedUrl;
  }

  if (resolvedUrl.startsWith("/products/")) {
    return resolvedUrl;
  }

  if (resolvedUrl.startsWith("products/")) {
    return "/" + resolvedUrl;
  }

  if (resolvedUrl.startsWith("/uploads/")) {
    return resolvedUrl;
  }

  if (resolvedUrl.startsWith("uploads/")) {
    return "/" + resolvedUrl;
  }

  // Bare filename or un-prefixed path (e.g. "Shirt_Sample_1-1786177936478-690879140.jpg")
  const cleanPath = resolvedUrl.startsWith("/") ? resolvedUrl : `/${resolvedUrl}`;
  if (isLocal) {
    return `/products${cleanPath}`;
  }

  return `${endpoint}/${bucketName}/products${cleanPath}`;
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
          url: formatImageUrl(typeof img === "string" ? img : img.url),
        }))
      : [],
    variants: product.variants
      ? product.variants.map((v: any) => ({
          ...v,
          image: v.image ? formatImageUrl(v.image) : null,
          images: Array.isArray(v.images)
            ? v.images.map((img: any) => formatImageUrl(typeof img === "string" ? img : img?.url))
            : v.images,
        }))
      : [],
  };
}

/**
 * Normalize an incoming image URL/paths into a stored filename.
 * Examples:
 * - https://storage.tallplus.co/fashion-store-bucket/path/name.jpg -> name.jpg
 * - http://localhost:9000/fashion-store-bucket/products/name.jpg -> name.jpg
 * - /products/name.jpg -> name.jpg
 * - uploads/name.jpg -> name.jpg
 */
export function normalizeStoredImageFilename(url: string | null | undefined): string {
  if (!url) return "";

  let resolved = url.toString();

  // Remove protocol+host+bucket segments like https://host/<bucket>/...
  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";
  // Matches: http(s)://anything/<bucketName>/ or http(s)://anything/<bucketName>
  const fullRe = new RegExp(`^https?:\\/\\/[^\\/]+\\/${bucketName}\\/`, "i");
  resolved = resolved.replace(fullRe, "");

  // Also drop any leading path segments like /products/ or /uploads/
  resolved = resolved.replace(/^\/*(?:products|uploads)\/*/i, "");

  // If there remain any path segments, keep only the basename (filename)
  const parts = resolved.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : resolved;
}

/**
 * "Ayesha Rahman" → "Ayesha R." — how a reviewer is credited on the storefront.
 *
 * Reviews are shown publicly, so the surname is reduced to an initial rather
 * than published in full; a single-word or missing name is passed through as-is
 * (falling back to "Verified buyer") so the card never renders a blank byline.
 */
export function reviewerDisplayName(name: string | null | undefined): string {
  const trimmed = (name || "").trim();
  // Every storefront review is written against one shared placeholder account
  // (see app/api/products/[id]/reviews) — crediting it by name would put
  // "Guest User" under a dozen different quotes.
  if (!trimmed || trimmed.toLowerCase() === "guest user") return "Verified buyer";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * Storefront reviews have no author column of their own: the POST handler
 * prepends whatever name the visitor typed onto the comment as `"Name: text"`
 * and files the row under the shared guest account. This pulls the two apart
 * again so a card can show the author above the quote instead of inside it.
 *
 * The prefix is only recognised when it is short and word-like, so a review
 * that genuinely opens "Honestly: ..." keeps its first word — the cost of a
 * false positive is a mangled quote, the cost of a miss is only a generic byline.
 */
export function splitReviewAuthor(comment: string): { author: string | null; body: string } {
  const match = comment.match(/^([\p{L}][\p{L}\p{M}.'’-]*(?:\s+[\p{L}][\p{L}\p{M}.'’-]*){0,2}):\s+(\S[\s\S]*)$/u);
  if (!match) return { author: null, body: comment };

  const [, author, body] = match;
  if (author.length > 40) return { author: null, body: comment };
  return { author, body };
}
