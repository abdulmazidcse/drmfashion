"use client"

import { Search } from "lucide-react"

/**
 * Search-engine overrides for a custom page, shared by the create and edit
 * forms so the two cannot drift apart.
 *
 * Every field is optional. The hints and the preview below show what a page
 * falls back to when a field is left blank, which mirrors the fallback chain in
 * app/pages/[slug]/page.tsx generateMetadata — keep the two in step.
 */

/** Google truncates around these; over the limit is a warning, not an error. */
const TITLE_LIMIT = 60
const DESCRIPTION_LIMIT = 160

interface PageSeoFieldsProps {
  title: string
  slug: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  onMetaTitleChange: (value: string) => void
  onMetaDescriptionChange: (value: string) => void
  onMetaKeywordsChange: (value: string) => void
}

function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit
  return (
    <span className={`text-[10px] font-bold tabular-nums ${over ? "text-amber-600" : "text-zinc-400"}`}>
      {value.length}/{limit}
    </span>
  )
}

export default function PageSeoFields({
  title,
  slug,
  metaTitle,
  metaDescription,
  metaKeywords,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onMetaKeywordsChange,
}: PageSeoFieldsProps) {
  const previewTitle = metaTitle.trim() || title.trim() || "Page title"
  const previewDescription =
    metaDescription.trim() ||
    "No meta description yet — search engines will pick their own snippet from the page content."

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-3.5 h-3.5 text-zinc-400" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Search Engine Listing
        </p>
      </div>
      <p className="text-xs text-zinc-500 mb-5">
        Optional. Leave blank to fall back to the page title and content.
      </p>

      <div className="space-y-5">
        {/* SEO title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
              SEO Title
            </label>
            <CharCount value={metaTitle} limit={TITLE_LIMIT} />
          </div>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder={title ? `Defaults to "${title}"` : "e.g. Shipping & Returns — Free Over $150"}
            className="w-full px-4 py-2.5 text-sm border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950 transition-all rounded-lg"
          />
        </div>

        {/* Meta description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
              Meta Description
            </label>
            <CharCount value={metaDescription} limit={DESCRIPTION_LIMIT} />
          </div>
          <textarea
            rows={3}
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="120–160 characters describing what this page is for."
            className="w-full px-4 py-2.5 text-sm border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950 transition-all rounded-lg resize-y"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
            Meta Keywords
          </label>
          <input
            type="text"
            value={metaKeywords}
            onChange={(e) => onMetaKeywordsChange(e.target.value)}
            placeholder="shipping, returns, delivery"
            className="w-full px-4 py-2.5 text-sm border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-950 transition-all rounded-lg font-mono text-xs"
          />
          <p className="text-[10px] text-zinc-400">Comma separated.</p>
        </div>

        {/* Result preview */}
        <div className="border-t border-zinc-100 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">
            Search Result Preview
          </p>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
            <p className="text-[11px] text-zinc-500 truncate">/pages/{slug || "page-slug"}</p>
            <p className="text-[15px] text-[#1a0dab] leading-snug truncate mt-0.5">{previewTitle}</p>
            <p className="text-xs text-zinc-600 leading-relaxed mt-1 line-clamp-2">
              {previewDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
