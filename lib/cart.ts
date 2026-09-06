import { measurementFingerprint, type FeeLine, type MeasurementValue } from "@/lib/measurement";
import { trackAddToCart } from "@/lib/analytics";

/** Made-to-measure details attached to a cart line. */
export interface CartItemCustom {
  templateId: string;
  templateName: string;
  values: MeasurementValue[];
  /** Preview only — checkout re-derives the real fee from the database. */
  fee: number;
  /** Preview only — "Tailoring fee +$20 · Waist 41–42 in +$50". */
  feeBreakdown?: FeeLine[];
}

export interface CartItem {
  id: string;          // unique key: productId-color-size-length[-measurement hash]
  productId: string;
  slug: string;
  title: string;
  thumbnail: string;
  color: string;
  size: string;
  length: string;
  price: number;       // includes the tailoring fee when `custom` is set
  quantity: number;
  custom?: CartItemCustom;
}

const CART_KEY = "ag_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Same Private-Browsing quota throw guarded in getCart() above; the cart
    // stays correct in memory for this page view even when it can't persist.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cart-updated"));
  }
}

export function addToCart(item: Omit<CartItem, "id" | "quantity">, quantity = 1): CartItem[] {
  const cart = getCart();
  // Two made-to-measure orders of the same garment must stay separate lines, so
  // the measurement set is part of the line identity.
  const customKey = item.custom ? `-mtm${measurementFingerprint(item.custom.values)}` : "";
  const id = `${item.productId}-${item.color}-${item.size}-${item.length}${customKey}`;
  const existing = cart.find((c) => c.id === id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, id, quantity });
  }
  saveCart(cart);

  // Reported here rather than at each call site: every path into the cart —
  // product page, quick add, wishlist — comes through this function, so there is
  // no way to add something without GA4 hearing about it.
  trackAddToCart({
    item_id: item.productId,
    item_name: item.title,
    price: item.price,
    quantity,
    item_variant: [item.color, item.size, item.length].filter(Boolean).join(" / ") || undefined,
  });

  return cart;
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((c) => c.id !== id);
  saveCart(cart);
  return cart;
}

export function updateQty(id: string, quantity: number): CartItem[] {
  const cart = getCart().map((c) => (c.id === id ? { ...c, quantity: Math.max(1, quantity) } : c));
  saveCart(cart);
  return cart;
}

export function clearCart(): CartItem[] {
  saveCart([]);
  return [];
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
