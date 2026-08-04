"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Gender = "men" | "women";

interface Tile {
  title: string;
  image: string;
  href: string;
}

interface TrendingCategoriesProps {
  men?: Tile[];
  women?: Tile[];
}

// Fallback tiles (stand-in images from public/) used when the DB has no
// isTrending categories for a gender — mirrors the old TrendingTallCategories config.
const DEFAULT_MEN: Tile[] = [
  { title: "Shorts", image: "/images/shorts.png", href: "/shop?gender=men&query=shorts" },
  { title: "Button Shirts", image: "/images/men_hero.png", href: "/shop?gender=men&query=shirt" },
  { title: "Jeans", image: "/images/community.png", href: "/shop?gender=men&query=jeans" },
  { title: "Tees", image: "/images/tees.png", href: "/shop?gender=men&query=tee" },
  { title: "Pants & Chinos", image: "/images/pants.png", href: "/shop?gender=men&query=pants" },
  { title: "Athletic Pants", image: "/images/swim.png", href: "/shop?gender=men&query=athletic" },
];

const DEFAULT_WOMEN: Tile[] = [
  { title: "Shorts", image: "/images/women_shorts.png", href: "/shop?gender=women&query=shorts" },
  { title: "Button Shirts", image: "/images/women_shirt.png", href: "/shop?gender=women&query=shirt" },
  { title: "Jeans", image: "/images/women_jeans.png", href: "/shop?gender=women&query=jeans" },
  { title: "Tees", image: "/images/women_tees.png", href: "/shop?gender=women&query=tee" },
  { title: "Pants & Chinos", image: "/images/women_pants.png", href: "/shop?gender=women&query=pants" },
  { title: "Athletic Pants", image: "/images/women_swim.png", href: "/shop?gender=women&query=athletic" },
];

/**
 * Signature category row: six square tiles in white cards. Same men/women split
 * the old design had — it just moved into the header pill next to the heading.
 */
export default function TrendingCategories({ men, women }: TrendingCategoriesProps) {
  const [activeGender, setActiveGender] = useState<Gender>("men");

  const tiles: Record<Gender, Tile[]> = {
    men: men && men.length ? men : DEFAULT_MEN,
    women: women && women.length ? women : DEFAULT_WOMEN,
  };

  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 mb-8">
        <div className="min-w-0">
          <span className="sg-kicker">Browse</span>
          <h2 className="text-[28px] sm:text-[34px] font-extrabold mt-2.5">Shop by category</h2>
        </div>

        <div className="relative flex sg-card rounded-full p-1.5 shrink-0">
          <span
            className={`absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-full bg-brand-600 transition-all duration-300 ease-out ${
              activeGender === "women" ? "left-[calc(50%)]" : "left-1.5"
            }`}
          />
          {(["men", "women"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGender(g)}
              className={`relative z-10 min-w-[104px] cursor-pointer rounded-full px-6 py-2.5 text-center text-[14px] font-bold capitalize transition-colors duration-300 md:min-w-[124px] ${
                activeGender === g ? "text-white" : "text-soft hover:text-brand-700"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Re-mount on tab change to replay the staggered reveal */}
      <div key={activeGender} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles[activeGender].map((tile, i) => (
          <Link
            key={`${tile.title}-${i}`}
            href={tile.href}
            className="group at-card-up sg-card p-3.5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-sg"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="relative aspect-square overflow-hidden rounded-[15px] bg-brand-50 mb-3">
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 16vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                draggable={false}
              />
            </div>
            <span className="block text-[14px] font-bold group-hover:text-brand-700 transition-colors line-clamp-1">
              {tile.title}
            </span>
            <span className="block text-[12px] text-soft mt-0.5">Shop now</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
