import { measurementFingerprint, type MeasurementValue } from "@/lib/measurement";

/** Made-to-measure details attached to a cart line. */
export interface CartItemCustom {
  templateId: string;
  templateName: string;
  values: MeasurementValue[];
  /** Preview only — checkout re-derives the real fee from the database. */
  fee: number;
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
  localStorage.setItem(CART_KEY, JSON.stringify(items));
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
