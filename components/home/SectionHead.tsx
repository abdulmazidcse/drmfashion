import Link from "next/link";

/**
 * The one section opener the Signature storefront uses everywhere: copper kicker,
 * heavy tight heading, optional lead line, and a link pinned to the right that
 * stays on the same baseline as the heading on desktop and wraps under it on
 * mobile.
 *
 * Presentational and server-safe — the sliders that render it are client
 * components, but nothing here needs to be.
 */
export default function SectionHead({
  kicker,
  title,
  lead,
  href,
  linkLabel = "View all",
  className = "",
}: {
  kicker?: string;
  title: string;
  lead?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-8 ${className}`}>
      <div className="min-w-0">
        {kicker && <span className="sg-kicker">{kicker}</span>}
        <h2 className="text-[28px] sm:text-[34px] font-extrabold mt-2.5">{title}</h2>
        {lead && <p className="text-soft text-[15px] mt-2 max-w-[46ch] leading-relaxed">{lead}</p>}
      </div>

      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-2 text-[14px] font-bold text-brand-700 hover:gap-3 transition-all shrink-0"
        >
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
