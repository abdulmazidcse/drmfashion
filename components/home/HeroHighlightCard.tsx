"use client";

import Link from "next/link";
import Image from "next/image";
import { useCurrency } from "@/providers/CurrencyProvider";
import { formatImageUrl } from "@/lib/utils";

export interface HeroHighlight {
  title: string;
  slug: string;
  thumbnail: string;
  /** Base-currency amount; converted and formatted here like every other price. */
  price: number;
  note?: string;
}

/**
 * The product card floating over the hero image.
 *
 * A client component purely so the price goes through `useCurrency()` — a
 * server-rendered figure would be stuck in the base currency while every other
 * price on the page followed the visitor's selection.
 */
export default function HeroHighlightCard({ highlight }: { highlight: HeroHighlight }) {
  const { formatPrice } = useCurrency();

  return (
    <Link
      href={`/product/${highlight.slug}`}
      className="absolute bottom-5 left-5 flex items-center gap-3 rounded-[18px] bg-white/95 px-[18px] py-[15px] shadow-sig backdrop-blur-[8px] transition-transform duration-200 hover:-translate-y-0.5 sm:bottom-[26px] sm:left-[26px]"
    >
      <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-sig-copper-50">
        <Image
          src={formatImageUrl(highlight.thumbnail)}
          alt={highlight.title}
          fill
          sizes="44px"
          className="object-cover"
        />
      </span>
      <span className="block">
        <b className="block max-w-[22ch] truncate text-[13px] font-extrabold text-sig-ink">
          {highlight.title}
        </b>
        <span className="text-xs text-sig-soft">
          {highlight.note || "Best seller this week"}
          <em className="ml-1.5 text-sm font-extrabold not-italic text-sig-copper-600">
            {formatPrice(highlight.price)}
          </em>
        </span>
      </span>
    </Link>
  );
}
