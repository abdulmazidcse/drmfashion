import React from "react";
import Link from "next/link";

interface SigSectionHeadProps {
  /** Small copper label above the title. */
  kicker: string;
  title: string;
  subtitle?: string;
  /** Trailing link. Both fields are required for it to render. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Anything that belongs where the link would go — a tab switch, say. */
  children?: React.ReactNode;
}

/**
 * The heading every Signature section opens with: kicker, title and optional
 * standfirst on the left, and a link (or a control) pinned to the right.
 *
 * `children` and the CTA are alternatives, not both — a section either offers
 * a way through to more of the same thing or a way to filter what is shown,
 * and putting the two side by side reads as two competing next steps.
 */
export default function SigSectionHead({
  kicker,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  children,
}: SigSectionHeadProps) {
  return (
    <div className="mb-[30px] flex flex-wrap items-end justify-between gap-6">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sig-copper-600">
          {kicker}
        </span>
        <h2 className="mt-2.5 text-[28px] font-extrabold tracking-[-0.03em] text-sig-ink sm:text-[34px]">
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-[15px] text-sig-soft">{subtitle}</p>}
      </div>

      {children ??
        (ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-[7px] text-sm font-bold text-sig-copper-700"
          >
            {ctaLabel}
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        ) : null)}
    </div>
  );
}
