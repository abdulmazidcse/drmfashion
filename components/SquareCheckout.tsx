"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";

interface SquareCheckoutProps {
  items: any[];
  email: string;
  pointsRedeemed: number;
  appId: string;
  locationId: string;
  postalCode?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

export default function SquareCheckout({
  items,
  email,
  pointsRedeemed,
  appId,
  locationId,
  postalCode,
  onSuccess,
  onError,
}: SquareCheckoutProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);

  const isSandbox = (appId || "").startsWith("sandbox-");
  const scriptUrl = isSandbox
    ? "https://sandbox.web.squarecdn.com/v1/square.js"
    : "https://web.squarecdn.com/v1/square.js";

  // Check if appId or locationId is missing
  const isConfigError = !appId || !locationId;

  // 1. Load Square JS Script manually
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if ((window as any).Square) {
      setScriptLoaded(true);
      return;
    }

    // Check if script tag is already appended by another instance
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      const handleLoad = () => setScriptLoaded(true);
      existingScript.addEventListener("load", handleLoad);
      return () => {
        existingScript.removeEventListener("load", handleLoad);
      };
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Square Web Payments script.");
      setErrorMsg("Failed to load Square Web Payments SDK script.");
      onError("Failed to load Square Web Payments SDK script.");
    };
    document.body.appendChild(script);

    return () => {
      // Keep script in DOM to avoid duplicate network loads on remount
    };
  }, [scriptUrl, onError]);

  // 2. Initialize payments and attach card input
  useEffect(() => {
    if (!scriptLoaded) return;
    if (isConfigError) return;

    let active = true;
    let cardInstance: any = null;

    async function initSquare() {
      try {
        setInitializing(true);
        setErrorMsg(null);

        if (!(window as any).Square) {
          throw new Error("Square Web Payments SDK not found");
        }

        // Initialize Square payments
        const payments = (window as any).Square.payments(appId, locationId);
        paymentsRef.current = payments;

        // Create and attach card with valid postal code options to prevent validation errors
        const cardOptions = {
          postalCode: (postalCode && postalCode.trim().length >= 5) ? postalCode.trim() : "10001"
        };
        const card = await payments.card(cardOptions);
        
        // Ensure DOM element is present
        const container = document.getElementById("square-card-container");
        if (!container) {
          throw new Error("Card container DOM element not found");
        }

        await card.attach("#square-card-container");
        cardInstance = card;
        cardRef.current = card;

        if (active) {
          setInitializing(false);
        }
      } catch (err: any) {
        console.error("Failed to initialize Square Payments:", err);
        if (active) {
          setErrorMsg(err.message || "Failed to initialize Square Payment form.");
          onError(err.message || "Failed to initialize Square Payment form.");
          setInitializing(false);
        }
      }
    }

    initSquare();

    return () => {
      active = false;
      if (cardInstance) {
        cardInstance.destroy().catch((err: any) => {
          console.warn("Error destroying card instance:", err);
        });
        cardRef.current = null;
      }
    };
  }, [scriptLoaded, appId, locationId, isConfigError, onError]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardRef.current || processing) return;

    try {
      setProcessing(true);
      setErrorMsg(null);

      const result = await cardRef.current.tokenize();
      if (result.status === "OK") {
        onSuccess(result.token);
      } else {
        let message = "Tokenization failed";
        if (result.errors && result.errors.length > 0) {
          message = result.errors.map((err: any) => err.message).join(", ");
        }
        throw new Error(message);
      }
    } catch (err: any) {
      console.error("Square payment error:", err);
      setErrorMsg(err.message || "Something went wrong.");
      onError(err.message || "Something went wrong.");
      setProcessing(false);
    }
  };

  if (isConfigError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-md">
        <p className="text-sm font-bold uppercase tracking-[0.14em] mb-1">Configuration Error</p>
        <p className="text-xs text-center">
          Square API Keys are missing or invalid in your store settings.<br/>
          Please add a valid Application ID and ensure your Server Access Token is correct.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {errorMsg && (
        <div className="p-4 mb-4 text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="space-y-4 relative">
        {initializing && (
          <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center py-8 text-soft rounded-xl min-h-[140px]">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">Loading Square payments form...</p>
          </div>
        )}

        <form onSubmit={handlePay}>
          <div className="border border-line rounded-sg p-4 bg-cream focus-within:bg-white focus-within:ring-2 focus-within:ring-aqua-400 transition">
            <div id="square-card-container" className="min-h-[80px]"></div>
          </div>

          <button
            type="submit"
            disabled={processing || initializing}
            className="w-full mt-6 bg-brand-600 rounded-full text-white font-bold uppercase tracking-[0.14em] text-xs py-4 px-6 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
              </>
            ) : (
              "Pay with Square"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
