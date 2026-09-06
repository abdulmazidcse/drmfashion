"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

/**
 * Reports client-side navigations to the GTM dataLayer.
 *
 * The App Router swaps pages without a browser load, so GTM's Page View /
 * DOM Ready / Window Loaded triggers all fire exactly once — on the first
 * request. Everything after that was invisible to GA4, which is why moving
 * between home, category and product pages all landed on one page in reports.
 *
 * Must be rendered inside a <Suspense> boundary: useSearchParams opts its
 * subtree into client rendering, and without the boundary that would spread up
 * to the root layout and make every static page dynamic.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // The GA4 Configuration tag already reports the page the visitor landed on.
    // Sending it again here would double the first page view of every session,
    // so this covers only the navigations GTM cannot see by itself.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // The URL changes before the new <title> is applied, and how long that takes
    // varies by route — a fixed delay reported the previous page's title on the
    // slower ones. Poll until the title actually changes, then report; if two
    // pages genuinely share a title, the timeout sends it anyway.
    const previousTitle = document.title;
    const startedAt = Date.now();
    let timer: number;

    const report = () => {
      if (document.title !== previousTitle || Date.now() - startedAt > 1500) {
        trackPageView(window.location.href, document.title);
        return;
      }
      timer = window.setTimeout(report, 60);
    };
    timer = window.setTimeout(report, 60);

    return () => window.clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
