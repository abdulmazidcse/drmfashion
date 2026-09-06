import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Clock } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getStoreName } from "@/lib/settings"
import { JOURNAL_PAGE_SIZE, formatJournalDate } from "@/lib/journal"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import NewsletterForm from "@/components/NewsletterForm"
import JournalCard from "@/components/journal/JournalCard"

export const revalidate = 300

type SearchParams = Promise<{ page?: string; category?: string; tag?: string }>

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `Journal | ${storeName}`,
    description: `Style guides, fabric deep-dives and stories from the ${storeName} community.`,
    // Pagination and category/tag filters all resolve back to the index.
    alternates: { canonical: "/journal" },
  }
}

export default async function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: pageParam, category: categorySlug, tag } = await searchParams

  const page = Math.max(1, Number.parseInt(pageParam || "1", 10) || 1)
  const storeName = await getStoreName()

  const [categories, activeCategory] = await Promise.all([
    prisma.journalCategory.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, description: true },
    }),
    categorySlug
      ? prisma.journalCategory.findUnique({ where: { slug: categorySlug } })
      : Promise.resolve(null),
  ])

  const where = {
    published: true,
    ...(activeCategory ? { categoryId: activeCategory.id } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  }

  // The hero slot is only used on the unfiltered first page.
  const showHero = page === 1 && !activeCategory && !tag

  const featured = showHero
    ? (await prisma.journalPost.findFirst({
        where: { published: true, featured: true },
        include: { category: { select: { name: true, slug: true } } },
      })) ??
      (await prisma.journalPost.findFirst({
        where: { published: true },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: { category: { select: { name: true, slug: true } } },
      }))
    : null

  const gridWhere = featured ? { ...where, id: { not: featured.id } } : where

  const [total, posts] = await Promise.all([
    prisma.journalPost.count({ where: gridWhere }),
    prisma.journalPost.findMany({
      where: gridWhere,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * JOURNAL_PAGE_SIZE,
      take: JOURNAL_PAGE_SIZE,
      include: { category: { select: { name: true, slug: true } } },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE))

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams()
    if (categorySlug) params.set("category", categorySlug)
    if (tag) params.set("tag", tag)
    if (targetPage > 1) params.set("page", String(targetPage))
    const query = params.toString()
    return query ? `/journal?${query}` : "/journal"
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-zinc-950 antialiased">
      <Header />

      <main className="flex-1 w-full">
        {/* ─── Masthead ─────────────────────────────────────────────── */}
        <section className="border-b border-zinc-100 bg-white px-6 pb-10 pt-14 text-center md:px-12 md:pb-14 md:pt-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">{storeName}</p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">Journal</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base">
            {activeCategory?.description ||
              "Fit guides, fabric deep-dives and the stories behind the collection — written for the people who wear it."}
          </p>
        </section>

        {/* ─── Topic filters ──────────────────────────────────────────
            A filter bar offering a single topic is not a filter, it just looks
            unfinished — so it appears once there is a real choice to make. The
            `activeCategory || tag` case keeps it rendered while a filter is
            applied, so there is always a way back to all stories. */}
        {(categories.length > 1 || activeCategory || tag) && (
          <nav className="border-b border-zinc-100 bg-white">
            <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-6 py-4 md:justify-center md:px-12">
              <Link
                href="/journal"
                className={`shrink-0 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                  !activeCategory
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                }`}
              >
                All Stories
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/journal?category=${cat.slug}`}
                  className={`shrink-0 border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${
                    activeCategory?.id === cat.id
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </nav>
        )}

        {tag && (
          <div className="mx-auto max-w-[1440px] px-6 pt-8 md:px-12">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Tagged “{tag}” ·{" "}
              <Link href="/journal" className="underline hover:text-zinc-950">
                Clear
              </Link>
            </p>
          </div>
        )}

        {/* ─── Featured hero ────────────────────────────────────────── */}
        {featured && (
          <section className="mx-auto max-w-[1440px] px-6 pt-10 md:px-12 md:pt-16">
            <Link href={`/journal/${featured.slug}`} className="group grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 lg:aspect-[4/3]">
                {featured.coverImage ? (
                  <Image
                    src={featured.coverImage}
                    alt={featured.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Journal</span>
                  </div>
                )}
                <span className="absolute left-5 top-5 bg-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white">
                  Featured
                </span>
              </div>

              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
                  {featured.category && (
                    <>
                      <span className="text-zinc-950">{featured.category.name}</span>
                      <span className="h-3 w-px bg-zinc-300" />
                    </>
                  )}
                  <span>{formatJournalDate(featured.publishedAt || featured.createdAt)}</span>
                  <span className="h-3 w-px bg-zinc-300" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {featured.readTime} min read
                  </span>
                </div>

                {/* Sentence case, not uppercase: post titles are author-written
                    headlines of any length, and forcing caps on a sentence-long
                    one turns the hero into a wall of shouting. It also matches
                    the treatment JournalCard already uses for its titles. */}
                <h2 className="mt-4 line-clamp-4 text-[26px] font-bold leading-[1.15] tracking-tight md:text-[38px]">
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="mt-5 line-clamp-3 max-w-xl text-base leading-relaxed text-zinc-600">
                    {featured.excerpt}
                  </p>
                )}

                <span className="mt-7 inline-flex items-center gap-2 self-start bg-zinc-950 px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white transition-colors group-hover:bg-zinc-800">
                  Read the story
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* ─── Story grid ───────────────────────────────────────────────
            When the hero has already shown the only published story there is
            nothing left to list, so the whole section is skipped rather than
            printing an apology for being empty directly beneath it. The empty
            state below is therefore only ever the genuine "nothing published"
            case, and it is designed rather than a bare line of grey text. */}
        {(posts.length > 0 || !featured) && (
          <section className="mx-auto max-w-[1440px] px-6 py-14 md:px-12 md:py-20">
            {posts.length === 0 ? (
              <div className="mx-auto max-w-md border border-dashed border-zinc-200 px-8 py-20 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {activeCategory || tag ? "Nothing here yet" : "Coming soon"}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                  {activeCategory || tag
                    ? "No stories match this filter yet."
                    : "The first stories are being written. Check back shortly."}
                </p>
                {(activeCategory || tag) && (
                  <Link
                    href="/journal"
                    className="mt-7 inline-flex items-center gap-1.5 border-b border-zinc-950 pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-950 transition-colors hover:border-zinc-400 hover:text-zinc-600"
                  >
                    View all stories
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              <>
                {featured && (
                  <div className="mb-10 flex items-center gap-4">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-950">Latest Stories</h2>
                    <div className="h-px flex-1 bg-zinc-200" />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => (
                    <JournalCard key={post.id} post={post} />
                  ))}
                </div>
              </>
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
        )}

        {/* ─── Newsletter ───────────────────────────────────────────── */}
        <section className="border-t border-zinc-100 bg-[#fafafa] px-6 py-16 text-center md:px-12 md:py-20">
          <h2 className="text-2xl font-black uppercase tracking-tight md:text-3xl">Never miss a story</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600">
            Get new journal entries, fit guides and early access to drops straight to your inbox.
          </p>
          <div className="mx-auto mt-7 max-w-md">
            <NewsletterForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

/** Compact pagination: 1 2 3 … 30 */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current])
  if (current - 1 > 1) pages.add(current - 1)
  if (current + 1 < total) pages.add(current + 1)
  if (current <= 3) [2, 3].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 1, total - 2].forEach((p) => pages.add(p))

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const out: (number | "…")[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…")
    out.push(p)
    prev = p
  }
  return out
}
