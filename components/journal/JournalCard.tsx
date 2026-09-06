import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Clock } from "lucide-react"
import { formatJournalDate } from "@/lib/journal"

export type JournalCardPost = {
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
  readTime: number
  publishedAt: Date | string | null
  createdAt: Date | string
  category: { name: string; slug: string } | null
}

export default function JournalCard({ post }: { post: JournalCardPost }) {
  const date = formatJournalDate(post.publishedAt || post.createdAt)

  return (
    <article className="group flex flex-col">
      <Link
        href={`/journal/${post.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-zinc-100"
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-100">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Journal</span>
          </div>
        )}
        {post.category && (
          <span className="absolute left-4 top-4 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-950">
            {post.category.name}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
          <span>{date}</span>
          <span className="h-3 w-px bg-zinc-300" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readTime} min read
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight text-zinc-950 md:text-xl">
          <Link href={`/journal/${post.slug}`} className="transition-colors hover:text-zinc-600">
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-zinc-600">{post.excerpt}</p>
        )}

        <Link
          href={`/journal/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 self-start border-b border-zinc-950 pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-950 transition-colors hover:border-zinc-400 hover:text-zinc-600"
        >
          Read more
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  )
}
