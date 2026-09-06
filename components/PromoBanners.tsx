import Link from "next/link"
import { getActiveBanners, type ActiveBanner, type BannerPosition } from "@/lib/banners"

/**
 * Admin-managed promo banners for one storefront slot (Admin → Banners).
 *
 * Server component: reads straight from lib/banners (Redis-cached) and
 * renders nothing when the slot is empty, so callers can drop it in
 * unconditionally. One banner becomes a wide strip; several become a grid.
 */
export default async function PromoBanners({ position }: { position: BannerPosition }) {
  const banners = await getActiveBanners(position)
  if (banners.length === 0) return null

  const single = banners.length === 1
  const grid = single
    ? ""
    : `grid grid-cols-1 gap-4 md:grid-cols-2${banners.length >= 3 ? " xl:grid-cols-3" : ""}`

  return (
    <section aria-label="Promotions" className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-[1600px] ${grid}`}>
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} hero={single} />
        ))}
      </div>
    </section>
  )
}

const isExternal = (href: string) => /^https?:\/\//i.test(href)

function BannerCard({ banner, hero }: { banner: ActiveBanner; hero: boolean }) {
  const card = (
    <div
      className={`group relative w-full overflow-hidden bg-zinc-100 ${
        hero ? "aspect-[4/5] sm:aspect-[21/9]" : "aspect-[4/5] sm:aspect-[4/3]"
      }`}
    >
      {/* Bare <img> rather than next/image: the optimizer's remotePatterns are
          scoped to product hosts and these are free-form uploads. <picture>
          swaps in the portrait crop on phones when one was uploaded. */}
      <picture>
        {banner.mobileImage && <source media="(max-width: 767px)" srcSet={banner.mobileImage} />}
        <img
          src={banner.image}
          alt={banner.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </picture>

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
        {banner.subtitle && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-200">
            {banner.subtitle}
          </p>
        )}
        <h3
          className={`font-black uppercase leading-none tracking-tight ${
            hero ? "text-3xl sm:text-5xl lg:text-6xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {banner.title}
        </h3>
        {banner.buttonText && banner.link && (
          <span className="mt-5 inline-flex items-center gap-3 bg-white px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-950 transition-colors group-hover:bg-zinc-100">
            {banner.buttonText}
          </span>
        )}
      </div>
    </div>
  )

  if (!banner.link) return card

  if (isExternal(banner.link)) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">
        {card}
      </a>
    )
  }

  return (
    <Link href={banner.link} className="block">
      {card}
    </Link>
  )
}
