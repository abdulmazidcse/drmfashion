"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useSettings } from "@/providers/SettingsProvider";

const SHOP_FOR_OPTIONS = ["Women", "Men", "Both"];

/**
 * Two renderings, one piece of logic.
 *
 * - "classic" — headline inside, radios above a bordered vertical stack.
 * - "open"    — form only (the headline sits opposite it in the Open Grid band),
 *               radios above a single inline row of outline-free fields.
 */
export default function FooterEmailSignup({
  variant = "open",
}: {
  variant?: "classic" | "open";
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [shopFor, setShopFor] = useState("Women");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, shopFor }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
        setFirstName("");
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to subscribe");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred");
    }
  };

  const disabled = status === "loading" || status === "success";
  const buttonLabel =
    status === "loading" ? "Please Wait..." : status === "success" ? "Subscribed" : "Join Our Community";

  // The headline promises 15% off, so subscribing has to actually hand the code
  // over. It comes from the same `promo_popup_*` settings the drawer uses
  // (Admin → Settings → Promo Popup), so both entry points always offer the
  // same code and it can be changed without a deploy.
  const promoCode = settings.promo_popup_code?.trim() || "";
  const successHeading = settings.promo_popup_success_heading || "Here is your code";
  const successText =
    settings.promo_popup_success_text || "Apply it at checkout to claim your discount.";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the code is on screen to copy by hand anyway.
    }
  }

  // Shown in place of the plain confirmation once a code is configured. Falls
  // back to the API's message when no code is set, so the form still confirms.
  const successPanel =
    status === "success" && promoCode ? (
      <div className="mt-4 w-full">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          {successHeading}
        </p>
        <button
          type="button"
          onClick={copyCode}
          className="mt-2 w-full flex items-center justify-center gap-3 border-2 border-dashed border-zinc-950 px-4 py-3.5 text-lg font-black tracking-[0.15em] text-zinc-950 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          {promoCode}
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
          {copied ? "Copied to clipboard!" : successText}
        </p>
      </div>
    ) : null;

  // ── Classic ──────────────────────────────────────────────────────────────
  if (variant === "classic") {
    return (
      <div className="flex flex-col max-w-md">
        <h3 className="text-2xl md:text-[28px] font-semibold text-zinc-950 leading-snug mb-6">
          Sign up for our emails &amp; get 15% off your first order.
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mb-5">
            <span className="text-sm font-medium text-zinc-500">I shop for</span>
            {SHOP_FOR_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footer-shop-for"
                  value={option}
                  checked={shopFor === option}
                  onChange={(e) => setShopFor(e.target.value)}
                  className="appearance-none w-5 h-5 rounded-full border-2 border-zinc-300 checked:border-zinc-950 checked:bg-zinc-950 transition-colors cursor-pointer shrink-0"
                  disabled={disabled}
                />
                <span className="text-sm font-medium text-zinc-500">{option}</span>
              </label>
            ))}
          </div>

          <div className="border border-zinc-200 divide-y divide-zinc-200">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3.5 text-sm bg-zinc-50/50 outline-none text-zinc-800 placeholder-zinc-400 focus:bg-white transition-colors"
              required
              disabled={disabled}
            />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-4 py-3.5 text-sm bg-zinc-50/50 outline-none text-zinc-800 placeholder-zinc-400 focus:bg-white transition-colors"
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={disabled}
              className="w-full bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-500 text-white px-4 py-3.5 text-sm font-bold transition-colors cursor-pointer"
            >
              {buttonLabel}
            </button>
          </div>

          {message && !successPanel && (
            <span className={`text-xs font-bold mt-3 ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
              {message}
            </span>
          )}
          {successPanel}
        </form>
      </div>
    );
  }

  // ── Open Grid ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:items-end">
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          I shop for
        </span>
        {SHOP_FOR_OPTIONS.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="footer-shop-for"
              value={option}
              checked={shopFor === option}
              onChange={(e) => setShopFor(e.target.value)}
              className="appearance-none w-[18px] h-[18px] rounded-full border border-zinc-300 checked:border-zinc-950 checked:bg-zinc-950 group-hover:border-zinc-500 transition-colors cursor-pointer shrink-0"
              disabled={disabled}
            />
            <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-950 transition-colors">
              {option}
            </span>
          </label>
        ))}
      </div>

      {/* One ruled group: the outline wraps all three, hairlines divide them */}
      <div className="flex flex-col sm:flex-row w-full lg:w-auto border border-zinc-300 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full sm:w-48 bg-transparent px-5 py-4 text-[15px] text-zinc-800 placeholder-zinc-400 outline-none focus:bg-zinc-50 transition-colors"
          required
          disabled={disabled}
        />
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Full Name"
          className="w-full sm:w-48 bg-transparent px-5 py-4 text-[15px] text-zinc-800 placeholder-zinc-400 outline-none focus:bg-zinc-50 transition-colors"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-zinc-950 hover:bg-zinc-700 disabled:bg-zinc-400 text-white px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] whitespace-nowrap transition-colors cursor-pointer"
        >
          {buttonLabel}
        </button>
      </div>

      {message && !successPanel && (
        <span className={`text-xs font-bold ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </span>
      )}
      {successPanel && <div className="w-full lg:max-w-sm">{successPanel}</div>}
    </form>
  );
}
