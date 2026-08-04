import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Link from "next/link"
import { getStoreName } from "@/lib/settings"
import AboutModelToggle from "@/components/AboutModelToggle"
import AboutClientPage from "@/components/AboutClientPage"
import BlockRenderer from "@/components/admin/PageBuilder/BlockRenderer"

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
}

function parseHTMLToSections(htmlContent: string): ParsedSection[] {
  // 1. Strip out first H1 heading if present (as it's often the page title)
  let cleanHtml = htmlContent.replace(/<h1>.*?<\/h1>/gi, "");

  // 2. Split by <h2> tags
  const rawParts = cleanHtml.split(/<h2[^>]*>/i);
  
  const sections: ParsedSection[] = [];
  
  // The first part is the intro (content before any <h2>)
  if (rawParts[0] && rawParts[0].trim()) {
    const body = rawParts[0].trim();
    const imgMatch = body.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    const image = imgMatch ? imgMatch[1] : null;
    const cleanBody = imgMatch ? body.replace(/<img[^>]*>/gi, "") : body;
    
    sections.push({
      heading: null,
      body: cleanBody,
      image
    });
  }
  
  // Subsequent parts are sections starting with H2
  for (let i = 1; i < rawParts.length; i++) {
    const part = rawParts[i];
    const splitIndex = part.indexOf("</h2>");
    if (splitIndex === -1) continue;
    
    const heading = part.substring(0, splitIndex).replace(/<[^>]*>/g, "").trim();
    const body = part.substring(splitIndex + 5).trim();
    
    const imgMatch = body.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    const image = imgMatch ? imgMatch[1] : null;
    const cleanBody = imgMatch ? body.replace(/<img[^>]*>/gi, "") : body;
    
    sections.push({
      heading,
      body: cleanBody,
      image
    });
  }
  
  return sections;
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
      <div className="flex flex-col min-h-screen">
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
    // 1. Extract first image for Hero background
    const firstImgMatch = page.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    const heroBgImage = firstImgMatch ? firstImgMatch[1] : null;
    
    // 2. Strip first image so it doesn't double-render
    let contentWithoutFirstImage = page.content;
    if (firstImgMatch) {
      contentWithoutFirstImage = page.content.replace(firstImgMatch[0], "");
    }
    
    // 3. Parse into sections
    const sections = parseHTMLToSections(contentWithoutFirstImage);

    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 w-full">
          {/* ─── PREMIUM HERO BANNER ─── */}
          <section className="relative w-full min-h-[60vh] flex items-end bg-brand-ink-soft overflow-hidden">
            {heroBgImage ? (
              <>
                <img 
                  src={heroBgImage} 
                  alt={page.title} 
                  className="absolute inset-0 w-full h-full object-cover object-top filter grayscale-[10%]" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-ink via-brand-ink-soft to-brand-ink-soft" />
            )}
            
            <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 pb-12 md:pb-16 text-white">
              <h1 className="text-3xl md:text-[52px] leading-[1.1] font-extrabold uppercase tracking-tight max-w-3xl">
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
              ? "bg-brand-ink text-white" 
              : idx % 3 === 1 
                ? "bg-[#f5f5f5]" 
                : idx % 3 === 2 
                  ? "bg-[#ebebeb]" 
                  : "bg-white";

            // Matches both the current heading and the one this section shipped
            // with, so an about-us page saved before the rewrite still renders
            // the model toggle instead of a plain image split.
            const heading = sec.heading?.toLowerCase() ?? "";
            const isModelToggle =
              slug === "about-us" &&
              (heading.includes("designed around the fit") || heading.includes("exclusively for tall"));

            if (sec.image || isModelToggle) {
              // Split 50/50 layout
              const imgOnLeft = idx % 2 === 1;
              return (
                <section key={idx} className={`w-full ${bgClass} border-b border-line/50`}>
                  {sec.heading && (
                    <div className="text-center pt-14 px-6">
                      <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight uppercase">
                        {sec.heading}
                      </h2>
                      <div className={`w-10 h-[2px] mx-auto mt-5 ${isDark ? "bg-white" : "bg-brand-ink-soft"}`} />
                    </div>
                  )}
                  
                  <div className="flex flex-col lg:flex-row">
                    {imgOnLeft ? (
                      <>
                        <div className="w-full lg:w-1/2 flex items-stretch">
                          {isModelToggle ? (
                            <AboutModelToggle />
                          ) : (
                            <img 
                              src={sec.image || ""} 
                              alt={sec.heading || page.title} 
                              className="w-full h-full object-cover min-h-[350px] lg:min-h-[500px]" 
                            />
                          )}
                        </div>
                        <div className="w-full lg:w-1/2 px-8 md:px-14 lg:px-20 py-10 lg:py-16 flex flex-col justify-center">
                          <div 
                            className="custom-html max-w-none text-soft"
                            dangerouslySetInnerHTML={{ __html: sec.body }} 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full lg:w-1/2 px-8 md:px-14 lg:px-20 py-10 lg:py-16 flex flex-col justify-center order-2 lg:order-1">
                          <div 
                            className="custom-html max-w-none text-soft"
                            dangerouslySetInnerHTML={{ __html: sec.body }} 
                          />
                        </div>
                        <div className="w-full lg:w-1/2 flex items-stretch order-1 lg:order-2">
                          {isModelToggle ? (
                            <AboutModelToggle />
                          ) : (
                            <img 
                              src={sec.image || ""} 
                              alt={sec.heading || page.title} 
                              className="w-full h-full object-cover min-h-[350px] lg:min-h-[500px]" 
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )
            } else {
              // Centered Full-Width layout
              return (
                <section key={idx} className={`w-full py-16 md:py-24 ${bgClass} border-b border-line/50`}>
                  <div className="max-w-4xl mx-auto px-6 md:px-12">
                    {sec.heading && (
                      <div className="text-center mb-10">
                        <h2 className={`text-[22px] md:text-[32px] font-extrabold tracking-tight uppercase ${isDark ? "text-white" : "text-foreground"}`}>
                          {sec.heading}
                        </h2>
                        <div className={`w-10 h-[2px] mx-auto mt-5 ${isDark ? "bg-white" : "bg-brand-ink-soft"}`} />
                      </div>
                    )}
                    <div 
                      className={`custom-html max-w-none ${isDark ? "text-faint [&_strong]:text-white" : "text-soft"} ${isDark ? "text-center" : ""}`}
                      dangerouslySetInnerHTML={{ __html: sec.body }} 
                    />
                    
                    {isDark && (
                      <div className="text-center mt-10">
                        <Link href="/shop" className="inline-block px-10 py-3.5 border border-white text-[11px] font-bold uppercase tracking-[0.15em] hover:bg-white hover:text-brand-700 transition-all text-white">
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
            <section className="w-full bg-white py-14 md:py-24 border-t border-line">
              <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
                <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight mb-10">From Here, Shop by Category</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <Link href="/shop?category=mens" className="group relative aspect-[3/4] overflow-hidden bg-cream block">
                    <div className="absolute inset-0 bg-brand-950/30 group-hover:bg-brand-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Men&apos;s Tops</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=mens-bottoms" className="group relative aspect-[3/4] overflow-hidden bg-line block">
                    <div className="absolute inset-0 bg-brand-950/30 group-hover:bg-brand-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Men&apos;s Bottoms</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=womens" className="group relative aspect-[3/4] overflow-hidden bg-cream block">
                    <div className="absolute inset-0 bg-brand-950/30 group-hover:bg-brand-950/40 transition-colors z-10" />
                    <div className="absolute inset-0 z-20 flex items-end p-5">
                      <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Women&apos;s Tops</span>
                    </div>
                  </Link>
                  <Link href="/shop?category=womens-bottoms" className="group relative aspect-[3/4] overflow-hidden bg-line block">
                    <div className="absolute inset-0 bg-brand-950/30 group-hover:bg-brand-950/40 transition-colors z-10" />
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
    <div className="flex flex-col min-h-screen bg-[#fafafa] font-sans antialiased text-foreground">
      <Header />
      
      {/* Sleek Minimalist Hero for Text-focused Pages */}
      <div className="w-full bg-brand-ink text-white relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-ink-line via-brand-ink-soft to-black"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-faint mb-3">{storeName} Page</p>
          <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight mb-4 animate-fade-in">
            {page.title}
          </h1>
          <div className="w-16 h-1 bg-white mx-auto mt-6"></div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 -mt-10 mb-24 relative z-20">
        <div className="bg-white rounded-sg shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-line p-8 md:p-14 lg:p-16">
          <div 
            className="custom-html max-w-none text-soft"
            dangerouslySetInnerHTML={{ __html: page.content }} 
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
