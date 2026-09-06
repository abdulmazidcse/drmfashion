"use client";

import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { AnnouncementBarConfig } from "@/lib/announcementBar";

// Storefront only. Prefix-by-segment, so "/admin-login" needs its own entry
// rather than falling under "/admin" — same list <PromoDrawer> excludes.
const EXCLUDED_PREFIXES = ["/admin", "/admin-login", "/login", "/register", "/checkout"];

// The dismissal lives in sessionStorage, which the server cannot see. Reading
// it through useSyncExternalStore rather than an effect is what keeps the first
// paint identical to the server's while still honouring a bar the visitor
// closed a page ago — an effect would render it, then yank it away.
let listeners: Array<() => void> = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function readDismissed(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    // Private mode, or storage blocked. Showing the bar is the safe default.
    return false;
  }
}

/**
 * Rotating strip above the sticky header.
 *
 * Rendered from the root layout, so it is on every storefront page. It stays in
 * normal document flow rather than being pinned: the header is what should hold
 * the top of the viewport, and an announcement that follows you down the page
 * is an advert, not an announcement.
 */
export default function AnnouncementBar({ config }: { config: AnnouncementBarConfig }) {
  const { slides, intervalSeconds, dismissible } = config;

  const pathname = usePathname();
  const excluded = EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // A key derived from the copy, so changing what the bar says brings it back
  // for people who closed the previous message.
  const storageKey = useMemo(() => {
    const text = slides.map((s) => s.text).join("|");
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return `ag_announcement_${hash}`;
  }, [slides]);

  const dismissed = useSyncExternalStore(
    subscribe,
    () => dismissible && readDismissed(storageKey),
    () => false
  );

  useEffect(() => {
    if (paused || slides.length < 2 || intervalSeconds <= 0) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), intervalSeconds * 1000);
    return () => clearTimeout(t);
  }, [paused, index, slides.length, intervalSeconds]);

  if (excluded || slides.length === 0 || dismissed) return null;

  const close = () => {
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Nothing to persist — the bar still closes, it just comes back next page.
    }
    listeners.forEach((l) => l());
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: config.background, color: config.textColor }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Every slide is rendered and cross-faded in place. The tallest one sets
          the height, so the header below never jumps as the copy changes. */}
      <div className="relative mx-auto grid max-w-[1600px] place-items-center px-10 py-2.5">
        {slides.map((slide, i) => {
          const body = (
            <span className="block text-center text-[11px] font-semibold uppercase tracking-[0.12em]">
              {slide.text}
            </span>
          );

          return (
            <div
              key={i}
              className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={i !== index}
            >
              {slide.href ? (
                <Link href={slide.href} className="underline-offset-4 hover:underline">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>

      {dismissible && (
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
