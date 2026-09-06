import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getStoreName } from "@/lib/settings"
import { buildPageList } from "@/lib/pagination"
import { formatProductUrls } from "@/lib/utils"
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect"
import { REVIEWED_PRODUCTS_PAGE_SIZE, REVIEW_SORTS, type ReviewSort } from "@/lib/reviews"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ProductCard from "@/components/ProductCard"
import { Stars } from "@/components/reviews/ReviewCard"

export const revalidate = 300

type SearchParams = Promise<{ page?: string; sort?: string }>

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `Reviewed by Tall Customers | ${storeName}`,
    description: `Every ${storeName} piece our customers have reviewed, ranked by what they rated highest.`,
    // Pagination and sort variants all resolve back to the index.
    alternates: { canonical: "/reviews" },
  }
}

export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: pageParam, sort: sortParam } = await searchParams

  const page = Math.max(1, Number.parseInt(pageParam || "1", 10) || 1)
  const sort: ReviewSort = REVIEW_SORTS.some((s) => s.value === sortParam)
    ? (sortParam as ReviewSort)
    : "top-rated"

  const storeName = await getStoreName()

  // Ranked off the reviews themselves rather than off Product: "top rated"
  // needs an average, and Prisma can only order a relation by its count. The
  // group is small by nature — one row per product that has ever been reviewed
  // — so it is sorted and paged in memory, then the page's products are fetched
  // in one query.
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { product: { published: true, deletedAt: null } },
    _avg: { rating: true },
    _count: { rating: true },
  })

  const ranked = grouped
    .map((g) => ({
      productId: g.productId,
      rating: g._avg.rating ?? 0,
      count: g._count.rating,
    }))
    .sort((a, b) =>
      sort === "most-reviewed"
        ? b.count - a.count || b.rating - a.rating
        : // Ties on a perfect score are broken by how many people gave it —
          // one five-star review should not outrank twenty.
          b.rating - a.rating || b.count - a.count
    )

  const total = ranked.length
  const totalPages = Math.max(1, Math.ceil(total / REVIEWED_PRODUCTS_PAGE_SIZE))
  const pageSlice = ranked.slice(
    (page - 1) * REVIEWED_PRODUCTS_PAGE_SIZE,
    page * REVIEWED_PRODUCTS_PAGE_SIZE
  )

  const products = pageSlice.length
    ? await prisma.product.findMany({
        where: { id: { in: pageSlice.map((r) => r.productId) } },
        select: PRODUCT_CARD_SELECT,
      })
    : []

  // findMany returns its own order; re-apply the ranking above.
  const byId = new Map(products.map((p) => [p.id, p]))
  const items = pageSlice
    .map((r) => ({ ...r, product: byId.get(r.productId) }))
    .filter((r): r is typeof r & { product: NonNullable<typeof r.product> } => Boolean(r.product))
    .map((r) => ({ ...r, product: formatProductUrls(r.product) }))

  const totalReviews = ranked.reduce((sum, r) => sum + r.count, 0)
  const overall = totalReviews
    ? ranked.reduce((sum, r) => sum + r.rating * r.count, 0) / totalReviews
    : null

  const buildHref = (targetPage: number, targetSort: ReviewSort = sort) => {
    const params = new URLSearchParams()
    if (targetSort !== "top-rated") params.set("sort", targetSort)
    if (targetPage > 1) params.set("page", String(targetPage))
    const query = params.toString()
    return query ? `/reviews?${query}` : "/reviews"
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-950 antialiased">
      <Header />

      <main className="w-full flex-1">
        {/* ─── Masthead ─────────────────────────────────────────────── */}
        <section className="border-b border-zinc-100 bg-white px-6 pb-10 pt-14 text-center md:px-12 md:pb-14 md:pt-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">{storeName}</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Shop The Reviews
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
            Every piece our customers have reviewed, ranked by what they rated highest. Open one to
            read what they said about the fit.
          </p>

          {/* Held back until there is something to average — "0.0 out of 5" is a
              worse first impression than no scoreboard at all. */}
          {overall !== null && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Stars rating={Math.round(overall)} />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                {overall.toFixed(1)} average · {totalReviews}{" "}
                {totalReviews === 1 ? "review" : "reviews"} across {total}{" "}
                {total === 1 ? "style" : "styles"}
              </p>
            </div>
          )}
        </section>

        {/* ─── Sort ─────────────────────────────────────────────────── */}
        {total > 1 && (
          <nav className="border-b border-zinc-100 bg-white">
            <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-6 py-4 md:justify-center md:px-12">
              {REVIEW_SORTS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildHref(1, opt.value)}
                  aria-current={sort === opt.value ? "true" : undefined}
                  className={`shrink-0 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                    sort === opt.value
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </nav>
        )}

        {/* ─── Product grid ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1440px] px-6 py-14 md:px-12 md:py-20">
          {items.length === 0 ? (
            <div className="mx-auto max-w-md border border-dashed border-zinc-200 px-8 py-20 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                No reviews yet
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                Nothing has been reviewed so far. Every product page has a review form at the
                bottom — the first one lands here.
              </p>
              <Link
                href="/shop"
                className="mt-7 inline-block border-b border-zinc-950 pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-950 transition-colors hover:border-zinc-400 hover:text-zinc-600"
              >
                Browse the collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => (
                <div key={item.productId} className="flex flex-col">
                  <ProductCard
                    product={item.product}
                    idPrefix="reviewed"
                    listId="reviews"
                    listName="Shop The Reviews"
                    priority={i < 4}
                  />
                  {/* The whole reason this listing exists, so it sits with the
                      card rather than as a badge over the photograph. */}
                  <div className="mt-2 flex items-center gap-2">
                    <Stars rating={Math.round(item.rating)} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      {item.rating.toFixed(1)} · {item.count}{" "}
                      {item.count === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── Pagination ─────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-16 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildHref(page - 1)}
                  className="border border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
                >
                  Prev
                </Link>
              )}

              {buildPageList(page, totalPages).map((item, idx) =>
                item === "…" ? (
                  <span key={`gap-${idx}`} className="px-2 text-sm text-zinc-400">
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildHref(item)}
                    aria-current={item === page ? "page" : undefined}
                    className={`min-w-[38px] border px-3 py-2 text-center text-xs font-bold transition-colors ${
                      item === page
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}

              {page < totalPages && (
                <Link
                  href={buildHref(page + 1)}
                  className="border border-zinc-200 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
