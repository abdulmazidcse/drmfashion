import type { Metadata } from "next"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import ContactForm from "@/components/ContactForm"
import { getSettings, getStoreName } from "@/lib/settings"
import {
  Mail, Phone, MapPin, Clock, Package, RotateCcw, Truck, Ruler,
  ChevronDown, ChevronRight, MessageSquare, ShieldCheck,
} from "lucide-react"

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `Contact Us | ${storeName}`,
    description: `Get in touch with the ${storeName} team. We're here to help with orders, returns, sizing and anything else.`,
  }
}

// Self-serve answers first — most enquiries are resolved without waiting for a reply.
const QUICK_LINKS = [
  { icon: Package, title: "Track my order", desc: "No login needed — just your order number.", href: "/track-order" },
  { icon: RotateCcw, title: "Returns & exchanges", desc: "Windows, conditions and how to start one.", href: "/pages/returns-exchanges" },
  { icon: Truck, title: "Shipping & delivery", desc: "Timelines, charges and coverage areas.", href: "/pages/shipping-policy" },
  { icon: Ruler, title: "Size charts", desc: "Measurements and fit guidance for every length.", href: "/pages/size-charts" },
]

const FAQS = [
  {
    q: "How long does it take to get a reply?",
    a: "Most messages are answered within one business day. Enquiries sent over a weekend or public holiday are picked up the next working day.",
  },
  {
    q: "I need to change or cancel an order — what now?",
    a: "Message us with your order number as soon as possible. While the order is still marked Pending we can usually change the size, update the address or cancel it outright.",
  },
  {
    q: "Can you help me pick a size?",
    a: "Yes. Send your height, your usual size, and the measurements of a garment that already fits you well — we'll recommend the closest fit from our size range.",
  },
  {
    q: "My parcel hasn't arrived. What should I include?",
    a: "Your order number and the delivery address on the order. Check the tracking status first, then message us and we'll open a case with the courier.",
  },
]

export default async function ContactPage() {
  const settings = await getSettings()
  const storeName = await getStoreName()

  const email = settings.contact_email || "support@store.local"
  const phone = settings.contact_phone || ""
  const address = settings.contact_address || ""
  const hours = settings.contact_hours || "Sun – Thu, 10:00 AM – 6:00 PM"

  const channels = [
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}`, note: "Best for anything with an order number." },
    ...(phone ? [{ icon: Phone, label: "Phone", value: phone, href: `tel:${phone.replace(/\s+/g, "")}`, note: "Available during working hours." }] : []),
    ...(address ? [{ icon: MapPin, label: "Address", value: address, href: undefined, note: "Returns are only accepted by prior arrangement." }] : []),
    { icon: Clock, label: "Working Hours", value: hours, href: undefined, note: "Replies pause outside these hours." },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="w-full bg-brand-ink text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-soft mb-7">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/pages/help-center" className="hover:text-white transition-colors">Help</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-faint">Contact</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-end">
            <div className="lg:col-span-8">
              <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight leading-[1.05]">
                How can we help?
              </h1>
              <p className="text-sm md:text-base text-faint mt-5 max-w-xl leading-relaxed">
                Questions about an order, sizing or a return — the {storeName} support team reads every message
                and replies personally.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-wrap gap-x-8 gap-y-4 lg:justify-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-soft mb-1.5">Typical reply</p>
                <p className="text-sm font-bold">Within 1 business day</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-soft mb-1.5">Support hours</p>
                <p className="text-sm font-bold">{hours}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 w-full">

        {/* ── Self-serve shortcuts ────────────────────────────────────────── */}
        <section className="border-b border-line bg-cream/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-12">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-soft mb-6">
              Find an answer straight away
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group bg-white border border-line rounded-sg p-5 hover:border-brand-600 hover:-translate-y-0.5 transition-all"
                  >
                    <Icon className="w-5 h-5 text-foreground mb-4" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-foreground flex items-center gap-1">
                      {link.title}
                      <ChevronRight className="w-3.5 h-3.5 text-faint group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-[11px] text-soft mt-1.5 leading-relaxed">{link.desc}</p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Form + channels ─────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

            {/* Form */}
            <div className="lg:col-span-7 xl:col-span-8">
              <div className="border border-line rounded-2xl p-6 md:p-10">
                <div className="flex items-start gap-3 mb-1">
                  <MessageSquare className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-lg font-extrabold uppercase tracking-tight text-foreground">Send us a message</h2>
                    <p className="text-sm text-soft mt-1">
                      Fields marked <span className="text-soft font-semibold">*</span> are required. Adding your
                      order number gets you a faster answer.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-cream my-7" />

                <ContactForm />
              </div>
            </div>

            {/* Channels */}
            <aside className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="border border-line rounded-2xl divide-y divide-line overflow-hidden">
                {channels.map((channel) => {
                  const Icon = channel.icon
                  const inner = (
                    <div className="p-5 flex items-start gap-4">
                      <div className="w-9 h-9 shrink-0 border border-line rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1">{channel.label}</p>
                        <p className="text-sm font-semibold text-foreground break-words leading-snug">{channel.value}</p>
                        <p className="text-[11px] text-faint mt-1.5 leading-relaxed">{channel.note}</p>
                      </div>
                    </div>
                  )
                  return channel.href ? (
                    <a key={channel.label} href={channel.href} className="block hover:bg-cream transition-colors">{inner}</a>
                  ) : (
                    <div key={channel.label}>{inner}</div>
                  )
                })}
              </div>

              <div className="bg-brand-ink text-white rounded-2xl p-6">
                <ShieldCheck className="w-5 h-5 mb-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] mb-2">Already ordered?</h3>
                <p className="text-[13px] text-faint leading-relaxed">
                  Check the live status of your parcel before writing to us — most delivery questions are answered
                  there in seconds.
                </p>
                <Link
                  href="/track-order"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-3 bg-white text-foreground text-[11px] font-bold uppercase tracking-[0.14em] rounded-lg hover:bg-line transition"
                >
                  Track My Order <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* ── FAQs ────────────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-cream/70">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 md:py-20">
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-center">Before you write</h2>
            <p className="text-sm text-soft text-center mt-3 mb-9">
              The four questions our team gets asked most often.
            </p>

            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group bg-white border border-line rounded-sg overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-bold text-foreground">{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-faint shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 -mt-1 text-[13px] text-soft leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>

            <p className="text-center text-xs text-faint mt-8">
              More answers in the{" "}
              <Link href="/pages/help-center" className="font-bold text-soft underline underline-offset-2 hover:text-brand-700">
                Help Center
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
