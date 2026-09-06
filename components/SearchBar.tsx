"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-sm hidden md:block z-50">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search products..."
          className="w-full bg-zinc-100 text-zinc-900 border-none rounded-full py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-300 transition-all placeholder:text-zinc-500"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Dropdown Results */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-150 rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-zinc-100 rounded overflow-hidden flex-shrink-0">
                    {product.thumbnail && (
                      <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wide truncate">
                      {product.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      ${product.discountPrice || product.basePrice}
                    </span>
                  </div>
                </Link>
              ))}
              <Link
                href={`/shop?search=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className="block w-full p-3 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-900 bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                View All Results
              </Link>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500">
              No products found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
