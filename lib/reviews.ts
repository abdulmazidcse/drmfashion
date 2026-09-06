import { Prisma } from "@prisma/client"
import { formatImageUrl, reviewerDisplayName, splitReviewAuthor } from "@/lib/utils"

/** Products per page on /reviews, which lists what has been reviewed. */
export const REVIEWED_PRODUCTS_PAGE_SIZE = 24

export const REVIEW_SORTS = [
  { value: "top-rated", label: "Top rated" },
  { value: "most-reviewed", label: "Most reviewed" },
] as const

export type ReviewSort = (typeof REVIEW_SORTS)[number]["value"]

/**
 * Everything a review card draws, and nothing else. Lives here rather than at
 * the call site because recovering the author is not obvious — the visitor's
 * name is buried in the comment text (see `splitReviewAuthor`) — and that has
 * to stay identical wherever a quote is shown.
 */
export const REVIEW_CARD_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { name: true } },
  product: { select: { title: true, slug: true, thumbnail: true } },
} satisfies Prisma.ReviewSelect

type RawReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  user: { name: string | null } | null
  product: { title: string; slug: string; thumbnail: string } | null
}

export interface ReviewCardData {
  id: string
  rating: number
  comment: string
  /** ISO string: these rows travel through the Redis cache. */
  createdAt: string
  authorName: string
  product: { title: string; slug: string; thumbnail: string } | null
}

/** Only reviews a visitor could act on — the product has to still be buyable. */
export const REVIEW_VISIBLE_WHERE = {
  comment: { not: null },
  product: { published: true, deletedAt: null },
} satisfies Prisma.ReviewWhereInput

export function toReviewCard(raw: RawReview): ReviewCardData {
  const comment = (raw.comment || "").trim()
  const { author, body } = splitReviewAuthor(comment)

  return {
    id: raw.id,
    rating: raw.rating,
    comment: body,
    createdAt: raw.createdAt.toISOString(),
    authorName: reviewerDisplayName(author ?? raw.user?.name),
    product: raw.product
      ? { ...raw.product, thumbnail: formatImageUrl(raw.product.thumbnail) }
      : null,
  }
}

/**
 * `comment: { not: null }` still lets a comment of pure whitespace through, and
 * a card with an empty quote in it is worse than one fewer card.
 */
export function toReviewCards(raw: RawReview[]): ReviewCardData[] {
  return raw.filter((r) => (r.comment || "").trim().length > 0).map(toReviewCard)
}
