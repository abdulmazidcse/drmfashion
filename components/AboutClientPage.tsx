"use client"

import { useState } from "react"
import Link from "next/link"
import { useSettings } from "@/providers/SettingsProvider"

interface Model {
  name: string
  height: string
  weight?: string
  size: string
  image: string
  desc: string
}

const menSizingModels: Model[] = [
  {
    name: "Short",
    height: "5'4\" - 5'7\"",
    size: "Our trimmest length — cropped through the leg.",
    image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=600",
    desc: "Shortened sleeves, rise and inseam so nothing has to be turned up before you wear it."
  },
  {
    name: "Regular",
    height: "5'8\" - 6'0\"",
    size: "Our signature fit. Balanced length and width.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600",
    desc: "Our signature fit. Tailored precisely for lean, athletic, or stocky builds."
  },
  {
    name: "Long",
    height: "6'1\" - 6'5\"",
    size: "Extended rise, sleeve and inseam.",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=600",
    desc: "Extra length through the body and leg, with the proportions kept in balance."
  }
]

const womenSizingModels: Model[] = [
  {
    name: "Regular",
    height: "5'4\" - 5'8\"",
    size: "Our signature womenswear length.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    desc: "Tailored for perfectly proportioned sleeve, torso and leg rises."
  },
  {
    name: "Long",
    height: "5'9\" - 6'1\"",
    size: "Extended through the torso and leg.",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600",
    desc: "Optimised leg openings, dropped waistlines and longer rises."
  }
]

interface CategoryItem {
  title: string
  image: string
  link: string
}

const menCategories: CategoryItem[] = [
  { title: "Men's Tops", image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=600", link: "/shop?category=mens" },
  { title: "Men's Bottoms", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600", link: "/shop?category=mens-bottoms" },
  { title: "Men's Activewear", image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=600", link: "/shop?category=mens" },
  { title: "Men's Outerwear", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600", link: "/shop?category=mens" }
]

const womenCategories: CategoryItem[] = [
  { title: "Women's Tops", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=600", link: "/shop?category=womens" },
  { title: "Women's Bottoms", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=600", link: "/shop?category=womens-bottoms" },
  { title: "Women's Loungewear", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=600", link: "/shop?category=womens" },
  { title: "Women's Outerwear", image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600", link: "/shop?category=womens" }
]

interface FitPointer {
  top: string
  left: string
  title: string
  desc: string
}

const fitPointers: FitPointer[] = [
  { top: "15%", left: "55%", title: "Adjusted Shoulder Breaks", desc: "Lowered and contoured shoulder seams stop the fabric bunching across the back." },
  { top: "35%", left: "62%", title: "Arm-Length Extension", desc: "Sleeves engineered with custom extensions that sit perfectly past the wrist break." },
  { top: "45%", left: "48%", title: "Torso Proportioning", desc: "Lowered waistline and deep-cut torso ensure comfortable cover when moving." },
  { top: "60%", left: "60%", title: "Proportional Knee Break", desc: "Knee curves are dropped to match long inseams, ending knee-riding folds." },
  { top: "82%", left: "53%", title: "Longer Rise & Extended Inseam", desc: "Rise and inseam graded across three lengths so the hem lands where it should." }
]

export default function AboutClientPage({ settings }: { settings: Record<string, string> }) {
  const [gender, setGender] = useState<"men" | "women">("men")
  const { storeName } = useSettings()
  const s = settings || {}

  // Toggle helpers
  const sizingModels = gender === "men" ? menSizingModels : womenSizingModels
  const categories = gender === "men" ? menCategories : womenCategories

  // Section details
  const heroTitle = s.fit_hero_title || "We didn't just add inches. We redesigned the fit."
  const heroDesc = s.fit_hero_desc || "Standard brands just add width when you size up. We engineer clothing specifically for the functionally blessed."
  const heroImage = s.fit_hero_image || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200"

  // Section 2: Designed Exclusively
  const s2Heading = s.fit_s2_heading || "Designed Around The Fit"
  const s2ProblemLabel = s.fit_s2_problem_label || "The Problem"
  const s2ProblemText = s.fit_s2_problem_text || "Most brands grade a single sample size up and down and call it a size run. Sleeves, rises and hems all move together, so only one body in the range ever gets the fit that was designed."
  const s2SolutionLabel = s.fit_s2_solution_label || `${storeName} — The Solution`
  const s2SolutionText = s.fit_s2_solution_text || "Extra length without extra width. We adjust the entire garment — lowering the waistline, deepening the armholes, dropping the knee break, and extending the sleeves — for a truly proportionate fit."

  // Section 3: All the Length
  const s3Heading = s.fit_s3_heading || "All the Length You Need & More"
  const s3Subheading = s.fit_s3_subheading || "Extra Length, Not Extra Width"
  const s3Text = s.fit_s3_text || "It takes more than a few inches at the hem. We move the waistline, the armhole, the knee break and the sleeve independently, and we measure every detail — so you get a truly proportionate fit, every time."
  
  // Section 3 Images toggle based on gender
  const s3Image = gender === "men"
    ? "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=800"
    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800"

  // Section 4: Difference Models
  const s4Heading = s.fit_s4_heading || "The Difference"

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── SECTION 1: HERO ─── */}
      <section className="relative w-full min-h-[75vh] flex items-end bg-cream overflow-hidden">
        <img src={heroImage} alt={heroTitle} className="absolute inset-0 w-full h-full object-cover object-top filter contrast-[105%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 pb-12 md:pb-16 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/80 mb-3">Welcome to {storeName}</p>
          <h1 className="text-3xl md:text-[44px] leading-[1.1] font-extrabold tracking-tight max-w-2xl" dangerouslySetInnerHTML={{ __html: heroTitle }} />
          <div className="text-[13px] md:text-[15px] mt-4 max-w-xl opacity-90 leading-relaxed font-light prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: heroDesc }} />
        </div>
      </section>

      {/* ─── MASTER GENDER STATE TOGGLE BAR ─── */}
      <div className="sticky top-14 z-40 w-full transition-shadow duration-300 shadow-[0_4px_12px_rgb(0,0,0,0.03)]">
        <div className="w-full py-4 border-b border-line bg-white/95 backdrop-blur-md">
          <div className="max-w-md mx-auto flex items-center justify-center gap-4 px-6">
            <button
              type="button"
              onClick={() => setGender("men")}
              className={`flex-1 py-3 text-[11px] font-extrabold uppercase tracking-[0.2em] transition-all rounded-xl cursor-pointer ${
                gender === "men"
                  ? "bg-brand-ink text-white shadow-sm"
                  : "bg-cream text-faint hover:text-brand-700 hover:bg-brand-50/50"
              }`}
            >
              Men Fit
            </button>
            <button
              type="button"
              onClick={() => setGender("women")}
              className={`flex-1 py-3 text-[11px] font-extrabold uppercase tracking-[0.2em] transition-all rounded-xl cursor-pointer ${
                gender === "women"
                  ? "bg-brand-ink text-white shadow-sm"
                  : "bg-cream text-faint hover:text-brand-700 hover:bg-brand-50/50"
              }`}
            >
              Women Fit
            </button>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: DESIGNED AROUND THE FIT ─── */}
      <section className="w-full bg-white border-b border-line py-10">
        <div className="text-center py-10 px-6">
          <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight uppercase" dangerouslySetInnerHTML={{ __html: s2Heading }} />
          <div className="w-10 h-[2px] bg-brand-ink-soft mx-auto mt-5" />
        </div>

        <div className="flex flex-col lg:flex-row max-w-[1440px] mx-auto px-6">
          {/* Left Description Column */}
          <div className="w-full lg:w-1/2 px-4 md:px-10 lg:px-14 py-8 flex flex-col justify-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint mb-3">{s2ProblemLabel}</p>
            <div className="text-[14px] md:text-[15px] text-soft leading-[1.8] mb-10 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s2ProblemText }} />
            
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint mb-3">{s2SolutionLabel}</p>
            <div className="text-[14px] md:text-[15px] text-soft leading-[1.8] mb-8 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s2SolutionText }} />
            <div>
              <Link href="/shop" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-foreground border-b border-brand-600 pb-1 hover:text-soft hover:border-brand-400 transition-colors">
                Shop {gender === "men" ? "Mens" : "Womens"} Collection →
              </Link>
            </div>
          </div>

          {/* Right Sizing Cards Column (Fully dynamic based on toggle state!) */}
          <div className="w-full lg:w-1/2 px-4 md:px-10 lg:px-14 py-8 flex items-stretch">
            <div className="w-full bg-cream/60 p-6 md:p-10 border border-line/40 rounded-xl flex items-center justify-center">
              <div className={`grid grid-cols-1 gap-6 w-full ${gender === "men" ? "sm:grid-cols-3" : "sm:grid-cols-2 max-w-lg mx-auto"}`}>
                {sizingModels.map((model, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center group">
                    <div className="aspect-[3/4] w-full overflow-hidden bg-line border border-line/45 mb-4 relative">
                      <img
                        src={model.image}
                        alt={model.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-foreground mb-1">
                      {model.name}
                    </h4>
                    <p className="text-[10px] font-bold text-faint uppercase tracking-[0.14em] mb-1.5">
                      {model.height}
                    </p>
                    <p className="text-[10px] text-soft leading-normal font-medium px-2">
                      {model.size}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: ALL THE LENGTH YOU NEED ─── */}
      <section className="flex flex-col lg:flex-row w-full border-b border-line bg-white">
        <div className="w-full lg:w-1/2 relative min-h-[450px] lg:min-h-[600px]">
          <img src={s3Image} alt="All the length" className="absolute inset-0 w-full h-full object-cover" />
          {/* Subtle slider accent overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shadow-lg border border-line z-20 pointer-events-none">
            <span className="text-[10px] font-extrabold text-soft uppercase tracking-wider">&harr;</span>
          </div>
        </div>
        <div className="w-full lg:w-1/2 px-8 md:px-14 lg:px-20 py-14 lg:py-20 flex flex-col justify-center bg-white">
          <h2 className="text-[22px] md:text-[30px] font-extrabold tracking-tight mb-5 uppercase" dangerouslySetInnerHTML={{ __html: s3Heading }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-faint mb-5">{s3Subheading}</p>
          <div className="text-[14px] md:text-[15px] text-soft leading-[1.8] prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: s3Text }} />
        </div>
      </section>

      {/* ─── SECTION 4: THE DIFFERENCE (3 up profiles) ─── */}
      <section className="w-full py-16 md:py-24 bg-[#ebebeb]/50 border-b border-line">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight mb-14 uppercase" dangerouslySetInnerHTML={{ __html: s4Heading }} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Model Card 1 */}
            <div className="flex flex-col items-center bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-line/40 rounded-sg">
              <div className="aspect-[3/4] w-full overflow-hidden bg-cream mb-5">
                <img 
                  src={gender === "men" 
                    ? "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600" 
                    : "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600"} 
                  alt="Fit 1" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-foreground mb-1">The Classic</h4>
              <p className="text-[10px] text-faint uppercase tracking-[0.14em] mb-3">Clean &amp; Proportioned</p>
              <p className="text-[12px] text-soft leading-relaxed">
                {gender === "men" 
                  ? "Standard armholes lowered by 2 inches and chest adjustments designed for slim-to-lean structures."
                  : "Lowered waist rises and expanded chest measurements, for a beautifully balanced silhouette."}
              </p>
            </div>

            {/* Model Card 2 */}
            <div className="flex flex-col items-center bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-line/40 rounded-sg">
              <div className="aspect-[3/4] w-full overflow-hidden bg-cream mb-5">
                <img 
                  src={gender === "men" 
                    ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600" 
                    : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600"} 
                  alt="Fit 2" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-foreground mb-1">The Athletic</h4>
              <p className="text-[10px] text-faint uppercase tracking-[0.14em] mb-3">Athletic Tapered</p>
              <p className="text-[12px] text-soft leading-relaxed">
                {gender === "men" 
                  ? "Broad shoulder cuts with tapered waist contouring, giving muscular builds a sharp, streamlined fit."
                  : "Slight hip contours with balanced shoulder lines, engineered for athletic and hourglass frames."}
              </p>
            </div>

            {/* Model Card 3 */}
            <div className="flex flex-col items-center bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-line/40 rounded-sg">
              <div className="aspect-[3/4] w-full overflow-hidden bg-cream mb-5">
                <img 
                  src={gender === "men" 
                    ? "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600" 
                    : "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600"} 
                  alt="Fit 3" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-foreground mb-1">The Relaxed</h4>
              <p className="text-[10px] text-faint uppercase tracking-[0.14em] mb-3">Easy Silhouette</p>
              <p className="text-[12px] text-soft leading-relaxed">
                {gender === "men" 
                  ? "Laid-back, relaxed drape that fits comfortably without looking baggy. Ideal for loungewear and street staples."
                  : "A drapey, relaxed cut that keeps things easy and fluid. Perfect for oversized fashion styles."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: THE SCIENCE OF FIT (Pointer diagram!) ─── */}
      <section className="w-full bg-brand-ink-soft text-white py-16 md:py-24 border-b border-brand-600">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/70 mb-3">Precision Engineering</p>
          <h2 className="text-[22px] md:text-[36px] font-extrabold tracking-tight text-white mb-16 uppercase">The Science of Fit</h2>
          
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center justify-center">
            {/* Interactive Pointer Diagram (Absolute overlays!) */}
            <div className="w-full md:w-1/2 relative max-w-[400px] border border-brand-ink-line rounded-xl overflow-hidden bg-black/30">
              <img 
                src={gender === "men" 
                  ? "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=600"
                  : "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?auto=format&fit=crop&q=80&w=600"}
                alt="Model Fitting callouts" 
                className="w-full h-auto object-cover opacity-80" 
              />
              
              {/* Dot Markers */}
              {fitPointers.map((p, idx) => (
                <div 
                  key={idx} 
                  style={{ top: p.top, left: p.left }}
                  className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-white animate-ping absolute opacity-60" />
                  <div className="w-3 h-3 rounded-full bg-white border border-brand-600 mx-auto mt-0.5 relative z-10 transition-colors group-hover:bg-brand-ink" />
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-brand-ink border border-brand-ink-line p-2.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all rounded-xl z-30 pointer-events-none text-left">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-white mb-1">{p.title}</p>
                    <p className="text-[9px] text-faint leading-normal">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pointer description list on side */}
            <div className="w-full md:w-1/2 text-left space-y-8">
              {fitPointers.map((p, idx) => (
                <div key={idx} className="flex gap-4 items-start border-l border-brand-ink-line pl-4 hover:border-white transition-colors py-1">
                  <span className="text-[10px] font-extrabold text-soft uppercase tracking-[0.14em]">0{idx + 1}</span>
                  <div>
                    <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white mb-1.5">{p.title}</h4>
                    <p className="text-[12px] text-faint leading-relaxed font-light">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: DYNAMIC SHOP BY CATEGORY ─── */}
      <section className="w-full bg-white py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-faint mb-3">Shop Collections</p>
          <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight mb-12 uppercase">
            Shop {gender === "men" ? "Men" : "Women"} by Category
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {categories.map((cat, idx) => (
              <Link key={idx} href={cat.link} className="group relative aspect-[3/4] overflow-hidden bg-cream block">
                <img 
                  src={cat.image} 
                  alt={cat.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter contrast-[102%]" 
                />
                <div className="absolute inset-0 bg-brand-950/20 group-hover:bg-brand-950/30 transition-colors z-10" />
                <div className="absolute inset-0 z-20 flex items-end p-5">
                  <span className="text-white text-[12px] font-bold uppercase tracking-[0.15em] border-b border-white pb-0.5 group-hover:border-transparent transition-colors">
                    {cat.title}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: BRAND MISSION ─── */}
      <section className="w-full bg-brand-ink text-white py-16 md:py-24 border-t border-brand-600">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-soft mb-4">{storeName} Mission</p>
          <div className="text-[20px] md:text-[28px] font-extrabold tracking-tight max-w-2xl mx-auto leading-snug uppercase prose prose-invert" dangerouslySetInnerHTML={{ __html: s.fit_s9_heading || "Fit is not an afterthought — it's the whole design. Every style starts from the body it is cut for." }} />
          <div className="mt-10">
            <Link href="/shop" className="inline-block px-10 py-4 border border-white text-[11px] font-extrabold uppercase tracking-[0.2em] hover:bg-white hover:text-brand-700 transition-all">
              Shop Collections
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
