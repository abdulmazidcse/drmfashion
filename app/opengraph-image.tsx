import { ImageResponse } from "next/og"
import sharp from "sharp"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { getSettings, getStoreName } from "@/lib/settings"
import { getCache, setCache } from "@/lib/redis"
import { siteUrl } from "@/lib/siteUrl"

/**
 * The share card every page falls back to — Facebook, Instagram, WhatsApp, X.
 *
 * Next serves this at /opengraph-image and points og:image at it for any route
 * that does not name an image of its own, so a store that has uploaded nothing
 * still shares as its logo rather than as whatever picture happens to sit first
 * in the markup (which was the header's 40px country flag, blown up and blurry).
 *
 * Precedence, highest first: a page's own image (products, journal posts, CMS
 * pages), the Share Image in Settings → SEO, then this.
 */
export const runtime = "nodejs"
// Reads the store's logo and description, so it cannot be baked at build time —
// changing either in Settings has to change the card.
export const dynamic = "force-dynamic"

export const alt = "Store share card"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/** Wide enough to read at the size a timeline shows it, short enough to sit above the copy. */
const LOGO_WIDTH = 560

const INK = "#1A1A1A"
const PAPER = "#FAF9F7"
const MUTED = "#57534E"

async function loadLogoBytes(source: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//i.test(source)) {
      const res = await fetch(source)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    }
    return await readFile(path.join(process.cwd(), "public", source.replace(/^\//, "")))
  } catch {
    return null
  }
}

/**
 * The logo as a PNG data URI, with its rendered height.
 *
 * Rasterised because the logo is usually an SVG and no social scraper renders
 * one — and because satori, which draws this card, only takes bitmaps. The
 * result is cached: the conversion is the only expensive thing here, and the
 * logo changes about once a year. The key carries the source, so uploading a
 * new logo misses the old entry instead of serving it.
 */
async function logoImage(source: string): Promise<{ src: string; height: number } | null> {
  if (!source) return null

  const key = `og:logo:v1:${Buffer.from(source).toString("base64url").slice(-40)}`
  const cached = (await getCache(key)) as { src: string; height: number } | null
  if (cached?.src) return cached

  const bytes = await loadLogoBytes(source)
  if (!bytes) return null

  try {
    // A high density is what stops an SVG rasterising soft — it is drawn at that
    // resolution and then fitted to LOGO_WIDTH.
    const png = await sharp(bytes, { density: 300 })
      .resize({ width: LOGO_WIDTH, withoutEnlargement: false })
      .png()
      .toBuffer()
    const { height = 0 } = await sharp(png).metadata()

    const image = {
      src: `data:image/png;base64,${png.toString("base64")}`,
      height,
    }
    await setCache(key, image, 86400)
    return image
  } catch {
    // A logo in a format sharp cannot read should cost the card its picture,
    // not the whole image — the wordmark below stands in.
    return null
  }
}

/** Long descriptions are set for search results; a card has room for one line of two. */
function trim(text: string, max = 120): string {
  const clean = text.trim().replace(/\s+/g, " ")
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(" ")) || cut}…`
}

export default async function OpengraphImage() {
  const [storeName, settings] = await Promise.all([
    getStoreName().catch(() => "Store"),
    getSettings().catch(() => ({} as Record<string, string>)),
  ])

  const description = trim(
    settings.seo_meta_description?.trim() ||
      `High-end contemporary fashion tailored for modern individuals. Shop the latest collections at ${storeName}.`
  )

  // The configured logo first, the bundled one as a backstop so a store that has
  // not uploaded anything still gets a branded card rather than plain text.
  const logo =
    (await logoImage(settings.brand_logo_url?.trim() || "")) ?? (await logoImage("/logo.svg"))

  const domain = siteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PAPER,
          padding: "72px 90px",
        }}
      >
        {logo ? (
          <img src={logo.src} width={LOGO_WIDTH} height={logo.height} alt="" />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 800,
              letterSpacing: -2,
              color: INK,
              textTransform: "uppercase",
            }}
          >
            {storeName}
          </div>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 44,
            maxWidth: 880,
            fontSize: 32,
            lineHeight: 1.4,
            color: MUTED,
            textAlign: "center",
          }}
        >
          {description}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 52,
            fontSize: 22,
            letterSpacing: 6,
            color: INK,
          }}
        >
          {domain.toUpperCase()}
        </div>

        {/* A band of brand colour so the card reads as designed rather than as a
            screenshot of a blank page. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 16,
            backgroundColor: INK,
          }}
        />
      </div>
    ),
    size
  )
}
