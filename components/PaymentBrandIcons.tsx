/**
 * What the customer can pay with through the online gateway (SSLCommerz),
 * shown as small brand marks instead of the gateway's own name — shoppers
 * recognise "Visa / bKash / Nagad", not the processor behind them.
 *
 * Drawn inline (no image files), so they stay crisp and add no requests.
 */

/** Customer-facing name for the SSLCommerz option. */
export const ONLINE_PAYMENT_LABEL = "Card / Mobile Banking"

const box = "inline-flex h-6 items-center justify-center rounded-[5px] border border-zinc-200 bg-white px-1.5 shrink-0"

function Visa() {
  return (
    <span className={box} title="Visa">
      <span className="text-[11px] font-black italic leading-none tracking-tight text-[#1A1F71]">VISA</span>
    </span>
  )
}

function Mastercard() {
  return (
    <span className={box} title="Mastercard">
      <svg viewBox="0 0 30 18" className="h-3.5 w-auto" aria-hidden>
        <circle cx="10" cy="9" r="8" fill="#EB001B" />
        <circle cx="20" cy="9" r="8" fill="#F79E1B" />
        <path d="M15 2.8a8 8 0 0 1 0 12.4 8 8 0 0 1 0-12.4z" fill="#FF5F00" />
      </svg>
    </span>
  )
}

function Amex() {
  return (
    // Inline colours: `box` already sets bg-white/border, and Tailwind would let
    // that win over a second bg-* class, leaving white text on white.
    <span className={box} style={{ backgroundColor: "#2E77BC", borderColor: "#2E77BC" }} title="American Express">
      <span className="text-[9px] font-black leading-none tracking-tight text-white">AMEX</span>
    </span>
  )
}

function Wordmark({ name, color }: { name: string; color: string }) {
  return (
    <span className={box} title={name}>
      <span className="text-[10.5px] font-extrabold leading-none" style={{ color }}>
        {name}
      </span>
    </span>
  )
}

export function OnlinePaymentIcons({ className = "" }: { className?: string }) {
  return (
    <span className={`flex flex-wrap items-center gap-1 ${className}`} aria-label="Visa, Mastercard, American Express, bKash, Nagad, Rocket">
      <Visa />
      <Mastercard />
      <Amex />
      <Wordmark name="bKash" color="#E2136E" />
      <Wordmark name="Nagad" color="#EC1C24" />
      <Wordmark name="Rocket" color="#8C3494" />
    </span>
  )
}
