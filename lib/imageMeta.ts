/**
 * Alt text and captions for product photography.
 *
 * Every product image carries an editable `alt` (Admin → product → gallery).
 * Most never get one, so the storefront falls back to a line built from what
 * the catalogue already knows — the title, the colourway the shot belongs to,
 * and its position in the gallery. That is worth doing rather than shipping
 * `alt="Shirt view 3"`: alt text is what a screen reader announces and what
 * Google Images has to rank the picture on, and neither can see the photo.
 */

const MAX_ALT_LENGTH = 125;

/** Collapses whitespace and drops a trailing full stop. */
function tidy(value?: string | null): string {
  return (value || "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

/** Screen readers read the whole string, so an over-long alt is a penalty. */
function truncate(value: string): string {
  if (value.length <= MAX_ALT_LENGTH) return value;
  const cut = value.slice(0, MAX_ALT_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export interface ProductAltInput {
  /** Alt entered in the admin. Wins outright when present. */
  custom?: string | null;
  title: string;
  brand?: string | null;
  /** Colourway this shot belongs to — `ProductImage.color`, or the selected one. */
  color?: string | null;
  /** 0-based position in the gallery being rendered. */
  index?: number;
  /** How many shots that gallery holds; a lone image gets no "view N". */
  total?: number;
}

/**
 * Builds the alt text for one product shot.
 *
 * "Brand Title in Colour, view 2 of 5" — deliberately factual. Nothing here
 * guesses at what the photograph shows ("front view", "model wearing"), since
 * a wrong description is worse for a screen reader than a plain one.
 */
export function productImageAlt({
  custom,
  title,
  brand,
  color,
  index = 0,
  total = 1,
}: ProductAltInput): string {
  const written = tidy(custom);
  if (written) return truncate(written);

  const name = tidy(title) || "Product";
  const label = tidy(brand) && !name.toLowerCase().startsWith(tidy(brand).toLowerCase())
    ? `${tidy(brand)} ${name}`
    : name;

  let alt = label;
  const shade = tidy(color);
  if (shade && !label.toLowerCase().includes(shade.toLowerCase())) {
    alt += ` in ${shade}`;
  }
  if (total > 1) {
    alt += `, view ${index + 1} of ${total}`;
  }

  return truncate(alt);
}

/**
 * Picks the caption to render under a shot. Whitespace-only captions are
 * treated as absent so an admin who clears the field gets no empty `<figcaption>`.
 */
export function productImageCaption(caption?: string | null): string | null {
  return tidy(caption) || null;
}

export interface CategoryAltInput {
  /** Alt entered in Admin → Categories. Wins outright when present. */
  custom?: string | null;
  name: string;
  /**
   * Which of the category's two pictures this is. They are different photographs
   * in different shapes — a 5:7 tile and a 3:1 banner — and used to share one
   * alt built from the name, which told a screen reader the same thing twice.
   */
  kind: "tile" | "banner";
}

/** Alt text for a category tile or banner: "Button Shirts category". */
export function categoryImageAlt({ custom, name, kind }: CategoryAltInput): string {
  const written = tidy(custom);
  if (written) return truncate(written);

  const label = tidy(name);
  if (!label) return kind === "banner" ? "Category banner" : "Category";
  return truncate(kind === "banner" ? `${label} category banner` : `${label} category`);
}

/**
 * Caption to print under a category picture, or null when there is none.
 *
 * No generated fallback on purpose — a caption is visible copy, and inventing
 * one would put words on the page that no editor wrote. Alt text is different:
 * it is machine-facing, so a factual generated line beats nothing at all.
 */
export function categoryImageCaption(caption?: string | null): string | null {
  return tidy(caption) || null;
}

export interface VariantAltInput {
  title: string;
  brand?: string | null;
  color?: string | null;
  size?: string | null;
  /** 0-based position among that colourway's shots. */
  index?: number;
  total?: number;
}

/**
 * Suggested alt text for a variant shot: "Brand Title in Eclipse Blue, size M".
 *
 * Offered to the admin as a starting point rather than forced on the page —
 * the merchant edits it and what they write is stored verbatim. Kept factual
 * for the same reason as productImageAlt: a confident wrong description is
 * worse for a screen reader than a plain one.
 */
export function variantImageAlt({
  title,
  brand,
  color,
  size,
  index = 0,
  total = 1,
}: VariantAltInput): string {
  const name = tidy(title) || "Product";
  const house = tidy(brand);
  let alt =
    house && !name.toLowerCase().startsWith(house.toLowerCase())
      ? `${house} ${name}`
      : name;

  const shade = tidy(color);
  if (shade && !alt.toLowerCase().includes(shade.toLowerCase())) {
    alt += ` in ${shade}`;
  }

  const scale = tidy(size);
  if (scale) alt += `, size ${scale}`;

  if (total > 1) alt += `, view ${index + 1} of ${total}`;

  return truncate(alt);
}

/**
 * Suggested caption. Deliberately shorter than the alt — a caption is visible
 * copy under the photo, so the "view N of M" counter and the size would read
 * as clutter to a shopper even though they help a screen reader.
 */
export function variantImageCaption({ title, color }: VariantAltInput): string {
  const name = tidy(title) || "Product";
  const shade = tidy(color);
  return shade ? `${name} — ${shade}` : name;
}

/**
 * One entry of a variant's `images` JSON.
 *
 * Gallery shots are rows in ProductImage and carry their own `alt`/`caption`
 * columns; variant shots are a JSON blob on the variant and historically held
 * nothing but a URL string. Entries may now be objects so a merchant can write
 * SEO copy for a colourway shot too.
 */
export interface VariantImageEntry {
  url: string;
  alt?: string | null;
  caption?: string | null;
}

/**
 * Reads one entry of `variant.images` in either shape.
 *
 * Every stored array predating the alt/caption fields is a list of plain
 * strings, and both the admin and the storefront still have to render those, so
 * the string form stays first-class rather than being migrated away.
 */
export function readVariantImage(entry: unknown): VariantImageEntry | null {
  if (typeof entry === "string") {
    const url = tidy(entry);
    return url ? { url, alt: null, caption: null } : null;
  }

  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    const url = tidy(typeof record.url === "string" ? record.url : "");
    if (!url) return null;
    return {
      url,
      alt: typeof record.alt === "string" ? tidy(record.alt) || null : null,
      caption: typeof record.caption === "string" ? tidy(record.caption) || null : null,
    };
  }

  return null;
}

/** Reads a whole `variant.images` value, dropping anything unusable. */
export function readVariantImages(images: unknown): VariantImageEntry[] {
  if (!Array.isArray(images)) return [];
  return images.map(readVariantImage).filter((e): e is VariantImageEntry => e !== null);
}

/**
 * Collapses an entry back to storage shape: a bare string while it carries no
 * copy, an object once it does. Keeps rows that never use the feature exactly
 * as they were rather than rewriting every array into objects on first save.
 */
export function writeVariantImage(entry: VariantImageEntry): string | VariantImageEntry {
  const alt = tidy(entry.alt);
  const caption = tidy(entry.caption);
  if (!alt && !caption) return entry.url;
  return { url: entry.url, ...(alt ? { alt } : {}), ...(caption ? { caption } : {}) };
}

/** Drops repeats from a list of image URLs, keeping the first form of each. */
export function dedupeImageUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const url of urls) {
    if (!url) continue;
    // Keyed on the file name, not the whole URL. The same photograph reaches
    // this point in more than one form — a thumbnail is stored as a full CDN
    // URL while a gallery row is stored as a bare file name, and
    // `formatImageUrl` resolves those two against different prefixes. Comparing
    // whole URLs listed the same picture twice, which reads to a crawler as two
    // images of which one 404s.
    const key = (url.split("?")[0].split("/").pop() || url).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(url);
  }

  return kept;
}

export interface ProductImageSources {
  thumbnail?: string | null;
  /** `ProductImage` rows — the colour-agnostic gallery. */
  images?: Array<{ url: string | null }> | null;
  /** Variants carry their own photography, stored as JSON rather than as rows. */
  variants?: Array<{ image?: string | null; images?: unknown }> | null;
}

/**
 * Every distinct photograph attached to a product, thumbnail first.
 *
 * Most of a product's photography hangs off its variants, not off `ProductImage`
 * — a colourway's shots are a JSON array on the variant row. Anything that
 * enumerates a product's images for a crawler (sitemap, OpenGraph) has to walk
 * both, or it advertises a fraction of the catalogue's pictures.
 */
export function productImageUrls(product: ProductImageSources): string[] {
  const urls: Array<string | null | undefined> = [product.thumbnail];

  for (const row of product.images ?? []) {
    urls.push(row?.url);
  }

  for (const variant of product.variants ?? []) {
    urls.push(variant?.image);
    // A JSON column, so its contents are whatever was written: the admin forms
    // store plain URL strings, older rows hold `{ url }` objects.
    if (Array.isArray(variant?.images)) {
      for (const entry of variant.images) {
        urls.push(typeof entry === "string" ? entry : (entry as { url?: string } | null)?.url);
      }
    }
  }

  return dedupeImageUrls(urls);
}

/**
 * Absolute URL for a sitemap or a meta tag.
 *
 * `formatImageUrl` returns a site-relative path in local development (images
 * are proxied through the /products rewrite), and both sitemaps and OpenGraph
 * tags require a fully qualified URL.
 */
export function absoluteImageUrl(url: string | null | undefined, base: string): string | null {
  const value = (url || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("data:") || value.startsWith("blob:")) return null;
  return `${base.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}
