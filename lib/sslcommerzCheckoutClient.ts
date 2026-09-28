// Shared by app/checkout/page.tsx and components/QuickBuy.tsx — mirrors
// lib/bkashCheckoutClient.ts. Both build the same checkout payload shape
// /api/checkout already accepts, so SSLCommerz reuses it verbatim rather than
// a second payload format.

export async function startSslcommerzCheckout(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/checkout/sslcommerz/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to start SSLCommerz payment.");
  }

  const { gatewayPageURL } = await res.json();
  if (!gatewayPageURL) {
    throw new Error("SSLCommerz did not return a payment URL.");
  }

  // Full navigation, deliberately — the customer leaves the SPA for
  // SSLCommerz's hosted checkout and returns via
  // app/api/checkout/sslcommerz/callback. The cart stays in localStorage
  // untouched until that callback confirms success.
  window.location.href = gatewayPageURL;
}
