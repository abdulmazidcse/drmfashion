"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import SigSectionHead from "./SigSectionHead";

type Gender = "men" | "women";

interface Tile {
  title: string;
  image: string;
  href: string;
  /** Alt text resolved on the server; the built-in fallback tiles have none. */
  alt?: string;
  /** Published products in the category. 0 hides the subtitle. */
  count?: number;
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
    <section className="bg-sig-cream py-12 lg:py-[70px]">
      <div className="sig-wrap">

        <SigSectionHead kicker="Browse" title="Shop by category">
          {/* Gender switch, as a pill pair to match the header's nav. */}
          <div className="flex gap-1 rounded-full border border-sig-line bg-sig-card p-1.5">
            {(["men", "women"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setActiveGender(g)}
                className={`cursor-pointer rounded-full px-6 py-2 text-[13px] font-semibold capitalize transition-colors duration-200 ${
                  activeGender === g
                    ? "bg-sig-ink text-white"
                    : "text-sig-soft hover:bg-sig-copper-50 hover:text-sig-ink"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </SigSectionHead>

        {/* Re-mounted on tab change so the staggered reveal replays. Column
            count is fixed, never derived from the tile count: deriving it made
            a single flagged category stretch to half the screen. */}
        <div key={activeGender} className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {tiles[activeGender].map((tile, i) => (
            <Link
              key={`${tile.title}-${i}`}
              href={tile.href}
              className="at-card-up group rounded-sig border border-sig-line bg-sig-card p-3.5 text-center transition-all duration-[250ms] hover:-translate-y-1 hover:border-sig-copper-300 hover:shadow-sig"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="relative mb-3 aspect-square overflow-hidden rounded-[15px] bg-sig-copper-50">
                <Image
                  src={tile.image}
                  alt={tile.alt || tile.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 16vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  draggable={false}
                />
              </div>
              <b className="block text-sm font-bold text-sig-ink">{tile.title}</b>
              {(tile.count ?? 0) > 0 && (
                <span className="mt-0.5 block text-xs text-sig-soft">
                  {tile.count} {tile.count === 1 ? "item" : "items"}
                </span>
              )}
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
