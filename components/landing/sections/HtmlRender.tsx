import type { HtmlData } from "@/lib/landing/sections"
import { contentWidthClass } from "@/components/landing/shared"

/** Raw admin-authored embed code. Trusted input — only an ADMIN account can write it. */
export default function HtmlRender({ data, fullWidth = false }: { data: HtmlData; fullWidth?: boolean }) {
  if (!data.html) return null
  return <div className={`${contentWidthClass(fullWidth, "max-w-3xl")} px-6 page-content`} dangerouslySetInnerHTML={{ __html: data.html }} />
}
