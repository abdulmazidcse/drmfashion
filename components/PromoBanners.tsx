import { getActiveBanners, type BannerPosition } from "@/lib/banners"
import BannerCard from "./BannerCard"
import BannerSlider from "./BannerSlider"

/**
 * Admin-managed promo banners for one storefront slot (Admin → Banners).
 *
 * Server component: reads straight from lib/banners (Redis-cached) and
 * renders nothing when the slot is empty, so callers can drop it in
 * unconditionally. One banner becomes a wide strip; several become a grid —
 * or, with `variant="slider"`, a sliding carousel instead (used for the
 * home_top slot only; every other caller keeps the grid).
 */
export default async function PromoBanners({
  position,
  variant = "grid",
}: {
  position: BannerPosition
  variant?: "grid" | "slider"
}) {
  const banners = await getActiveBanners(position)
  if (banners.length === 0) return null

  if (banners.length === 1) {
    return (
      <section aria-label="Promotions" className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <BannerCard banner={banners[0]} hero />
        </div>
      </section>
    )
  }

  if (variant === "slider") {
    return (
      <section aria-label="Promotions" className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <BannerSlider banners={banners} />
        </div>
      </section>
    )
  }

  const grid = `grid grid-cols-1 gap-4 md:grid-cols-2${banners.length >= 3 ? " xl:grid-cols-3" : ""}`

  return (
    <section aria-label="Promotions" className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className={`mx-auto max-w-[1600px] ${grid}`}>
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} hero={false} />
        ))}
      </div>
    </section>
  )
}
