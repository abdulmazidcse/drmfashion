"use client";

export interface WishlistItem {
  productId: string;
  slug: string;
  title: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
}

export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("ag_wishlist");
    const parsed = stored ? JSON.parse(stored) : [];
    // A hand-edited or half-written value can parse to a non-array; every
    // caller immediately does .some()/.filter(), which would throw on one.
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // isInWishlist() calls this *during render* in ProductCard and on the
    // product page, so a malformed stored value — or storage being blocked
    // outright — would throw mid-render and blank the entire page rather
    // than merely losing a wishlist. Matches getCart()'s existing guard.
    return [];
  }
}

export function toggleWishlist(item: WishlistItem): boolean {
  if (typeof window === "undefined") return false;
  let wishlist = getWishlist();
  const exists = wishlist.some((w) => w.productId === item.productId);
  
  if (exists) {
    wishlist = wishlist.filter((w) => w.productId !== item.productId);
  } else {
    wishlist.push(item);
  }
  
  try {
    localStorage.setItem("ag_wishlist", JSON.stringify(wishlist));
  } catch {
    // Safari in Private Browsing hands out a near-zero localStorage quota and
    // throws QuotaExceededError on write. Losing persistence is acceptable;
    // an uncaught throw out of a click handler is not.
  }
  window.dispatchEvent(new Event("wishlist-updated"));
  return !exists;
}

export function isInWishlist(productId: string): boolean {
  return getWishlist().some((w) => w.productId === productId);
}
