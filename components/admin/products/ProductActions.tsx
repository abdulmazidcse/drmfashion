"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductActions() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      window.location.href = "/api/admin/products/export";
    } finally {
      setTimeout(() => setExporting(false), 1000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Export CSV
      </Button>
    </div>
  );
}
