import type { HtmlData } from "@/lib/landing/sections"

/** Raw admin-authored embed code. Trusted input — only an ADMIN account can write it. */
export default function HtmlRender({ data }: { data: HtmlData }) {
  if (!data.html) return null
  return <div className="max-w-3xl mx-auto px-6 page-content" dangerouslySetInnerHTML={{ __html: data.html }} />
}
