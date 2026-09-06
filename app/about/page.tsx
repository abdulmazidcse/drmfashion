import type { Metadata } from "next"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { prisma } from "@/lib/prisma"
import { getStoreName } from "@/lib/settings"
import AboutClientPage from "@/components/AboutClientPage"

export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `About Us | ${storeName}`,
    description: `Why ${storeName} exists, who we build for, and how our tall-specific patterns are made.`,
    alternates: { canonical: "/about" },
  }
}

export default async function AboutPage() {
  const dbSettings = await prisma.setting.findMany()
  const s = dbSettings.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans antialiased text-zinc-950">
      <Header />
      <main className="flex-1 w-full">
        <AboutClientPage settings={s} />
      </main>
      <Footer />
    </div>
  )
}