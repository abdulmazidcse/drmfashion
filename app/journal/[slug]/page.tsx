import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Clock, User } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getStoreName } from "@/lib/settings"
import { formatProductUrls } from "@/lib/utils"
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect"
import {
  buildExcerpt,
  collectProductSlugs,
  formatJournalDate,
  hasAuthoredToc,
  prepareJournalContent,
  splitIntro,
} from "@/lib/journal"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import NewsletterForm from "@/components/NewsletterForm"
import JournalCard from "@/components/journal/JournalCard"
import JournalProductEmbed from "@/components/journal/JournalProductEmbed"
import JournalShare from "@/components/journal/JournalShare"
import JournalToc from "@/components/journal/JournalToc"
import JournalViewTracker from "@/components/journal/JournalViewTracker"

export const revalidate = 300

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const [storeName, post] = await Promise.all([
    getStoreName(),
    prisma.journalPost.findUnique({ where: { slug } }),
  ])

  if (!post || !post.published) {
    return { title: `Story Not Found | ${storeName}` }
  }

  const description = post.metaDescription || post.excerpt || buildExcerpt(post.content)

  return {
    title: `${post.metaTitle || post.title} | ${storeName} Journal`,
    description,
    keywords: post.metaKeywords || (post.tags.length ? post.tags.join(", ") : undefined),
    openGraph: {
      type: "article",
      title: post.metaTitle || post.title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
      publishedTime: (post.publishedAt || post.createdAt).toISOString(),
    },
  }
}

export default async function JournalArticlePage({ params }: PageProps) {
  const { slug } = await params

  const post = await prisma.journalPost.findUnique({
    where: { slug },
    include: { category: { select: { id: true, name: true, slug: true } } },
  })

  if (!post || !post.published) notFound()

  const publishedDate = post.publishedAt || post.createdAt

  // Article body → heading anchors + interleaved html / product-grid blocks.
  const { blocks, headings } = prepareJournalContent(post.content)
  const { intro, rest } = splitIntro(blocks)

  const productSlugs = collectProductSlugs(blocks)
  const embeddedProducts = productSlugs.length
    ? await prisma.product.findMany({
        where: { slug: { in: productSlugs }, published: true, deletedAt: null },
        // Rendered by JournalProductEmbed as <ProductCard>.
        select: PRODUCT_CARD_SELECT,
      })
    : []

  const productsBySlug = new Map(embeddedProducts.map((p) => [p.slug, formatProductUrls(p)]))

  const [related, prevPost, nextPost] = await Promise.all([
    prisma.journalPost.findMany({
      where: {
        published: true,
        id: { not: post.id },
        ...(post.categoryId ? { categoryId: post.categoryId } : {}),
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { category: { select: { name: true, slug: true } } },
    }),
    prisma.journalPost.findFirst({
      where: { published: true, id: { not: post.id }, publishedAt: { lt: publishedDate } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, publishedAt: true, createdAt: true },
    }),
    prisma.journalPost.findFirst({
      where: { published: true, id: { not: post.id }, publishedAt: { gt: publishedDate } },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, title: true, publishedAt: true, createdAt: true },
    }),
  ])

  // Fall back to the newest stories when the category doesn't have enough siblings.
  const relatedPosts =
    related.length > 0
      ? related
      : await prisma.journalPost.findMany({
          where: { published: true, id: { not: post.id } },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 3,
          include: { category: { select: { name: true, slug: true } } },
        })

  // The article sits in a wide canvas, but prose is held to a reading measure
  // inside it. At 16px/1.85 a 760px line already runs to ~90 characters, past
  // the comfortable 60–75, so the fix for the empty margins is to let the
  // visual blocks use the full width rather than to stretch the text.
  const PROSE = "mx-auto w-full max-w-[760px]"

  const renderBlocks = (items: typeof rest) =>
    items.map((block, index) => {
      if (block.type === "html") {
        return (
          <div
            key={`html-${index}`}
            className={`${PROSE} journal-content`}
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        )
      }

      // Product grids break out to the full canvas: at reading width only two
      // cards fit per row, which left the page looking like a narrow ribbon.
      const products = block.slugs.map((s) => productsBySlug.get(s)).filter(Boolean)
      return (
        <JournalProductEmbed key={`products-${index}`} products={products} caption={block.caption} />
      )
    })

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-foreground antialiased">
      <Header />
      <JournalViewTracker slug={post.slug} />

      <main className="flex-1 w-full">
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <section className="relative flex min-h-[45vh] w-full items-end overflow-hidden bg-brand-ink-soft md:min-h-[60vh]">
          {post.coverImage ? (
            <>
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-ink via-brand-ink-soft to-brand-ink-soft" />
          )}

          <div className="relative z-10 mx-auto w-full max-w-[900px] px-6 pb-12 pt-24 text-white md:px-12 md:pb-16">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white/80">
              {post.category && (
                <>
                  <Link
                    href={`/journal?category=${post.category.slug}`}
                    className="bg-white px-3 py-1.5 font-bold text-foreground transition-colors hover:bg-line"
                  >
                    {post.category.name}
                  </Link>
                  <span className="h-3 w-px bg-white/40" />
                </>
              )}
              <span>{formatJournalDate(publishedDate)}</span>
              <span className="h-3 w-px bg-white/40" />
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {post.readTime} min read
              </span>
              {post.authorName && (
                <>
                  <span className="h-3 w-px bg-white/40" />
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" /> {post.authorName}
                  </span>
                </>
              )}
            </div>

            {/* Sentence case and a line cap, because a post title is whatever
                the author typed — often a full sentence. Forcing 52px caps on
                one of those buries the hero under a block of shouting, and an
                uncapped excerpt (these are frequently two paragraphs long)
                pushes the whole thing off screen. */}
            <h1 className="mt-5 line-clamp-4 max-w-3xl text-[28px] font-bold leading-[1.15] tracking-tight md:text-[42px]">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
                {post.excerpt}
              </p>
            )}
          </div>
        </section>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <article className="mx-auto w-full max-w-[1120px] px-6 py-12 md:py-16">
          <div className={PROSE}>
            <Link
              href="/journal"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-soft transition-colors hover:text-brand-700"
            >
              <ArrowLeft className="h-3 w-3" /> All stories
            </Link>
          </div>

          <div className="mt-10">
            {intro && (
              <div className={`${PROSE} journal-content`} dangerouslySetInnerHTML={{ __html: intro }} />
            )}
            {/* Skipped when the author already wrote their own contents list —
                otherwise imported posts render two of them back to back. */}
            {!hasAuthoredToc(intro) && (
              <div className={PROSE}>
                <JournalToc headings={headings} />
              </div>
            )}
            {renderBlocks(rest)}
          </div>

          {post.tags.length > 0 && (
            <div className={`${PROSE} mt-12 flex flex-wrap items-center gap-2 border-t border-line pt-8`}>
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.2em] text-faint">Tags</span>
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/journal?tag=${encodeURIComponent(tag)}`}
                  className="border border-line px-3 py-1.5 text-[11px] font-medium text-soft transition-colors hover:border-brand-600 hover:text-brand-700"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className={`${PROSE} mt-8 border-t border-line pt-8`}>
            <JournalShare slug={post.slug} title={post.title} />
          </div>
        </article>

        {/* ─── Prev / Next ──────────────────────────────────────────── */}
        {(prevPost || nextPost) && (
          <nav className="border-t border-line">
            <div className="mx-auto grid max-w-[1440px] grid-cols-1 md:grid-cols-2">
              {prevPost ? (
                <Link
                  href={`/journal/${prevPost.slug}`}
                  className="group border-b border-line px-6 py-10 transition-colors hover:bg-[#fafafa] md:border-b-0 md:border-r md:px-12 md:py-12"
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-faint">
                    <ArrowLeft className="h-3 w-3" /> Previous
                  </span>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.15em] text-soft">
                    {formatJournalDate(prevPost.publishedAt || prevPost.createdAt)}
                  </p>
                  <p className="mt-2 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-soft md:text-xl">
                    {prevPost.title}
                  </p>
                </Link>
              ) : (
                <div className="hidden md:block" />
              )}

              {nextPost && (
                <Link
                  href={`/journal/${nextPost.slug}`}
                  className="group px-6 py-10 text-right transition-colors hover:bg-[#fafafa] md:px-12 md:py-12"
                >
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-faint">
                    Next <ArrowRight className="h-3 w-3" />
                  </span>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.15em] text-soft">
                    {formatJournalDate(nextPost.publishedAt || nextPost.createdAt)}
                  </p>
                  <p className="mt-2 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-soft md:text-xl">
                    {nextPost.title}
                  </p>
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* ─── Related ──────────────────────────────────────────────── */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-line bg-[#fafafa] px-6 py-14 md:px-12 md:py-20">
            <div className="mx-auto max-w-[1440px]">
              <div className="mb-10 flex items-center gap-4">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Keep Reading</h2>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((item) => (
                  <JournalCard key={item.id} post={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Newsletter ───────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-6 py-16 text-center md:px-12 md:py-20">
          <h2 className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Never miss a story</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-soft">
            New guides, fabric notes and early access to drops — straight to your inbox.
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
