import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import JournalCard, { type JournalCardPost } from "../journal/JournalCard";

/**
 * Three most recent posts above the footer. The card is the one the /journal
 * index already uses, so a change to how a post is presented lands in both
 * places at once.
 */
export default function JournalTeaser({ posts }: { posts: JournalCardPost[] }) {
  return (
    <section className="w-full py-[15px] md:py-5">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
        <div className="mb-7 flex flex-col items-start gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <SectionHeading title="From The Journal" highlight="The Journal" highlightStyle="muted" />
            <p className="text-[13px] font-light text-at-muted">
              Fit guides, fabric notes and stories from the tall community.
            </p>
          </div>

          <Link
            href="/journal"
            className="inline-flex items-center gap-1.5 border-b border-at-ink pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-at-ink transition-colors hover:border-at-muted hover:text-at-muted"
          >
            All articles
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <div key={post.slug} className="at-card-up" style={{ animationDelay: `${i * 60}ms` }}>
              <JournalCard post={post} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
