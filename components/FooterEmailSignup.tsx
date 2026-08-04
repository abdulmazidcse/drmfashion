"use client";

import { useState } from "react";

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

  // ── Classic ──────────────────────────────────────────────────────────────
  if (variant === "classic") {
    return (
      <div className="flex flex-col max-w-md">
        <h3 className="text-2xl md:text-[28px] font-semibold text-foreground leading-snug mb-6">
          Sign up for our emails &amp; get 15% off your first order.
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mb-5">
            <span className="text-sm font-medium text-soft">I shop for</span>
            {SHOP_FOR_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footer-shop-for"
                  value={option}
                  checked={shopFor === option}
                  onChange={(e) => setShopFor(e.target.value)}
                  className="appearance-none w-5 h-5 rounded-full border-2 border-line checked:border-brand-600 checked:bg-brand-600 transition-colors cursor-pointer shrink-0"
                  disabled={disabled}
                />
                <span className="text-sm font-medium text-soft">{option}</span>
              </label>
            ))}
          </div>

          <div className="border border-line divide-y divide-line">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3.5 text-sm bg-cream/60 outline-none text-foreground placeholder-faint focus:bg-white transition-colors"
              required
              disabled={disabled}
            />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="w-full px-4 py-3.5 text-sm bg-cream/60 outline-none text-foreground placeholder-faint focus:bg-white transition-colors"
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={disabled}
              className="w-full bg-brand-600 rounded-full hover:bg-brand-700 disabled:bg-faint text-white px-4 py-3.5 text-sm font-bold transition-colors cursor-pointer"
            >
              {buttonLabel}
            </button>
          </div>

          {message && (
            <span className={`text-xs font-bold mt-3 ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
              {message}
            </span>
          )}
        </form>
      </div>
    );
  }

  // ── Open Grid ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:items-end">
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2">
        <span className="sg-kicker text-faint">
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
              className="appearance-none w-[18px] h-[18px] rounded-full border-[1.5px] border-line checked:border-brand-600 checked:bg-brand-600 group-hover:border-brand-400 transition-colors cursor-pointer shrink-0"
              disabled={disabled}
            />
            <span className="text-sm font-semibold text-soft group-hover:text-brand-700 transition-colors">
              {option}
            </span>
          </label>
        ))}
      </div>

      {/* One ruled group: the outline wraps all three, hairlines divide them */}
      <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="at-focus sg-input w-full sm:w-48"
          required
          disabled={disabled}
        />
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          className="at-focus sg-input w-full sm:w-48"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled}
          className="at-focus sg-btn sg-btn-primary"
        >
          {buttonLabel}
        </button>
      </div>

      {message && (
        <span className={`text-xs font-bold ${status === "success" ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </span>
      )}
    </form>
  );
}
