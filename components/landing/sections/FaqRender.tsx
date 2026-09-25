import type { FaqData } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

export default function FaqRender({ data, fullWidth = false }: { data: FaqData; fullWidth?: boolean }) {
  const items = data.items.filter((i) => i.q)
  if (items.length === 0) return null
  return (
    <div className={`${contentWidthClass(fullWidth, "max-w-2xl")} px-6`}>
      {data.title && <h2 className="text-xl sm:text-2xl font-black text-center mb-6">{data.title}</h2>}
      <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <details key={i} className="group p-4 sm:p-5">
            <summary className="cursor-pointer list-none font-bold text-sm flex items-center justify-between gap-3">
              {item.q}
              <span className="shrink-0 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
            </summary>
            {item.a && <p className="mt-2 text-sm opacity-70">{item.a}</p>}
          </details>
        ))}
      </div>
    </div>
  )
}
