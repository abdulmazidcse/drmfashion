import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { prisma } from "@/lib/prisma"
import AboutClientPage from "@/components/AboutClientPage"

export const revalidate = 0

export default async function AboutPage() {
  const dbSettings = await prisma.setting.findMany()
  const s = dbSettings.reduce((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {} as Record<string, string>)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full">
        <AboutClientPage settings={s} />
      </main>
      <Footer />
    </div>
  )
}