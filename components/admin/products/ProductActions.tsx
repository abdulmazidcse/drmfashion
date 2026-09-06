"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExportRows = "products" | "variants";

export default function ProductActions() {
  const [exporting, setExporting] = useState<ExportRows | null>(null);

  const handleExport = (rows: ExportRows) => {
    setExporting(rows);
    try {
      window.location.href =
        rows === "variants"
          ? "/api/admin/products/export?rows=variants"
          : "/api/admin/products/export";
    } finally {
      setTimeout(() => setExporting(null), 1000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={() => handleExport("products")} disabled={exporting !== null}>
        {exporting === "products" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export CSV
      </Button>
      {/* A second file rather than more columns on the first: stock and pricing
          work needs a row per SKU, and "4 variants, 12 in stock" cannot say
          which size ran out. */}
      <Button variant="outline" onClick={() => handleExport("variants")} disabled={exporting !== null}>
        {exporting === "variants" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export Variants
      </Button>
    </div>
  );
}
