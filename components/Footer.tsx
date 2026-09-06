"use client";

import { useState, useEffect } from "react";
import FooterClassic from "./FooterClassic";
import FooterOpenGrid from "./FooterOpenGrid";
import FooterSupportBubble from "./FooterSupportBubble";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FooterProps {
  categories?: Category[];
}

/**
 * ►► SWITCH THE STOREFRONT FOOTER HERE ◄◄
 *
 *   "open"    → FooterOpenGrid — current design, no rules anywhere
 *   "classic" → FooterClassic  — the original white footer
 *
 * Both designs read the same props, so flipping this one value is the whole
 * change; no page that renders <Footer> needs touching.
 */
const FOOTER_DESIGN: "open" | "classic" = "open";

export default function Footer({ categories: initialCategories }: FooterProps) {
  const [fetched, setFetched] = useState<Category[]>([]);

  // Category resolution lives here rather than in either design, so the two stay
  // purely presentational and switching between them can't affect data fetching.
  //
  // Derived rather than mirrored into state: pages that pass categories (most of
  // them) render them on the first pass with no effect and no second render, and
  // only the pages that omit the prop pay for the fetch.
  const hasInitial = !!initialCategories && initialCategories.length > 0;
  const categories = hasInitial ? initialCategories : fetched;

  useEffect(() => {
    if (hasInitial) return;

    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setFetched(data);
        }
      } catch (err) {
        console.error("Failed to fetch footer categories:", err);
      }
    };
    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [hasInitial]);

  return (
    <>
      {FOOTER_DESIGN === "open" ? (
        <FooterOpenGrid categories={categories} />
      ) : (
        <FooterClassic categories={categories} />
      )}

      <FooterSupportBubble />
    </>
  );
}
