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
}

// Data/links kept exactly as the original components/SummerStyles.tsx (static).
const TILES: Record<Gender, Tile[]> = {
  men: [
    { title: "Shorts", image: "/images/shorts.png", href: "/shop?gender=men&query=shorts" },
    { title: "Swim", image: "/images/swim.png", href: "/shop?gender=men&query=swim" },
    { title: "Tees", image: "/images/tees.png", href: "/shop?gender=men&query=tees" },
    { title: "Pants", image: "/images/pants.png", href: "/shop?gender=men&query=pants" },
  ],
  women: [
    { title: "Shorts", image: "/images/women_shorts.png", href: "/shop?gender=women&query=shorts" },
    { title: "Swim", image: "/images/women_swim.png", href: "/shop?gender=women&query=swim" },
    { title: "Tees", image: "/images/women_tees.png", href: "/shop?gender=women&query=tees" },
    { title: "Pants", image: "/images/women_pants.png", href: "/shop?gender=women&query=pants" },
  ],
};

export default function SummerStyles() {
  const [activeGender, setActiveGender] = useState<Gender>("men");

  return (
    <section className="w-full py-[15px] md:py-5">
      {/* Part 1: title + tabs (padded) */}
      <div className="mb-5 flex flex-col items-center gap-3 px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <SectionHeading title="Summer Styles" highlight="Styles" highlightStyle="muted" />

        <div className="relative flex rounded-at-btn border border-[#CBCBCB]">
          <span
            className={`absolute bottom-[2px] top-[2px] w-[calc(50%-2px)] rounded-at-btn bg-brand-600 transition-all duration-300 ease-in ${
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
      <div key={activeGender} className="grid grid-cols-2 gap-[5px] md:grid-cols-4">
        {TILES[activeGender].map((tile, i) => (
          <Link
            key={`${tile.title}-${i}`}
            href={tile.href}
            className="group at-card-up flex flex-col"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="relative aspect-5/7 overflow-hidden bg-[#F0F0F0]">
              {/* next/image, not a bare <img>: these tiles are ~700 KB–1 MB PNGs
                  in public/images. Served raw they were also picked up as eager
                  preloads despite sitting well below the fold. */}
              <Image
                src={tile.image}
                alt={tile.title}
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
