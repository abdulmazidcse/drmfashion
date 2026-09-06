"use client";

import { useEffect } from "react";
import { trackViewItemList, type AnalyticsItem } from "@/lib/analytics";

interface ProductLike {
  id: string;
  title: string;
  basePrice: number;
  discountPrice?: number | null;
  brand?: { name: string } | null;
  category?: { name: string } | null;
}

/**
 * Fires GA4's `view_item_list` for a product grid.
 *
 * Rendered by the listing pages, which are server components — the dataLayer
 * only exists in the browser, so the push has to happen from a client child.
 * It renders nothing.
 */
export default function ViewItemListTracker({
  listId,
  listName,
  products,
}: {
  listId: string;
  listName: string;
  products: ProductLike[];
}) {
  // Only the ids matter for "is this the same list?" — rebuilding the array on
  // every render would otherwise re-fire the effect endlessly.
  const key = products.map((p) => p.id).join(",");

  useEffect(() => {
    const items: AnalyticsItem[] = products.map((p) => ({
      item_id: p.id,
      item_name: p.title,
      // The price the shopper actually sees, so list value matches the grid.
      price: p.discountPrice ?? p.basePrice,
      item_brand: p.brand?.name,
      item_category: p.category?.name,
    }));

    trackViewItemList(listId, listName, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, listName, key]);

  return null;
}
