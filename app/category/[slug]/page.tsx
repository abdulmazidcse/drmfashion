import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getStoreName } from "@/lib/settings";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Menu,
  ChevronRight,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ViewItemListTracker from "@/components/ViewItemListTracker";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect";
import { categoryImageAlt, categoryImageCaption } from "@/lib/imageMeta";
import { footerCategories } from "@/lib/utils";
import { sortLengths, sortSizes } from "@/lib/variants";
import CollectionToolbar from "@/components/CollectionToolbar";
import {
  VIEW_GRID_CLASS,
  VIEW_IMAGE_SIZES,
  parseFacet,
  parseSort,
  parseView,
  type CollectionQuery,
  type FacetOptions,
} from "@/lib/collectionView";


/**
 * The category header — banner artwork, eyebrow, title and item count.
 *
 * Kept behind a named switch because it gets turned off and on: it carries the
 * page's only <h1>, so turning it off leaves the listing with no on-page
 * heading (the <title> and meta description in `generateMetadata` still name
 * the category, so a crawler is not left guessing).
 */
const SHOW_CATEGORY_HEADER = true;

/**
 * The banner artwork inside that header, switched off on its own.
 *
 * Separate from the switch above because the two get turned off for different
 * reasons: this one drops the picture but keeps the title, so the listing still
 * has its <h1>. With no artwork the heading needs no scrim and no white-on-dark
 * — it renders as plain type on the page instead of a dark box.
 */
const SHOW_CATEGORY_BANNER_IMAGE = false;

/**
 * Home › Men › Tops › … trail above the category title. `trail` is the ancestor
 * chain; `current` is this page (no link). `dark` flips the palette for use over
 * banner artwork.
 */
function CategoryBreadcrumb({
  trail,
  current,
  dark = false,
}: {
  trail: { name: string; href: string }[];
  current: string;
  dark?: boolean;
}) {
  const linkCls = dark ? "text-white/60 hover:text-white" : "text-zinc-400 hover:text-zinc-800";
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
    >
      <Link href="/" className={`transition-colors ${linkCls}`}>
        Home
      </Link>
      {trail.map((c) => (
        <span key={c.href} className="flex items-center gap-2">
          <ChevronRight className={`h-3 w-3 ${dark ? "text-white/40" : "text-zinc-300"}`} />
          <Link href={c.href} className={`transition-colors ${linkCls}`}>
            {c.name}
          </Link>
        </span>
      ))}
      <ChevronRight className={`h-3 w-3 ${dark ? "text-white/40" : "text-zinc-300"}`} />
      <span className={dark ? "text-white" : "text-zinc-700"}>{current}</span>
    </nav>
  );
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [storeName, category] = await Promise.all([
    getStoreName(),
    prisma.category.findFirst({
      where: { slug, deletedAt: null },
      select: {
        name: true,
        slug: true,
        description: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
      },
    }),
  ]);

  if (!category) {
    return { title: `Category Not Found | ${storeName}` };
  }

  // Admin overrides win; otherwise fall back to the category's own copy.
  // `description` is rich text from the editor, so its tags are stripped before
  // it can go in a meta tag.
  const fallbackDescription = category.description
    ? category.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
    : "";

  return {
    title: category.metaTitle
      ? `${category.metaTitle} | ${storeName}`
      : `${category.name} | ${storeName}`,
    description:
      category.metaDescription ||
      fallbackDescription ||
      `Shop ${category.name} at ${storeName} — tall-specific fits, scaled vertically so the proportions land where they should.`,
    keywords: category.metaKeywords || undefined,
    // Sort/filter params never get their own canonical.
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const subSlug = typeof sp.sub === "string" ? sp.sub : undefined;
  const sort = parseSort(sp.sort);
  const view = parseView(sp.view);
  const selectedCategories = parseFacet(sp.cat);
  const selectedColors = parseFacet(sp.color);
  const selectedSizes = parseFacet(sp.size);
  const selectedLengths = parseFacet(sp.length);

  // Both reads are independent — they were sequential awaits. `children` used to
  // drag in the id of every published product beneath each child, none of which
  // this page reads.
  const [category, navCategories] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        bannerImage: true,
        bannerImageAlt: true,
        bannerImageCaption: true,
        description: true,
        // One-line sub-head under the H1. Plain text, so no stripping needed.
        metaDescription: true,
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            // Portrait tile shown in the sub-category strip.
            image: true,
            // Third level. Products hang off these, not off the child, so the
            // listing, the pill counts and the Category facet all need them —
            // the facet lists this level by name, the way a shopper thinks of
            // them ("Button Shirts", not "Tops").
            children: { select: { id: true, name: true } },
          },
        },
        // Two levels up, for the breadcrumb trail (Home › Men › Tops › …).
        parent: {
          select: {
            name: true,
            slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    // Nav list + <Footer>; the render reads name/slug off each.
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!category) notFound();

  // Breadcrumb trail: Home › [grandparent] › [parent] › current. The gender
  // roots have their own landing pages (/men, /women); every other level is a
  // /category/[slug] page.
  const catHref = (s: string) => (s === "men" || s === "women" ? `/${s}` : `/category/${s}`);
  const breadcrumbTrail: { name: string; href: string }[] = [];
  if (category.parent?.parent) {
    breadcrumbTrail.push({ name: category.parent.parent.name, href: catHref(category.parent.parent.slug) });
  }
  if (category.parent) {
    breadcrumbTrail.push({ name: category.parent.name, href: catHref(category.parent.slug) });
  }

  // Resolve which sub is active
  const activeSubcategory = subSlug
    ? category.children.find((c) => c.slug === subSlug)
    : null;

  // Collect category IDs to include in product filter.
  //
  // The tree is three levels deep (see lib/sizeChart.ts, which walks the same
  // shape) and in practice products are attached to the deepest level. Matching
  // only the category and its direct children left every top-level listing
  // empty, and every subcategory pill reading zero, while the products sat one
  // level further down.
  const subtreeIds = (c: { id: string; children?: { id: string }[] }) => [
    c.id,
    ...(c.children ?? []).map((grandchild) => grandchild.id),
  ];

  const allSubtreeIds = [category.id, ...category.children.flatMap(subtreeIds)];
  const categoryIds = activeSubcategory ? subtreeIds(activeSubcategory) : allSubtreeIds;

  // Whose description the page shows: the selected subcategory's if it has one,
  // otherwise the parent's.
  const copySource = activeSubcategory?.description ? activeSubcategory : category;

  // Build orderBy. "Best Selling" counts order lines through the variants, which
  // Prisma can order by directly — no second query, and no in-memory sort that
  // would only rank the page it happens to have fetched.
  const orderBy =
    sort === "price-asc"
      ? { basePrice: "asc" as const }
      : sort === "price-desc"
      ? { basePrice: "desc" as const }
      : sort === "featured"
      ? { featured: "desc" as const }
      : sort === "bestselling"
      ? { variants: { _count: "desc" as const } }
      : { createdAt: "desc" as const };

  // A facet narrows to products that are *actually made* in the combination —
  // one variant matching every chosen facet, not one variant per facet, which
  // would list a shirt that comes in M and in Extra Tall but never in both.
  const variantFilter =
    selectedSizes.length || selectedLengths.length || selectedColors.length
      ? {
          variants: {
            some: {
              deletedAt: null,
              ...(selectedSizes.length ? { size: { in: selectedSizes } } : {}),
              ...(selectedLengths.length ? { length: { in: selectedLengths } } : {}),
              ...(selectedColors.length ? { color: { in: selectedColors } } : {}),
            },
          },
        }
      : {};

  // The Category facet narrows within whatever subtree is already in view, so
  // a stale id in the URL cannot widen the listing beyond this category.
  //
  // A selection is honoured whenever it names a real category in this subtree,
  // even one with nothing in it — the drawer now offers empty categories, so
  // "no results" is a legitimate answer and must not be swallowed.
  //
  // Only a selection that matches *no* category here is ignored: that is a
  // hand-edited or stale `?cat=`, and emptying the page over it would say the
  // category is bare when it is not.
  const narrowed = categoryIds.filter((id) => selectedCategories.includes(id));
  const filteredCategoryIds =
    selectedCategories.length === 0 || narrowed.length === 0 ? categoryIds : narrowed;

  // Fetch products, and the per-subtree tallies the pills show. One grouped
  // count covers every child at once — a `_count` on the child row would only
  // see products attached directly to it, which is none of them.
  const [products, productCounts, variantRows] = await Promise.all([
    prisma.product.findMany({
      where: {
        published: true,
        deletedAt: null,
        categoryId: { in: filteredCategoryIds },
        ...variantFilter,
      },
      select: PRODUCT_CARD_SELECT,
      orderBy,
      take: 48,
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: {
        published: true,
        deletedAt: null,
        categoryId: { in: allSubtreeIds },
      },
      _count: { _all: true },
    }),
    // Every variant in the subtree, for the facet lists.
    //
    // Deliberately *not* narrowed by the current selection: options derived
    // from the filtered result disappear as they are used, and a checkbox that
    // removes itself cannot be un-ticked.
    //
    // One query rather than three groupBys because the counts have to be
    // distinct *products* — a size that exists on nine variants of one shirt is
    // one product, not nine — and Prisma cannot count distinct relations.
    prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        product: { published: true, deletedAt: null, categoryId: { in: categoryIds } },
      },
      select: { productId: true, size: true, length: true, color: true },
    }),
  ]);

  /** Distinct products per facet value, keyed by value. */
  const tally = (pick: (v: (typeof variantRows)[number]) => string | null) => {
    const seen = new Map<string, Set<string>>();
    for (const row of variantRows) {
      const value = pick(row)?.trim();
      if (!value) continue;
      const products = seen.get(value) ?? new Set<string>();
      products.add(row.productId);
      seen.set(value, products);
    }
    return seen;
  };

  const sizeTally = tally((v) => v.size);
  const colorTally = tally((v) => v.color);
  const lengthTally = tally((v) => v.length);

  const countsByCategory = new Map(productCounts.map((r) => [r.categoryId, r._count._all]));

  const facetOptions: FacetOptions = {
    // Two levels, as a tree rather than a flat list of leaves. On a top-level
    // page the leaves run to twenty rows; grouping them under the headings the
    // shop is organised by ("Tops", "Bottoms") makes that a list you can scan.
    //
    // Only the leaves are tickable — a group is an expander. Ticking "Tops" and
    // ticking "Button Shirts" would otherwise be two overlapping ways to say
    // the same kind of thing. A child with no children of its own has nothing
    // to expand, so it is a checkbox in its own right.
    //
    // Empty categories are listed too, with a (0) against them: the tree is
    // what the shop is organised by, and one quietly missing from the panel
    // reads as "we do not sell that" rather than "none in stock right now".
    categories: category.children
      .map((child) => {
        const leaves = child.children ?? [];
        const ownCount = countsByCategory.get(child.id) ?? 0;
        return {
          value: child.id,
          label: child.name,
          count:
            ownCount + leaves.reduce((sum, leaf) => sum + (countsByCategory.get(leaf.id) ?? 0), 0),
          children: leaves.length
            ? leaves
                .map((leaf) => ({
                  value: leaf.id,
                  label: leaf.name,
                  count: countsByCategory.get(leaf.id) ?? 0,
                }))
                .sort((a, b) => a.label.localeCompare(b.label))
            : undefined,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label)),

    colors: Array.from(colorTally, ([value, products]) => ({
      value,
      label: value,
      count: products.size,
    })).sort((a, b) => a.label.localeCompare(b.label)),

    // Wearing order, not alphabetical — sortSizes knows XS < S < M < L < XL.
    sizes: sortSizes(Array.from(sizeTally.keys())).map((value) => ({
      value,
      label: value,
      count: sizeTally.get(value)?.size ?? 0,
    })),

    // Ascending: inseam numbers by value, Semi Tall < Tall < Extra Tall by name.
    lengths: sortLengths(Array.from(lengthTally.keys()))
      .map((value) => ({ value, label: value, count: lengthTally.get(value)?.size ?? 0 })),
  };

  const collectionQuery: CollectionQuery = {
    sub: subSlug,
    sort,
    view,
    categories: selectedCategories,
    colors: selectedColors,
    sizes: selectedSizes,
    lengths: selectedLengths,
  };

  // Banner artwork only. `image` is the 5:7 portrait tile, so letterboxing it
  // into this 3:1 slot read as a mistake — a category without a banner simply
  // shows no picture here.
  const heroImage = category.bannerImage || "";

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">

      <Header />

      {/* CATEGORY HEADER — see SHOW_CATEGORY_HEADER / _BANNER_IMAGE. */}
      {SHOW_CATEGORY_HEADER &&
        (SHOW_CATEGORY_BANNER_IMAGE && heroImage ? (
          <>
            <section className="relative w-full overflow-hidden bg-zinc-900">
              {/* In normal flow, not absolute: the image is what gives the
                  banner its height, so whatever the admin uploads is shown
                  whole. */}
              <img
                src={heroImage}
                alt={categoryImageAlt({
                  custom: category.bannerImageAlt,
                  name: category.name,
                  kind: "banner",
                })}
                className="block h-auto w-full"
              />
              {/* Only the lower strip is darkened — enough to keep the title
                  legible without washing out the artwork above it. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[1600px] px-6 pb-8 sm:pb-12">
                <CategoryBreadcrumb trail={breadcrumbTrail} current={category.name} dark />
                <h1 className="mb-3 text-4xl font-extrabold uppercase leading-none tracking-tight text-white sm:text-6xl">
                  {category.name}
                </h1>
                {category.metaDescription && (
                  <p className="max-w-xl text-sm font-light leading-relaxed text-zinc-200">
                    {category.metaDescription}
                  </p>
                )}
              </div>
            </section>

            {/* Banner caption — below the artwork rather than over it: the
                lower strip already carries the title and count. */}
            {categoryImageCaption(category.bannerImageCaption) && (
              <p className="mx-auto w-full max-w-[1600px] px-6 pt-3 text-xs font-light leading-relaxed text-zinc-500">
                {categoryImageCaption(category.bannerImageCaption)}
              </p>
            )}
          </>
        ) : (
          <section className="mx-auto w-full max-w-[1600px] px-6 pb-4 pt-10">
            <CategoryBreadcrumb trail={breadcrumbTrail} current={category.name} />
            {/* A step down from the banner's size: over artwork the title has
                a whole photograph to hold its own against, on a white page it
                only has the toolbar under it. */}
            <h1 className="text-2xl font-extrabold uppercase leading-none tracking-tight text-zinc-950 sm:text-3xl">
              {category.name}
            </h1>
            {category.metaDescription && (
              <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-zinc-500">
                {category.metaDescription}
              </p>
            )}
          </section>
        ))}

      {/* SUBCATEGORY TILES — American Tall "Enhanced Collections" style: each
          child category as an image card linking to its own page.
          Only shown when at least one child has artwork *and* this isn't a
          gender root — an all-grey strip of empty placeholders reads as broken,
          so with no images uploaded the strip simply doesn't render. */}
      {category.parent && category.children.some((c) => c.image) && (
        <div className="border-b border-zinc-100">
          <div className="mx-auto max-w-[1600px] px-6 py-6">
            <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1">
              {category.children.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/category/${sub.slug}`}
                  className="group w-[124px] flex-shrink-0 sm:w-[148px]"
                >
                  <div className="relative aspect-[5/6] overflow-hidden rounded-sm bg-zinc-100">
                    {sub.image ? (
                      <img
                        src={sub.image}
                        alt={sub.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] font-bold uppercase leading-snug tracking-wide text-zinc-400">
                        {sub.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-zinc-600 transition-colors group-hover:text-zinc-950">
                    {sub.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-6 py-10 w-full flex-1">

        {/* One column now. Browsing sideways used to be a sidebar of category
            links; it is the drawer's Category facet instead, which is where
            someone narrowing a listing already is. */}
        <div>

          {/* PRODUCT GRID */}
          <div className="min-w-0">

            {/* Facets, sort and grid density. Everything it sets lives in the
                URL, so a filtered listing survives a reload and can be shared. */}
            <CollectionToolbar
              basePath={`/category/${slug}`}
              query={collectionQuery}
              options={facetOptions}
              total={products.length}
            />

            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
                  <ShoppingBag className="w-7 h-7 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Products Yet</h3>
                <p className="text-zinc-400 text-sm font-light mb-6">
                  We&apos;re adding new items to this category soon.
                </p>
                <Link href="/shop" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
                  Browse All Products
                </Link>
              </div>
            ) : (
              <>
              <ViewItemListTracker
                listId={`category_${category.slug}`}
                listName={category.name}
                products={products}
              />
              <div className={`grid ${VIEW_GRID_CLASS[view]}`}>
                {products.map((product, idx) => (
                  // First grid row is above the fold — opt it out of lazy loading.
                  <ProductCard
                    key={product.id}
                    product={product}
                    idPrefix="category"
                    listId={`category_${category.slug}`}
                    listName={category.name}
                    priority={idx < 3}
                    // The card's default `sizes` describes the four-up grid; at
                    // two-up or six-up that is off by a factor of two either way,
                    // which is a bigger image than needed or a blurry one.
                    sizes={VIEW_IMAGE_SIZES[view]}
                  />
                ))}
              </div>
              </>
            )}

            {/* Category copy, under the grid — it is SEO/reading material, so it
                sits after the products rather than pushing them down. Rich text
                from the admin editor, same as the product description.
                Whichever category the shopper is actually looking at supplies
                the copy; a subcategory with none falls back to its parent's so
                the section is not simply lost. */}
            {copySource?.description && (
              <section className="mt-16 pt-10 border-t border-zinc-100">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-950 mb-5">
                  About {copySource.name}
                </h2>
                <div
                  className="page-content max-w-none font-light"
                  dangerouslySetInnerHTML={{ __html: copySource.description }}
                />
              </section>
            )}
          </div>
        </div>
      </main>
      <Footer categories={footerCategories(navCategories)} />
    </div>
  );
};
