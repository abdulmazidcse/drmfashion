"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useSettings } from "@/providers/SettingsProvider";
import { formatImageUrl } from "@/lib/utils";
import {
  PROMO_BANNER_SETTING_KEY,
  isPromoBannerRenderable,
  parsePromoBanner,
  type PromoBannerPosition,
  type PromoBannerTextSize,
} from "@/lib/promoBanner";

// Its own key, separate from the drawer's: closing one must not silence the
// other, and the two have completely different dismissal windows.
const STORAGE_KEY = "ag_promo_banner";

// Flows that must not be interrupted by a full-screen poster. Same list the
// drawer uses; "/admin-login" is named separately because the match below is
// segment-wise, so the sign-in page does not fall under the "/admin" entry.
const EXCLUDED_PREFIXES = ["/admin", "/admin-login", "/login", "/register", "/checkout"];

type BannerState = { dismissedAt?: number };

function readState(): BannerState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BannerState) : {};
  } catch {
    return {};
  }
}

function writeState(patch: BannerState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    // Private mode / quota — the banner loses its memory, not its function.
  }
}

// Written out rather than interpolated, so Tailwind can see every class it has
// to keep. `text-lg` built from a variable is a class that never ships.
const HEADING_SIZE: Record<PromoBannerTextSize, string> = {
  sm: "text-lg sm:text-xl",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-4xl",
  xl: "text-3xl sm:text-5xl",
};

const BODY_SIZE: Record<PromoBannerTextSize, string> = {
  sm: "text-[12px] sm:text-[13px]",
  md: "text-[13px] sm:text-[15px]",
  lg: "text-[15px] sm:text-[17px]",
  xl: "text-[17px] sm:text-xl",
};

const POSITION: Record<PromoBannerPosition, string> = {
  "top-left": "items-start justify-start text-left",
  "top-center": "items-start justify-center text-center",
  "top-right": "items-start justify-end text-right",
  "middle-left": "items-center justify-start text-left",
  "middle-center": "items-center justify-center text-center",
  "middle-right": "items-center justify-end text-right",
  "bottom-left": "items-end justify-start text-left",
  "bottom-center": "items-end justify-center text-center",
  "bottom-right": "items-end justify-end text-right",
};

/**
 * The campaign poster: a picture, copy laid over it and one button.
 *
 * Opens a configurable moment after load, and once the visitor closes it stays
 * away for a configurable number of hours — kept in this browser's
 * localStorage, so it is per device and survives reloads without needing an
 * account or a cookie banner.
 */
export default function PromoBannerPopup() {
  const { settings, loading } = useSettings();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);

  const config = parsePromoBanner(settings[PROMO_BANNER_SETTING_KEY]);
  const isExcludedRoute = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );
  const active = !loading && isPromoBannerRenderable(config) && !isExcludedRoute;

  const { delaySeconds, reshowHours } = config;

  useEffect(() => {
    if (!active) return;

    const state = readState();
    if (state.dismissedAt && Date.now() - state.dismissedAt < reshowHours * 3_600_000) {
      return;
    }

    const timer = window.setTimeout(() => setIsOpen(true), delaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, delaySeconds, reshowHours]);

  const close = useCallback(() => {
    setIsOpen(false);
    writeState({ dismissedAt: Date.now() });
  }, []);

  // Escape to close, and the page behind stays put while the poster holds the
  // screen. The previous overflow is restored rather than blanked, so a page
  // that sets its own value gets it back.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  if (!active || !isOpen) return null;

  const hasButton = config.buttonLabel.trim() !== "" && config.buttonHref.trim() !== "";
  const hasCopy = config.heading.trim() !== "" || config.body.trim() !== "" || hasButton;

  // 0 means "no preference", not "no height" — the screen still has to be the
  // limit, or a tall picture runs off both ends of a `fixed` backdrop at once.
  const heightCapVh = config.heightPercent > 0 ? config.heightPercent : 100;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={config.heading || "Promotion"}
      onClick={close}
    >
      {/* The click that closes belongs to the backdrop alone — a visitor
          reading the copy should not dismiss the offer by touching it. */}
      {/* The card takes its size from the picture, not the other way round.
          Given a fixed width the picture has to be stretched to it and the
          surplus height trimmed, which is what kept cutting the top and bottom
          off the artwork. Both settings are ceilings instead: the picture is
          drawn whole, as large as those two allow.

          `max()` holds a floor of 320px, because a share of the screen chosen
          to look right on a desktop would be a postage stamp on a phone;
          `min()` with 100% keeps that floor inside the backdrop's padding on a
          screen narrower still. */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={
          config.backgroundColor.trim() !== ""
            ? { backgroundColor: config.backgroundColor }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>

        {/* The width belongs to the picture, and the card closes around it.
            Sized the other way round, the card's width would have to be forced
            onto the picture and the surplus height trimmed — which is what kept
            cutting the artwork's top and bottom off.

            Width is the size, not a ceiling, so artwork smaller than the
            setting is scaled up to it rather than sitting there at its own size
            ignoring the number. Height then caps it: too tall at that width and
            the browser shrinks both together, keeping the proportions.

            `100vw - 2rem` rather than `100%`, because a percentage here would
            resolve against the card, whose width is this. `max()` holds a floor
            of 320px, since a share of the screen chosen for a desktop would be
            a postage stamp on a phone. The height subtracts the same padding,
            so even 100% stays clear of the edges rather than running under
            them. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={formatImageUrl(config.image)}
          alt={config.imageAlt || config.heading || ""}
          className="block h-auto"
          style={{
            width: `min(calc(100vw - 2rem), max(320px, ${config.widthPercent}vw))`,
            maxHeight: `min(calc(100vh - 2rem), ${heightCapVh}vh)`,
          }}
        />

        {hasCopy && (
          <div className={`absolute inset-0 flex p-6 sm:p-9 ${POSITION[config.position]}`}>
            <div className="flex max-w-[85%] flex-col gap-3">
              {config.heading.trim() !== "" && (
                <h2
                  className={`font-extrabold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${HEADING_SIZE[config.headingSize]}`}
                  style={{ color: config.headingColor }}
                >
                  {config.heading}
                </h2>
              )}

              {config.body.trim() !== "" && (
                <p
                  className={`font-medium leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] ${BODY_SIZE[config.bodySize]}`}
                  style={{ color: config.bodyColor }}
                >
                  {config.body}
                </p>
              )}

              {hasButton && (
                <Link
                  href={config.buttonHref}
                  onClick={close}
                  className="mt-1 inline-flex w-fit items-center justify-center rounded-full px-6 py-3 text-[13px] font-extrabold uppercase tracking-wider shadow-lg transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: config.buttonBg, color: config.buttonColor }}
                >
                  {config.buttonLabel}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
