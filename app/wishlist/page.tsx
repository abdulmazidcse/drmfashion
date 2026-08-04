"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getWishlist, toggleWishlist, WishlistItem } from "@/lib/wishlist";
import { Heart, Trash2, ArrowRight } from "lucide-react";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(getWishlist());
    setMounted(true);
    
    const handleUpdate = () => setItems(getWishlist());
    window.addEventListener("wishlist-updated", handleUpdate);
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, []);

  const handleRemove = (item: WishlistItem) => {
    toggleWishlist(item);
  };

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 w-full">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight mb-2">My Wishlist</h1>
        <p className="text-soft mb-12">
          {items.length} {items.length === 1 ? "item" : "items"} saved for later
        </p>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-line bg-cream rounded-xl">
            <Heart className="w-12 h-12 text-faint mb-6" />
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">Your wishlist is empty</h2>
            <p className="text-soft mb-8 max-w-md">
              Save your favorite items here to easily find them later or share them with friends.
            </p>
            <Link href="/shop" className="bg-brand-600 rounded-full text-white px-8 py-4 text-[12.5px] font-bold uppercase tracking-[0.12em] hover:bg-brand-700 transition-colors">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <div key={item.productId} className="group relative border border-line flex flex-col">
                <button
                  onClick={() => handleRemove(item)}
                  className="absolute top-3 right-3 z-10 bg-white/90 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                  aria-label="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <Link href={`/product/${item.slug}`} className="block relative aspect-[3/4] bg-cream overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/product/${item.slug}`} className="text-sm font-bold uppercase tracking-wide hover:text-soft transition-colors line-clamp-1 mb-2">
                    {item.title}
                  </Link>
                  <div className="flex gap-2 mb-4">
                    {item.discountPrice ? (
                      <>
                        <span className="text-sm font-extrabold text-brand-700">${item.discountPrice.toFixed(2)}</span>
                        <span className="text-xs text-faint line-through">${item.basePrice.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-sm font-extrabold">${item.basePrice.toFixed(2)}</span>
                    )}
                  </div>
                  <Link 
                    href={`/product/${item.slug}`}
                    className="mt-auto w-full border border-brand-600 py-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-center hover:bg-brand-600 rounded-full hover:text-white transition-colors"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
