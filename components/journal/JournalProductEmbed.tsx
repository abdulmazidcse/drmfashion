import ProductCard from "@/components/ProductCard"

/**
 * Renders a `[products …]` shortcode from an article body as a real,
 * shoppable product grid.
 */
export default function JournalProductEmbed({
  products,
  caption,
}: {
  products: any[]
  caption?: string | null
}) {
  if (products.length === 0) return null

  // These grids sit on the article's full-width canvas rather than in the 760px
  // reading column, so each size steps out past that measure — the point is for
  // the embed to read as a deliberate break from the text, not to shrink back
  // inside it. A single card is the exception: full width would be absurd.
  const columns =
    products.length === 1
      ? "grid-cols-1 max-w-sm mx-auto"
      : products.length === 2
        ? "grid-cols-2 max-w-4xl mx-auto"
        : products.length === 3
          ? "grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto"
          : "grid-cols-2 md:grid-cols-4"

  return (
    <div className="my-12">
      <div className={`grid gap-4 md:gap-6 ${columns}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} idPrefix="journal" showBadges={false} />
        ))}
      </div>
      {caption && <p className="mt-5 text-center text-[13px] leading-relaxed text-soft">{caption}</p>}
    </div>
  )
}
