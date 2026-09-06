"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import type { HomeIconTile } from "@/lib/homeIcons";

type Gender = "men" | "women";

interface IconsGridProps {
  title: string;
  highlight: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  men: HomeIconTile[];
  women: HomeIconTile[];
}

export default function IconsGrid({
  title,
  highlight,
  subtitle,
  ctaLabel,
  ctaHref,
  men,
  women,
}: IconsGridProps) {
  const tiles: Record<Gender, HomeIconTile[]> = { men, women };

  // Open on whichever tab has something in it, so curating one gender only
  // does not land the visitor on an empty grid.
  const [activeGender, setActiveGender] = useState<Gender>(men.length ? "men" : "women");

  return (
    <section className="w-full py-[15px] md:py-5">
      <div className="mb-5 flex flex-col items-center gap-3 px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <SectionHeading title={title} highlight={highlight} highlightStyle="muted" />
          {subtitle && <p className="text-[13px] font-light text-at-muted">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-5">
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className="hidden items-center gap-1.5 border-b border-at-ink pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-at-ink transition-colors hover:border-at-muted hover:text-at-muted sm:inline-flex"
            >
              {ctaLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          {/* Only worth a toggle when both sides have been curated. */}
          {men.length > 0 && women.length > 0 && (
            <div className="relative flex rounded-at-btn border border-[#CBCBCB]">
              <span
                className={`absolute bottom-[2px] top-[2px] w-[calc(50%-2px)] rounded-at-btn bg-at-ink transition-all duration-300 ease-in ${
                  activeGender === "women" ? "left-[calc(50%)]" : "left-[2px]"
                }`}
              />
              {(["men", "women"] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGender(g)}
                  className={`relative z-10 min-w-[120px] cursor-pointer px-6 py-2.5 text-center text-[13px] font-semibold capitalize transition-colors duration-300 md:min-w-[150px] ${
                    activeGender === g ? "text-white" : "text-at-muted"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-bleed, tight gutters — the photographs are the section, so they
          get the width. Re-mounted per tab to replay the staggered reveal. */}
      <div key={activeGender} className="grid grid-cols-3 gap-[5px] md:grid-cols-4 xl:grid-cols-6">
        {tiles[activeGender].map((tile, i) => {
          const body = (
            <>
              <Image
                src={tile.image}
                // The caption is the only description this tile has; with none
                // written the photograph is decorative and an invented alt
                // would be worse than an empty one.
                alt={tile.title}
                fill
                sizes="(max-width: 768px) 33vw, (max-width: 1280px) 25vw, 16vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />

              {/* The caption stays out of the way until the photograph has been
                  looked at. */}
              {tile.title && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-[11px] uppercase leading-[13px] tracking-wider text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {tile.title}
                </span>
              )}
            </>
          );

          const shell =
            "group at-card-up relative block aspect-5/7 overflow-hidden bg-[#F0F0F0]";

          return tile.href ? (
            <Link
              key={i}
              href={tile.href}
              className={shell}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {body}
            </Link>
          ) : (
            <div key={i} className={shell} style={{ animationDelay: `${i * 50}ms` }}>
              {body}
            </div>
          );
        })}
      </div>

      {ctaLabel && ctaHref && (
        <div className="mt-6 px-6 sm:hidden">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 border-b border-at-ink pb-0.5 text-[11px] font-bold uppercase tracking-[0.15em] text-at-ink"
          >
            {ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
