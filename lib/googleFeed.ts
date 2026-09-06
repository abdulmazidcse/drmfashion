/**
 * Building the Google Merchant Center product feed.
 *
 * Merchant Center wants one `<item>` per *buyable* thing, not per product page:
 * a shirt in three colours and four sizes is twelve items sharing one
 * `item_group_id`, each distinguished by `color` and `size`. That is why the
 * feed iterates variants rather than products — submitting one row per product
 * would make every size look out of stock the moment one sold out.
 *
 * Nothing here guesses at values Google will reject:
 *  - no GTIN or MPN exists anywhere in the schema, so every item declares
 *    `identifier_exists: no` rather than inventing one. That is the correct
 *    declaration for own-brand goods; it is a disapproval for anything carrying
 *    a manufacturer's barcode, which is a data problem, not a feed problem.
 *  - items missing a brand, an image or a price are dropped and counted, not
 *    padded with placeholders. `buildGoogleFeed` returns those counts so the
 *    admin can see how much of the catalogue actually qualifies.
 *
 * Spec: https://support.google.com/merchants/answer/7052112
 */

import { absoluteImageUrl } from "./imageMeta";
import { formatImageUrl } from "./utils";

/** Google truncates past these; we cut cleanly instead of letting it chop. */
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;
/** `id` is capped at 50 characters by the spec. */
const MAX_ID = 50;
/** Beyond the primary image, Google accepts up to 10 more. */
const MAX_ADDITIONAL_IMAGES = 10;

export interface FeedVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  length?: string | null;
  stock: number;
  price: number | null;
  image: string | null;
  images: unknown;
}

export interface FeedProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  brand: { name: string } | null;
  category: { name: string; parent?: { name: string; parent?: { name: string } | null } | null } | null;
  images: Array<{ url: string }>;
  variants: FeedVariant[];
}

export interface FeedOptions {
  siteUrl: string;
  currency: string;
}

/** Why an item was left out, so the admin sees the gap rather than a short feed. */
export type SkipReason = "no brand" | "no image" | "no price" | "no sku";

export interface FeedResult {
  xml: string;
  included: number;
  skipped: Record<SkipReason, number>;
  /**
   * Items whose SKU was too long for `id` and fell back to the internal row id.
   * Not a failure — they are in the feed — but worth surfacing, because those
   * ids will not match anything in the merchant's own systems.
   */
  idFallbacks: number;
  /** A few examples per reason — enough to find the offending products. */
  examples: Array<{ product: string; sku: string; reason: SkipReason }>;
}

/** XML escaping. Everything user-written goes through this, no exceptions. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Rich text from the admin editor down to the plain prose the feed wants.
 * Block tags become spaces so "</p><p>" does not weld two sentences together.
 */
export function toPlainText(html: string): string {
  return (html || "")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cuts at a word boundary rather than mid-word, and only when over the limit. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/** Google wants a plain decimal with the currency: "69.00 USD". */
function money(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * The size string Google sees, waist and inseam together: "32/36".
 *
 * Length is a real dimension of this catalogue — 28 colour+size pairs repeat
 * across up to four lengths — and Google has no `length` attribute. Sending
 * only the size would put four variants in a group that differ in nothing it
 * can see, which reads as duplicates. Combining them is the convention the spec
 * gives for trousers, and it keeps every variant distinguishable.
 */
function sizeWithLength(variant: FeedVariant): string {
  const size = (variant.size || "").trim();
  const length = (variant.length || "").trim();
  if (!size) return length;
  if (!length || length.toLowerCase() === size.toLowerCase()) return size;
  return `${size}/${length}`;
}

/** "Men > Tops > Button Shirts" — the merchant's own taxonomy. */
function productType(category: FeedProduct["category"]): string {
  if (!category) return "";
  const path = [category.parent?.parent?.name, category.parent?.name, category.name];
  return path.filter(Boolean).join(" > ");
}

/** Every image URL a variant can offer, best first, absolute and deduplicated. */
function variantImages(product: FeedProduct, variant: FeedVariant, base: string): string[] {
  const raw: Array<string | null | undefined> = [variant.image];

  // A JSON column: older rows hold plain strings, newer ones { url, alt, caption }.
  if (Array.isArray(variant.images)) {
    for (const entry of variant.images) {
      raw.push(typeof entry === "string" ? entry : (entry as { url?: string } | null)?.url);
    }
  }

  raw.push(product.thumbnail);
  for (const row of product.images) raw.push(row?.url);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (!value) continue;
    const absolute = absoluteImageUrl(formatImageUrl(value), base);
    if (!absolute || seen.has(absolute)) continue;
    seen.add(absolute);
    out.push(absolute);
  }
  return out;
}

export function buildGoogleFeed(
  products: FeedProduct[],
  { siteUrl, currency }: FeedOptions,
  storeName: string
): FeedResult {
  const items: string[] = [];
  const skipped: Record<SkipReason, number> = {
    "no brand": 0,
    "no image": 0,
    "no price": 0,
    "no sku": 0,
  };
  let idFallbacks = 0;
  const examples: FeedResult["examples"] = [];

  const skip = (product: FeedProduct, sku: string, reason: SkipReason) => {
    skipped[reason]++;
    if (examples.filter(e => e.reason === reason).length < 3) {
      examples.push({ product: product.title, sku, reason });
    }
  };

  for (const product of products) {
    // One title for the whole group. Google matches variants to each other on
    // item_group_id, so colour and size go in their own fields rather than being
    // spliced into the title, where they would only eat the 150-character limit.
    const title = truncate(toPlainText(product.title), MAX_TITLE);
    const description = truncate(toPlainText(product.description), MAX_DESCRIPTION);
    const link = `${siteUrl}/product/${product.slug}`;
    const type = productType(product.category);

    for (const variant of product.variants) {
      const sku = (variant.sku || "").trim();
      if (!sku) { skip(product, "(none)", "no sku"); continue; }

      // `id` is capped at 50 characters, and this catalogue's generated SKUs
      // ("SKU-…-BLUE-AND-BLACK-MULTI-STRIPE-XL-EXTRA-TALL") run past it. Dropping
      // a sellable variant over the length of its own code would be the wrong
      // trade, so the row's cuid stands in — always unique, always short, and
      // stable across feed runs, which is all Google asks of an id.
      const feedId = sku.length <= MAX_ID ? sku : variant.id;
      if (feedId !== sku) idFallbacks++;

      // Brand is required for new products; without one the item is disapproved
      // on arrival, so it is more honest to leave it out and report it.
      if (!product.brand?.name?.trim()) { skip(product, sku, "no brand"); continue; }

      const images = variantImages(product, variant, siteUrl);
      if (images.length === 0) { skip(product, sku, "no image"); continue; }

      // A variant may price itself; otherwise it inherits the product's.
      const listPrice = variant.price ?? product.basePrice;
      if (!(listPrice > 0)) { skip(product, sku, "no price"); continue; }

      // discountPrice is the product-wide sale price. Only a genuine reduction
      // becomes sale_price — submitting one at or above `price` is a violation.
      const sale =
        product.discountPrice != null && product.discountPrice > 0 && product.discountPrice < listPrice
          ? product.discountPrice
          : null;

      const fields: string[] = [
        `<g:id>${xml(feedId)}</g:id>`,
        `<g:item_group_id>${xml(product.id)}</g:item_group_id>`,
        `<g:title>${xml(title)}</g:title>`,
        `<g:description>${xml(description)}</g:description>`,
        `<g:link>${xml(link)}</g:link>`,
        `<g:image_link>${xml(images[0])}</g:image_link>`,
        ...images.slice(1, 1 + MAX_ADDITIONAL_IMAGES).map(u => `<g:additional_image_link>${xml(u)}</g:additional_image_link>`),
        `<g:availability>${variant.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>`,
        `<g:price>${xml(money(listPrice, currency))}</g:price>`,
        ...(sale ? [`<g:sale_price>${xml(money(sale, currency))}</g:sale_price>`] : []),
        `<g:brand>${xml(product.brand.name.trim())}</g:brand>`,
        `<g:condition>new</g:condition>`,
        // No barcode field exists in the catalogue — see the note at the top.
        `<g:identifier_exists>no</g:identifier_exists>`,
        ...(variant.color ? [`<g:color>${xml(variant.color)}</g:color>`] : []),
        ...(sizeWithLength(variant) ? [`<g:size>${xml(sizeWithLength(variant))}</g:size>`] : []),
        ...(type ? [`<g:product_type>${xml(type)}</g:product_type>`] : []),
      ];

      items.push(`    <item>\n      ${fields.join("\n      ")}\n    </item>`);
    }
  }

  const xmlDoc =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `  <channel>\n` +
    `    <title>${xml(storeName)}</title>\n` +
    `    <link>${xml(siteUrl)}</link>\n` +
    `    <description>${xml(`${storeName} product feed for Google Merchant Center`)}</description>\n` +
    (items.length ? items.join("\n") + "\n" : "") +
    `  </channel>\n` +
    `</rss>\n`;

  return { xml: xmlDoc, included: items.length, skipped, idFallbacks, examples };
}
