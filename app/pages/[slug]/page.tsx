import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { getStoreName } from "@/lib/settings"
import { buildExcerpt } from "@/lib/journal"
import AboutModelToggle from "@/components/AboutModelToggle"
import AboutClientPage from "@/components/AboutClientPage"
import BlockRenderer from "@/components/admin/PageBuilder/BlockRenderer"
import { firstHtmlImage, stripHtmlImages } from "@/lib/htmlImage"

export const revalidate = 300

/** Returns true when content is new JSON block format */
function isBlockContent(content: string): boolean {
  if (!content?.trim()) return false
  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed)
  } catch { return false }
}

interface ParsedSection {
  heading: string | null;
  body: string;
  image: string | null;
  /** Alternative text the author set on the image; "" when they left it empty. */
  imageAlt: string;
  /** Caption the author attached to the image; "" when there is none. */
  imageCaption: string;
}

/** Both halves of a section carry the image copy through, so lift it once. */
function sectionFromBody(heading: string | null, body: string): ParsedSection {
  const found = firstHtmlImage(body);
  return {
    heading,
    body: found ? stripHtmlImages(body) : body,
    image: found?.src ?? null,
    imageAlt: found?.alt ?? "",
    imageCaption: found?.caption ?? "",
  };
}

function parseHTMLToSections(htmlContent: string): ParsedSection[] {
  // 1. Strip out first H1 heading if present (as it's often the page title)
  let cleanHtml = htmlContent.replace(/<h1>.*?<\/h1>/gi, "");

  // 2. Split by <h2> tags
  const rawParts = cleanHtml.split(/<h2[^>]*>/i);

  const sections: ParsedSection[] = [];

  // The first part is the intro (content before any <h2>)
  if (rawParts[0] && rawParts[0].trim()) {
    sections.push(sectionFromBody(null, rawParts[0].trim()));
  }

  // Subsequent parts are sections starting with H2
  for (let i = 1; i < rawParts.length; i++) {
    const part = rawParts[i];
    const splitIndex = part.indexOf("</h2>");
    if (splitIndex === -1) continue;

    const heading = part.substring(0, splitIndex).replace(/<[^>]*>/g, "").trim();
    sections.push(sectionFromBody(heading, part.substring(splitIndex + 5).trim()));
  }

  return sections;
}

/**
 * Flattens a page body down to plain text so a page with no metaDescription
 * still gets a sensible one. Handles both storage formats: the JSON block array
 * from the builder and the legacy HTML string.
 */
function contentToPlainText(content: string): string {
  if (!content?.trim()) return ""

  // Block format — pull the text-bearing props out of every block, in order.
  if (isBlockContent(content)) {
    try {
      const blocks = JSON.parse(content) as Array<{ props?: Record<string, unknown> }>
      const TEXT_KEYS = ["heading", "subheading", "subtext", "html", "leftHtml", "rightHtml", "caption"]
      return blocks
        .flatMap(block =>
          TEXT_KEYS
            .map(key => block?.props?.[key])
            .filter((value): value is string => typeof value === "string" && value.trim() !== "")
        )
        .join(" ")
    } catch {
      return ""
    }
  }

  return content
}

/** First image in the body, used as the social preview when none is set. */
function firstImageFromContent(content: string): string | undefined {
  if (isBlockContent(content)) {
    try {
      const blocks = JSON.parse(content) as Array<{ props?: Record<string, unknown> }>
      for (const block of blocks) {
        for (const key of ["backgroundImage", "src", "leftImage", "rightImage"]) {
          const value = block?.props?.[key]
          if (typeof value === "string" && value.trim()) return value
        }
      }
    } catch {
      return undefined
    }
    return undefined
  }

  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const [storeName, page] = await Promise.all([
    getStoreName(),
    prisma.page.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        published: true,
        content: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
      },
    }),
  ])

  if (!page || !page.published) {
    // Unpublished pages are noindex as well as 404 — a draft that briefly went
    // live should not linger in the index once it is pulled back.
    return { title: `Page Not Found | ${storeName}`, robots: { index: false, follow: false } }
  }

  const headline = page.metaTitle?.trim() || page.title
  const description = page.metaDescription?.trim() || buildExcerpt(contentToPlainText(page.content))
  const image = firstImageFromContent(page.content)

  return {
    title: `${headline} | ${storeName}`,
    description: description || undefined,
    keywords: page.metaKeywords?.trim() || undefined,
    alternates: { canonical: `/pages/${page.slug}` },
    openGraph: {
      type: "website",
      url: `/pages/${page.slug}`,
      title: headline,
      description: description || undefined,
      siteName: storeName,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: headline,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  }
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const storeName = await getStoreName()
  
  

  const page = await prisma.page.findUnique({
    where: { slug }
  })

  if (!page || !page.published) {
    notFound()
  }

  // ─── New Block Builder format ─────────────────────────────────────────────
  if (isBlockContent(page.content)) {
    return (
      <div className="flex flex-col min-h-screen bg-white font-sans antialiased text-zinc-950">
        <Header />
        <main className="flex-1 w-full">
          <BlockRenderer content={page.content} />
        </main>
        <Footer />
      </div>
    )
  }

  // ─── Legacy HTML format (backward compat) ─────────────────────────────────
  // Check if this page contains visual components (images) to render in premium multi-section layout
  const hasImages = /<img[^>]+src=/i.test(page.content);

  if (hasImages) {
    // 1. Extract first image for Hero background, keeping the alt text the
    //    author gave it — the page title is only a fallback for when they left
    //    the field empty.
    const heroImage = firstHtmlImage(page.content);
    const heroBgImage = heroImage?.src ?? null;

    // 2. Strip first image so it doesn't double-render
    const contentWithoutFirstImage = heroImage
      ? page.content.replace(heroImage.match, "")
      : page.content;

    // 3. Parse into sections
    const sections = parseHTMLToSections(contentWithoutFirstImage);

    return (
      <div className="flex flex-col min-h-screen bg-white font-sans antialiased text-zinc-950">
        <Header />
        
        <main className="flex-1 w-full">
          {/* ─── PREMIUM HERO BANNER ─── */}
          <section className="relative w-full min-h-[60vh] flex items-end bg-zinc-900 overflow-hidden">
            {heroBgImage ? (
              <>
                <img
                  src={heroBgImage}
                  alt={heroImage?.alt || page.title}
                  className="absolute inset-0 w-full h-full object-cover object-top filter grayscale-[10%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800" />
            )}
            
            <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 pb-12 md:pb-16 text-white">
              <h1 className="text-3xl md:text-[52px] leading-[1.1] font-black uppercase tracking-tight max-w-3xl">
                {page.title}
              </h1>
              <div className="w-12 h-1 bg-white mt-6"></div>
            </div>
          </section>

          {/* ─── DYNAMIC SECTIONS ─── */}
          {sections.map((sec, idx) => {
            const isLast = idx === sections.length - 1;
            const isDark = isLast && sections.length > 2; // Make last section a dark brand banner
            const bgClass = isDark 
              ? "bg-zinc-950 text-white" 
              : idx % 3 === 1 
                ? "bg-[#f5f5f5]" 
                : idx % 3 === 2 
                  ? "bg-[#ebebeb]" 
                  : "bg-white";

            const isModelToggle = slug === "about-us" && sec.heading?.toLowerCase().includes("exclusively for tall");

            if (sec.image || isModelToggle) {
              // Split 50/50 layout
              const imgOnLeft = idx % 2 === 1;
              // Built once and placed on whichever side this section takes —
              // the two branches below differ only in column order.
              const sectionImage = isModelToggle ? (
                <AboutModelToggle />
              ) : (
                // Absolutely positioned inside the figure rather than sized with
                // h-full: the figure is the flex item now, and a percentage
                // height on a child of one has no definite box to resolve
                // against.
                <figure className="relative w-full self-stretch min-h-[350px] lg:min-h-[500px]">
                  <img
                    src={sec.image || ""}
                    alt={sec.imageAlt || sec.heading || page.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {sec.imageCaption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-4 pt-10 text-xs font-light leading-relaxed text-white/90">
                      {sec.imageCaption}
                    </figcaption>
                  )}
                </figure>
              );
              return (
                <section key={idx} className={`w-full ${bgClass} border-b border-zinc-100/50`}>
                  {sec.heading && (
                    <div className="text-center pt-14 px-6">
                      <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight uppercase">
                        {sec.heading}
                      </h2>
                      <div className={`w-10 h-[2px] mx-auto mt-5 ${isDark ? "bg-white" : "bg-zinc-900"}`} />
                    </div>
                  )}
                  
                  <div className="flex flex-col lg:flex-row">
                    {imgOnLeft ? (
                      <>
                        <div className="w-full lg:w-1/2 flex items-stretch">
                          {sectionImage}
                        </div>
                        <div className="w-full lg:w-1/2 px-8 md:px-14 lg:px-20 py-10 lg:py-16 flex flex-col justify-center">
                          <div 
                            className="custom-html max-w-none text-zinc-600"
                            dangerouslySetInnerHTML={{ __html: sec.body }} 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full lg:w-1/2 px-8 md:px-14 lg:px-20 py-10 lg:py-16 flex flex-col justify-center order-2 lg:order-1">
                          <div 
                            className="custom-html max-w-none text-zinc-600"
                            dangerouslySetInnerHTML={{ __html: sec.body }} 
                          />
                        </div>
                        <div className="w-full lg:w-1/2 flex items-stretch order-1 lg:order-2">
                          {sectionImage}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )
            } else {
              // Centered Full-Width layout
              return (
                <section key={idx} className={`w-full py-16 md:py-24 ${bgClass} border-b border-zinc-100/50`}>
                  <div className="max-w-4xl mx-auto px-6 md:px-12">
                    {sec.heading && (
                      <div className="text-center mb-10">
                        <h2 className={`text-[22px] md:text-[32px] font-extrabold tracking-tight uppercase ${isDark ? "text-white" : "text-zinc-950"}`}>
                          {sec.heading}
                        </h2>
                        <div className={`w-10 h-[2px] mx-auto mt-5 ${isDark ? "bg-white" : "bg-zinc-900"}`} />
                      </div>
                    )}
                    <div 
                      className={`custom-html max-w-none ${isDark ? "text-zinc-300 [&_strong]:text-white" : "text-zinc-600"} ${isDark ? "text-center" : ""}`}
                      dangerouslySetInnerHTML={{ __html: sec.body }} 
                    />
                    
                    {isDark && (
                      <div className="text-center mt-10">
                        <Link href="/shop" className="inline-block px-10 py-3.5 border border-white text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-white hover:text-zinc-950 transition-all text-white">
                          Shop All
                        </Link>
                      </div>
                    )}
                  </div>
                </section>
              )
            }
          })}

          {/* ─── ADD SHOP BY CATEGORY IN ABOUT US PAGE DYNAMICALLY ─── */}
          {slug === "about-us" && (
            <section className="w-full bg-white py-14 md:py-24 border-t border-zinc-100">
              <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
                <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight mb-10">From Here, Shop by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <Link href="/shop?category=mens" className="group relative aspect-[3/4] overflow-hidden bg-zinc-100 block">
                    <div className="absolute inset-0 bg-zinc-950/30 group-hover:bg-zinc-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Men&apos;s Tops</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=mens-bottoms" className="group relative aspect-[3/4] overflow-hidden bg-zinc-200 block">
                    <div className="absolute inset-0 bg-zinc-950/30 group-hover:bg-zinc-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Men&apos;s Bottoms</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=womens" className="group relative aspect-[3/4] overflow-hidden bg-zinc-100 block">
                    <div className="absolute inset-0 bg-zinc-950/30 group-hover:bg-zinc-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Women&apos;s Tops</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=womens-bottoms" className="group relative aspect-[3/4] overflow-hidden bg-zinc-200 block">
                    <div className="absolute inset-0 bg-zinc-950/30 group-hover:bg-zinc-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Women&apos;s Bottoms</span>
                    </div>
                  </Link>
                </div>
              </div>
            </section>
          )}
        </main>
        
        <Footer />
      </div>
    )
  }

  // Classic Editorial Layout for standard/legal pages
  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] font-sans antialiased text-zinc-950">
      <Header />
      
      {/* Sleek Minimalist Hero for Text-focused Pages */}
      <div className="w-full bg-zinc-950 text-white relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-700 via-zinc-900 to-black"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-3">{storeName} Page</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4 animate-fade-in">
            {page.title}
          </h1>
          <div className="w-16 h-1 bg-white mx-auto mt-6"></div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 -mt-10 mb-24 relative z-20">
        <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-zinc-100 p-8 md:p-14 lg:p-16">
          <div 
            className="custom-html max-w-none text-zinc-600"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
