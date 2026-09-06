import type { JournalHeading } from "@/lib/journal"

/** "In this article" jump-links, built from the article's h2/h3 headings. */
export default function JournalToc({ headings }: { headings: JournalHeading[] }) {
  if (headings.length < 3) return null

  // Only top-level sections get a number; sub-headings are indented instead.
  let sectionNumber = 0
  const numbered = headings.map((heading) => ({
    ...heading,
    number: heading.level === 2 ? ++sectionNumber : null,
  }))

  return (
    <nav aria-label="In this article" className="my-10 border border-zinc-200 bg-[#fafafa] px-6 py-7 md:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">In This Article</p>
      <ol className="mt-5 space-y-3">
        {numbered.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "pl-6" : ""}>
            <a
              href={`#${heading.id}`}
              className="group flex gap-3 text-sm leading-snug text-zinc-700 transition-colors hover:text-zinc-950"
            >
              {heading.number !== null && (
                <span className="w-5 shrink-0 font-bold tabular-nums text-zinc-400 group-hover:text-zinc-950">
                  {String(heading.number).padStart(2, "0")}
                </span>
              )}
              <span className="border-b border-transparent group-hover:border-zinc-950">{heading.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
