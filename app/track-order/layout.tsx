import type { Metadata } from "next"
import { getStoreName } from "@/lib/settings"

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getStoreName()
  return {
    title: `Track My Order | ${storeName}`,
    description: "Track your order without signing in — just enter your order number or the phone number you ordered with.",
  }
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
