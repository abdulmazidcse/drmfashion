"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import CollectionFilterDrawer from "./CollectionFilterDrawer";
import {
  COLLECTION_SORTS,
  COLLECTION_VIEWS,
  FACET_SECTIONS,
  buildCollectionHref,
  countActiveFacets,
  toggleFacetValue,
  type CollectionQuery,
  type CollectionView,
  type FacetKey,
  type FacetOptions,
} from "@/lib/collectionView";

interface CollectionToolbarProps {
  basePath: string;
  query: CollectionQuery;
  options: FacetOptions;
  total: number;
}

/**
 * One icon per density, drawn rather than imported: the three lucide grid icons
 * are all the same weight, and the point of this control is that the buttons
 * *look* like what they do.
 */
function DensityIcon({ view }: { view: CollectionView }) {
  const cells = view === "large" ? 1 : view === "default" ? 2 : 4;
  return (
    <span
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${cells === 1 ? 1 : 2}, 1fr)` }}
      aria-hidden="true"
    >
      {Array.from({ length: cells }).map((_, i) => (
        <span
          key={i}
          className="block border border-current"
          style={{ width: cells === 1 ? 12 : 5, height: cells === 1 ? 12 : 5 }}
        />
      ))}
    </span>
  );
}

export default function CollectionToolbar({
  basePath,
  query,
  options,
  total,
}: CollectionToolbarProps) {
  // `null` = closed. A key = open with that section expanded, which is what
  // makes "Size" and "All Filters" the same panel rather than two designs.
  const [openSection, setOpenSection] = useState<FacetKey | null | "all">(null);
  const [isOpen, setIsOpen] = useState(false);

  const href = (patch: Partial<CollectionQuery>) => buildCollectionHref(basePath, query, patch);

  const openDrawer = (section: FacetKey | "all") => {
    setOpenSection(section);
    setIsOpen(true);
  };

  const activeChips = [
    ...query.categories.map((v) => ({ key: "categories" as const, value: v })),
    ...query.colors.map((v) => ({ key: "colors" as const, value: v })),
    ...query.sizes.map((v) => ({ key: "sizes" as const, value: `${v}` })),
    ...query.lengths.map((v) => ({ key: "lengths" as const, value: v })),
  ];

  // A category is filtered by id but has to be named on its chip.
  const labelFor = (key: FacetKey, value: string) =>
    options[key]?.find((o) => o.value === value)?.label ?? value;

  const activeCount = countActiveFacets(query);

  return (
    <>
      <div className="mb-6 border-b border-zinc-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* ── Filter buttons. Each opens the one drawer, at its own section. */}
          <div className="flex flex-wrap items-center gap-2">
            {FACET_SECTIONS.map((section) =>
              options[section.key]?.length ? (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => openDrawer(section.key)}
                  className={`flex cursor-pointer items-center gap-2 border px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    query[section.key].length
                      ? "border-zinc-950 text-zinc-950"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-950 hover:text-zinc-950"
                  }`}
                >
                  {section.label}
                  {query[section.key].length > 0 && (
                    <span className="text-zinc-500">({query[section.key].length})</span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              ) : null
            )}

            <button
              type="button"
              onClick={() => openDrawer("all")}
              className="flex cursor-pointer items-center gap-2 border border-zinc-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:border-zinc-950 hover:text-zinc-950"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              All Filters
              {activeCount > 0 && <span className="text-zinc-500">({activeCount})</span>}
            </button>
          </div>

          {/* ── Sort and density ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Sort stays a plain link list on desktop — one click, no panel.
                Below sm it lives in the drawer instead, where there is room. */}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                Sort
              </span>
              <select
                // A native select: the options are short, mutually exclusive and
                // never more than six, which is exactly what one is for — and it
                // needs no open/close state of its own.
                value={query.sort}
                onChange={(e) => {
                  window.location.href = href({ sort: e.target.value as CollectionQuery["sort"] });
                }}
                className="cursor-pointer border border-zinc-200 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-700 outline-none transition-colors hover:border-zinc-950 focus:border-zinc-950"
              >
                {COLLECTION_SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hidden on a phone: at that width the grid has its own sensible
                number of columns and a three-way choice is three taps that all
                look nearly the same. */}
            <div className="hidden items-center border border-zinc-200 sm:flex">
              {COLLECTION_VIEWS.map((option) => (
                <Link
                  key={option.value}
                  href={href({ view: option.value })}
                  scroll={false}
                  aria-label={`${option.label} grid`}
                  aria-current={query.view === option.value}
                  className={`flex h-[38px] w-[38px] items-center justify-center transition-colors ${
                    query.view === option.value
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-400 hover:text-zinc-950"
                  }`}
                >
                  <DensityIcon view={option.value} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Active filter chips ────────────────────────────────────────── */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <Link
                key={`${chip.key}-${chip.value}`}
                href={href({
                  [chip.key]: toggleFacetValue(query[chip.key], chip.value),
                } as Partial<CollectionQuery>)}
                scroll={false}
                className="flex items-center gap-1.5 border border-zinc-300 py-1 pl-3 pr-2 text-[11px] font-bold uppercase tracking-wider text-zinc-700 transition-colors hover:border-zinc-950 hover:text-zinc-950"
              >
                {labelFor(chip.key, chip.value)}
                <X className="h-3 w-3" />
              </Link>
            ))}
            <Link
              href={href({ categories: [], colors: [], sizes: [], lengths: [] })}
              scroll={false}
              className="ml-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 underline underline-offset-4 hover:text-zinc-950"
            >
              Clear all
            </Link>
          </div>
        )}
      </div>

      {/* Mounted only while open, and keyed on the section so pressing a
          different toolbar button re-seeds it rather than reopening on the
          last panel with the last draft still in it. */}
      {isOpen && (
        <CollectionFilterDrawer
          key={String(openSection)}
          onClose={() => setIsOpen(false)}
          initialSection={openSection === "all" ? null : openSection}
          basePath={basePath}
          query={query}
          options={options}
          total={total}
        />
      )}
    </>
  );
}
