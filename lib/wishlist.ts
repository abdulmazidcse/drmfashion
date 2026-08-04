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
  const stored = localStorage.getItem("ag_wishlist");
  return stored ? JSON.parse(stored) : [];
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
  
  localStorage.setItem("ag_wishlist", JSON.stringify(wishlist));
  window.dispatchEvent(new Event("wishlist-updated"));
  return !exists;
}

export function isInWishlist(productId: string): boolean {
  return getWishlist().some((w) => w.productId === productId);
}
