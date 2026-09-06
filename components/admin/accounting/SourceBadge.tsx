"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const SOURCES = ["MANUAL", "ORDER", "PAYMENT", "REFUND", "PURCHASE", "EXPENSE", "ADJUSTMENT"] as const
export type Source = (typeof SOURCES)[number]

const STYLES: Record<string, string> = {
  MANUAL: "bg-zinc-100 text-zinc-700",
  ORDER: "bg-emerald-100 text-emerald-700",
  PAYMENT: "bg-sky-100 text-sky-700",
  REFUND: "bg-rose-100 text-rose-700",
  PURCHASE: "bg-indigo-100 text-indigo-700",
  EXPENSE: "bg-amber-100 text-amber-700",
  ADJUSTMENT: "bg-violet-100 text-violet-700",
}

export default function SourceBadge({ source, className }: { source: string; className?: string }) {
  return (
    <Badge className={cn("text-[10px] font-semibold tracking-wider", STYLES[source] || "bg-zinc-100 text-zinc-700", className)}>
      {source}
    </Badge>
  )
}
