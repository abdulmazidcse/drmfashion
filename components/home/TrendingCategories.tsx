"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SectionHeading from "./SectionHeading";

type Gender = "men" | "women";

interface Tile {
  title: string;
  image: string;
  href: string;
  /** Alt text resolved on the server; the built-in fallback tiles have none. */
  alt?: string;
}

interface TrendingCategoriesProps {
  men?: Tile[];
  women?: Tile[];
}

export default function TrendingCategories({ men, women }: TrendingCategoriesProps) {
  // Both the curated tiles and the stand-ins are built on the server now — see
  // lib/homeTiles.ts. The hardcoded copies that used to live here linked to a
  // /shop text search, because a client component has no way to find out
  // whether the category a tile names actually exists.
  const tiles: Record<Gender, Tile[]> = { men: men ?? [], women: women ?? [] };

  // Open on whichever tab actually has tiles, so flagging categories for one
  // gender only doesn't land the visitor on an empty grid.
  const [activeGender, setActiveGender] = useState<Gender>(
    tiles.men.length ? "men" : "women"
  );

  return (
    <section className="w-full py-[15px] md:py-5">
      {/* Part 1: title + tabs (padded) */}
      <div className="mb-5 flex flex-col items-center gap-3 px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <SectionHeading title="Trending Tall Categories" highlight="Tall Categories" highlightStyle="muted" />

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
      </div>

      {/* Part 2: product grid (full-bleed, no side padding); re-mount on tab change to replay the staggered reveal */}
      {/* Column count is fixed, never derived from the tile count: deriving it
          made a single flagged category stretch to half the screen. Fewer tiles
          just leave the rest of the row empty, at the designed tile size. */}
      <div key={activeGender} className="grid grid-cols-3 gap-[5px] xl:grid-cols-6">
        {tiles[activeGender].map((tile, i) => (
          <Link
            key={`${tile.title}-${i}`}
            href={tile.href}
            className="group at-card-up flex flex-col"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="relative aspect-5/7 overflow-hidden bg-[#F0F0F0]">
              {/* next/image, not a bare <img>: see the note in SummerStyles. */}
              <Image
                src={tile.image}
                alt={tile.alt || tile.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                draggable={false}
              />
            </div>
            <div
              className="flex items-center justify-between gap-4 pl-1.5"
              style={{ padding: "12px 5px 20px" }}
            >
              <span className="at-link-underline text-[12px] uppercase leading-[14px] tracking-wider text-at-ink">
                {tile.title}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
