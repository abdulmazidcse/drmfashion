import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ChevronRight, ShoppingBag, Gift, Sparkles, ShieldCheck, MailOpen } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { getStoreName } from "@/lib/settings"
import { PRODUCT_CARD_SELECT } from "@/lib/productSelect"
import { footerCategories } from "@/lib/utils"

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `Gift Cards | ${storeName}`,
    description: `Send a ${storeName} gift card — the safe choice when you don't know their size. Delivered by email, no expiry.`,
    alternates: { canonical: "/gift-cards" },
  }
}

export default async function GiftCardsPage() {
  // `categories` feeds <Footer> and nothing else: it used to pull every root
  // category's children *and the id of every published product under each* to
  // render four links.
  const [storeName, categories, giftCardsCat] = await Promise.all([
    getStoreName(),
    prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    prisma.category.findUnique({
      where: { slug: "gift-cards" },
      select: { id: true, image: true },
    }),
  ])

  // Query gift card products
  const products = giftCardsCat
    ? await prisma.product.findMany({
        where: {
          published: true,
          deletedAt: null,
          categoryId: giftCardsCat.id
        },
        select: PRODUCT_CARD_SELECT,
        orderBy: {
          basePrice: "asc"
        }
      })
    : []

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950 font-sans antialiased">
      <Header />

      {/* HERO BANNER */}
      <section className="relative w-full h-[360px] sm:h-[460px] flex items-center justify-center overflow-hidden bg-zinc-950">
        {giftCardsCat?.image ? (
          <img
            src={giftCardsCat.image}
            alt={`${storeName} Luxury Gift Cards`}
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/40 to-zinc-950" />
        
        <div className="relative z-10 text-center text-white px-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 animate-pulse">
            <Gift className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] font-black tracking-widest uppercase text-zinc-200">The Ultimate Present</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight uppercase mb-4 leading-none">
            Digital Gift Cards
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base font-light max-w-lg mx-auto leading-relaxed">
            Give the gift of pure luxury and infinite style. Delivered instantly to their inbox, ready to redeem across our entire seasonal fashion catalog.
          </p>
        </div>
      </section>

      <main className="max-w-[1600px] mx-auto px-6 py-12 w-full flex-1">
        {/* BREADCRUMB */}
        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-10 flex items-center gap-2">
          <Link href="/" className="hover:text-zinc-800 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-700">Gift Cards</span>
        </div>

        {/* HIGHLIGHTS / BENEFIT ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="flex gap-4 p-6 border border-zinc-100 rounded-3xl hover:border-zinc-200 transition duration-300">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 shrink-0 border border-zinc-100">
              <MailOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">Instant Email Delivery</h3>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Delivered directly to the recipient’s inbox within minutes of checkout with custom styling.</p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border border-zinc-100 rounded-3xl hover:border-zinc-200 transition duration-300">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 shrink-0 border border-zinc-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">No Expiration Date</h3>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Our digital gift cards never expire and carry zero maintenance fees, ensuring absolute freedom.</p>
            </div>
          </div>

          <div className="flex gap-4 p-6 border border-zinc-100 rounded-3xl hover:border-zinc-200 transition duration-300">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 shrink-0 border border-zinc-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">Flexible Redeems</h3>
              <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-relaxed">Can be used to pay for products, taxes, and shipping costs dynamically on partial or full totals.</p>
            </div>
          </div>
        </div>

        {/* PRODUCTS SECTION */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-8">
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-zinc-950">Select Amount</h2>
              <p className="text-[10px] text-zinc-450 uppercase font-bold tracking-wider mt-0.5">Choose your preferred luxury voucher denomination</p>
            </div>
            <p className="text-xs text-zinc-400 font-light">
              <span className="font-bold text-zinc-700">{products.length}</span> card denominations available
            </p>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-150 flex items-center justify-center mb-6">
                <Gift className="w-7 h-7 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide mb-2">No Gift Cards Available</h3>
              <p className="text-zinc-450 text-sm font-light mb-6">
                Please add products under the category with slug &quot;gift-cards&quot; in the admin panel to display them here!
              </p>
              <Link href="/admin/products/create" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all rounded-xl shadow-lg hover:shadow-xl duration-300">
                Go to Admin Product Creator
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {products.map((product, idx) => (
                <div key={product.id} className="relative group">
                  {/* First grid row is above the fold — opt it out of lazy loading. */}
                  <ProductCard product={product} idPrefix="gift-cards" priority={idx < 4} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer categories={footerCategories(categories)} />
    </div>
  )
}

