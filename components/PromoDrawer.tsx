"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Copy, Gift, X } from "lucide-react";
import { useSettings } from "@/providers/SettingsProvider";

// Marketing drawer that slides in from the right. Everything it renders comes
// from the `promo_popup_*` settings keys (Admin → Settings → Promo Popup), so
// the copy, the code and the timing are all editable without a deploy.

const STORAGE_KEY = "ag_promo_popup";

// Flows that must not be interrupted by a marketing overlay.
// "/admin-login" is listed separately: the match below is prefix-by-segment
// (`/admin` or `/admin/…`), so the dashboard sign-in page does not fall under
// the "/admin" entry.
const EXCLUDED_PREFIXES = ["/admin", "/admin-login", "/login", "/register", "/checkout"];

type PromoState = { dismissedAt?: number; subscribed?: boolean };

function readState(): PromoState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PromoState) : {};
  } catch {
    return {};
  }
}

function writeState(patch: PromoState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {
    // Private mode / quota — the drawer just loses its memory, not its function.
  }
}

export default function PromoDrawer() {
  const { settings, loading } = useSettings();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [shopFor, setShopFor] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const enabled = settings.promo_popup_enabled !== "false";
  const isExcludedRoute = EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );
  const active = !loading && enabled && !isExcludedRoute;

  const heading = settings.promo_popup_heading || "You just got";
  const highlight = settings.promo_popup_highlight || "15% off";
  const subheading = settings.promo_popup_subheading || "your next order";
  const consentText =
    settings.promo_popup_consent_text ||
    "By submitting this form, you agree to receive recurring automated promotional and personalized email marketing messages (e.g. cart reminders) at the submitted email address. Consent is not a condition of any purchase. You can withdraw your consent at any time by following the unsubscribe instructions in any email we send you. Message frequency varies.";
  const buttonText = settings.promo_popup_button_text || "Reveal Promo Code";
  const successHeading = settings.promo_popup_success_heading || "Here is your code";
  const successText =
    settings.promo_popup_success_text || "Apply it at checkout to claim your discount.";
  const promoCode = settings.promo_popup_code || "";
  const termsUrl = settings.promo_popup_terms_url || "";
  const privacyUrl = settings.promo_popup_privacy_url || "";
  const tabLabel = settings.promo_popup_tab_label || "Get 15% Off";
  const imageUrl = settings.promo_popup_image_url || "";

  // Empty settings values are stripped before they reach the client, so "hide
  // the dropdown" needs its own boolean key rather than an empty options list.
  const showShopFor = settings.promo_popup_show_shop_for !== "false";
  const shopForOptions = (settings.promo_popup_shop_for_options || "Women,Men,Both")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const delaySeconds = Number(settings.promo_popup_delay_seconds ?? "5");
  const frequencyDays = Number(settings.promo_popup_frequency_days ?? "7");

  // Auto-open once per visitor per `frequencyDays`, and never again after they
  // subscribe — the edge tab stays available for anyone who wants it back.
  useEffect(() => {
    if (!active) return;

    const state = readState();
    if (state.subscribed) return;
    if (
      state.dismissedAt &&
      Date.now() - state.dismissedAt < Math.max(0, frequencyDays) * 86_400_000
    ) {
      return;
    }

    const delay = Math.max(0, Number.isFinite(delaySeconds) ? delaySeconds : 5) * 1000;
    const timer = window.setTimeout(() => setIsOpen(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delaySeconds, frequencyDays]);

  const close = useCallback(() => {
    setIsOpen(false);
    writeState({ dismissedAt: Date.now() });
  }, []);

  // Escape to close + scroll lock while the drawer holds the screen.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 350);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [isOpen, close]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, shopFor: shopFor || undefined }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Successfully subscribed!");
        writeState({ subscribed: true });
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to subscribe");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code is on screen to copy by hand anyway.
    }
  }

  if (!active) return null;

  const disabled = status === "loading" || status === "success";

  return (
    <>
      {/* Edge handle — the "open it again" affordance once the drawer is closed */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={tabLabel}
        className={`fixed right-0 top-1/2 z-90 -translate-y-1/2 flex items-center gap-1.5 md:gap-2 bg-zinc-950 text-white py-2.5 px-1.5 md:py-4 md:px-2.5 rounded-l-xl shadow-lg cursor-pointer transition-all duration-300 hover:bg-zinc-800 ${
          isOpen ? "translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
        }`}
      >
        <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em]">
          {tabLabel}
        </span>
        <Gift className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-100 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${heading} ${highlight} ${subheading}`}
        inert={isOpen ? undefined : true}
        className={`fixed inset-y-0 right-0 z-101 w-full max-w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-5 right-5 z-10 p-1.5 text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" strokeWidth={2.5} />
        </button>

        <div className="flex-1 overflow-y-auto">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-44 object-cover" />
          )}

          <div className="px-8 py-10 sm:px-10">
            <div className="text-center">
              <p className="text-3xl sm:text-[34px] font-bold text-zinc-950 leading-tight">
                {heading}
              </p>
              <p className="text-[54px] sm:text-[64px] font-black text-zinc-950 leading-[1.05] my-1">
                {highlight}
              </p>
              <p className="text-2xl sm:text-[28px] font-bold text-zinc-950 leading-tight">
                {subheading}
              </p>
            </div>

            {status === "success" ? (
              <div className="mt-10 text-center">
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                  {promoCode ? successHeading : message || "Thank you!"}
                </p>

                {promoCode && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-4 w-full flex items-center justify-center gap-3 border-2 border-dashed border-zinc-950 px-4 py-5 text-2xl font-black tracking-[0.15em] text-zinc-950 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    {promoCode}
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-zinc-400" />
                    )}
                  </button>
                )}

                <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
                  {copied ? "Copied to clipboard!" : successText}
                </p>

                <button
                  type="button"
                  onClick={close}
                  className="mt-8 w-full bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-4 text-base font-bold transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <p className="mt-8 text-[11px] leading-relaxed text-zinc-500">
                  {consentText}
                  {(termsUrl || privacyUrl) && (
                    <>
                      {" "}
                      View our{" "}
                      {termsUrl && (
                        <a href={termsUrl} className="underline hover:text-zinc-950">
                          Terms of Service
                        </a>
                      )}
                      {termsUrl && privacyUrl && " and "}
                      {privacyUrl && (
                        <a href={privacyUrl} className="underline hover:text-zinc-950">
                          Privacy Policy
                        </a>
                      )}
                      .
                    </>
                  )}
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    disabled={disabled}
                    className="w-full border border-zinc-300 px-4 py-4 text-base text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 transition-colors"
                  />

                  {showShopFor && shopForOptions.length > 0 && (
                    <select
                      value={shopFor}
                      onChange={(e) => setShopFor(e.target.value)}
                      disabled={disabled}
                      className={`w-full border border-zinc-300 px-4 py-4 text-base outline-none focus:border-zinc-950 transition-colors bg-white cursor-pointer ${
                        shopFor ? "text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      <option value="">I shop for (please select):</option>
                      {shopForOptions.map((option) => (
                        <option key={option} value={option} className="text-zinc-900">
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="submit"
                    disabled={disabled}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-500 text-white px-4 py-4 text-lg font-bold transition-colors cursor-pointer"
                  >
                    {status === "loading" ? "Please Wait..." : buttonText}
                  </button>

                  {status === "error" && message && (
                    <p className="text-xs font-bold text-red-500">{message}</p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
