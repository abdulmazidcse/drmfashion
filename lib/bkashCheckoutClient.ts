// Shared by app/checkout/page.tsx and components/QuickBuy.tsx — both build the
// same checkout payload shape /api/checkout already accepts, so bKash reuses
// it verbatim rather than a second payload format.

export async function startBkashCheckout(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/checkout/bkash/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to start bKash payment.");
  }

  const { bkashURL } = await res.json();
  if (!bkashURL) {
    throw new Error("bKash did not return a payment URL.");
  }

  // Full navigation, deliberately — the customer leaves the SPA for bKash's
  // hosted checkout and returns via app/api/checkout/bkash/callback. The cart
  // stays in localStorage untouched until that callback confirms success.
  window.location.href = bkashURL;
}
