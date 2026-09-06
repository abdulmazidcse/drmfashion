"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, X } from "lucide-react";
import {
  COLLECTION_SORTS,
  FACET_SECTIONS,
  buildCollectionHref,
  countActiveFacets,
  toggleFacetValue,
  type CollectionQuery,
  type FacetKey,
  type FacetOptions,
} from "@/lib/collectionView";

interface CollectionFilterDrawerProps {
  onClose: () => void;
  /** Which section is expanded on open — the toolbar button that was pressed. */
  initialSection: FacetKey | null;
  basePath: string;
  query: CollectionQuery;
  options: FacetOptions;
  total: number;
}

/**
 * Filter & Sort, sliding in from the left.
 *
 * Ticking a box does *not* navigate. The selection is held here until Apply,
 * which is what makes a multi-facet choice one page load instead of five, and
 * what lets the panel show the ticks landing instantly. Close without applying
 * and the draft is dropped — reopening starts from whatever the URL says.
 */
export default function CollectionFilterDrawer({
  onClose,
  initialSection,
  basePath,
  query,
  options,
  total,
}: CollectionFilterDrawerProps) {
  const router = useRouter();

  // Seeded straight from props, with no effect to re-seed it: the parent only
  // mounts this while the panel is open, and remounts it when a different
  // toolbar button opens it, so "initial" is always current.
  const [draft, setDraft] = useState<CollectionQuery>(query);
  const [expanded, setExpanded] = useState<FacetKey | null>(initialSection);

  // The page behind must not scroll under the panel, and Escape must close it —
  // same handling as every other overlay on the site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const activeCount = useMemo(() => countActiveFacets(draft), [draft]);

  const apply = () => {
    router.push(buildCollectionHref(basePath, query, draft), { scroll: false });
    onClose();
  };

  const clearAll = () =>
    setDraft((d) => ({ ...d, categories: [], colors: [], sizes: [], lengths: [] }));

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="Filter and sort">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-200"
      />

      <div className="absolute inset-y-0 left-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950">Filter &amp; Sort</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {total} {total === 1 ? "product" : "products"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer p-1 text-zinc-500 transition-colors hover:text-zinc-950"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Sections ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6">
          {/* Sort sits with the filters because the panel is called Filter &
              Sort — and because on a phone it is the only place it exists. */}
          <Section
            label="Sort by"
            badge={COLLECTION_SORTS.find((s) => s.value === draft.sort)?.label}
            isOpen={expanded === null}
            onToggle={() => setExpanded(expanded === null ? "categories" : null)}
          >
            <ul className="pb-4">
              {COLLECTION_SORTS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, sort: option.value }))}
                    className="flex w-full cursor-pointer items-center gap-3 py-2 text-left text-sm"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        draft.sort === option.value ? "border-zinc-950" : "border-zinc-300"
                      }`}
                    >
                      {draft.sort === option.value && (
                        <span className="h-2 w-2 rounded-full bg-zinc-950" />
                      )}
                    </span>
                    <span className={draft.sort === option.value ? "font-bold text-zinc-950" : "text-zinc-600"}>
                      {option.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          {FACET_SECTIONS.map((section) => {
            const values = options[section.key];
            // A facet with nothing to choose between is not a choice.
            if (!values || values.length === 0) return null;
            const picked = draft[section.key];

            return (
              <Section
                key={section.key}
                label={section.label}
                badge={picked.length ? `${picked.length} selected` : undefined}
                isOpen={expanded === section.key}
                onToggle={() => setExpanded(expanded === section.key ? null : section.key)}
              >
                <ul className="max-h-[280px] overflow-y-auto pb-4">
                  {values.map((option) => {
                    const active = picked.includes(option.value);
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              [section.key]: toggleFacetValue(d[section.key], option.value),
                            }))
                          }
                          className="flex w-full cursor-pointer items-center gap-3 py-2 text-left text-sm"
                        >
                          <span
                            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border ${
                              active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-300"
                            }`}
                          >
                            {active && <Check className="h-3 w-3" />}
                          </span>
                          <span className={active ? "font-bold text-zinc-950" : "text-zinc-700"}>
                            {option.label}
                          </span>
                          <span className="text-zinc-400">({option.count})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-100 px-6 py-4">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="mb-3 cursor-pointer text-[11px] font-bold uppercase tracking-wider text-zinc-500 underline underline-offset-4 hover:text-zinc-950"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={apply}
            className="w-full cursor-pointer bg-zinc-950 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-zinc-800"
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 py-5 text-left"
      >
        <span className="text-base font-bold tracking-tight text-zinc-950">{label}</span>
        <span className="flex items-center gap-3">
          {badge && <span className="text-[11px] font-medium text-zinc-500">{badge}</span>}
          {isOpen ? (
            <Minus className="h-4 w-4 shrink-0 text-zinc-950" />
          ) : (
            <Plus className="h-4 w-4 shrink-0 text-zinc-950" />
          )}
        </span>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}
