/**
 * The stand-in tiles for "Trending Tall Categories".
 *
 * They appear only while no category is flagged `isTrending` — a fresh install,
 * or a store that has not curated the row yet. Each one names a real category,
 * so `slug` points at the one it means and the homepage links straight there.
 *
 * They used to link to `/shop?query=shirt` instead: a tile reading "Button
 * Shirts" ran a text search rather than opening the Button Shirts category that
 * already existed with seven products in it. `search` is kept as the last
 * resort for tiles whose category a particular store has not created.
 *
 * Curating the row in Admin → Categories replaces these entirely.
 */

export interface FallbackTile {
  title: string;
  /** Bundled artwork, used when the resolved category has no image of its own. */
  image: string;
  /** Category this tile stands for; links there when it exists. */
  slug: string;
  /** Where to send the visitor when that category does not exist. */
  search: string;
}

export const FALLBACK_MEN: FallbackTile[] = [
  { title: "Shorts", image: "/images/shorts.png", slug: "men-shorts", search: "/shop?gender=men&query=shorts" },
  { title: "Button Shirts", image: "/images/men_hero.png", slug: "men-button-shirts", search: "/shop?gender=men&query=shirt" },
  { title: "Jeans", image: "/images/community.png", slug: "men-jeans-denim", search: "/shop?gender=men&query=jeans" },
  { title: "Tees", image: "/images/tees.png", slug: "men-graphic-tees", search: "/shop?gender=men&query=tee" },
  { title: "Pants & Chinos", image: "/images/pants.png", slug: "men-pants-chinos", search: "/shop?gender=men&query=pants" },
  { title: "Athletic Pants", image: "/images/swim.png", slug: "men-activewear", search: "/shop?gender=men&query=athletic" },
];

export const FALLBACK_WOMEN: FallbackTile[] = [
  { title: "Shorts", image: "/images/women_shorts.png", slug: "women-shorts-skirts", search: "/shop?gender=women&query=shorts" },
  { title: "Button Shirts", image: "/images/women_shirt.png", slug: "women-shirts-blouses", search: "/shop?gender=women&query=shirt" },
  { title: "Jeans", image: "/images/women_jeans.png", slug: "women-jeans-denim", search: "/shop?gender=women&query=jeans" },
  { title: "Tees", image: "/images/women_tees.png", slug: "women-tees-tanks-bodysuits", search: "/shop?gender=women&query=tee" },
  { title: "Pants & Chinos", image: "/images/women_pants.png", slug: "women-pants-trousers", search: "/shop?gender=women&query=pants" },
  { title: "Athletic Pants", image: "/images/women_swim.png", slug: "women-activewear", search: "/shop?gender=women&query=athletic" },
];

/** Every slug the fallbacks might resolve, for a single lookup. */
export const FALLBACK_SLUGS: string[] = [...FALLBACK_MEN, ...FALLBACK_WOMEN].map(t => t.slug);
