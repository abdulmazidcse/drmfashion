"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function StripeCheckout({
  items,
  email,
  pointsRedeemed,
  promoCode,
  shippingMethodId,
  shippingDestination,
  onSuccess,
  onError
}: {
  items: any[],
  email: string,
  pointsRedeemed: number,
  promoCode?: string,
  shippingMethodId?: string,
  shippingDestination?: { city?: string; postalCode?: string; countryCode?: string; state?: string; addressLine?: string },
  onSuccess: (paymentIntentId: string) => void,
  onError: (error: string) => void
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [keyError, setKeyError] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setKeyError(true);
      onError("Stripe is not configured properly (Missing Publishable Key).");
      return;
    }

    // Create PaymentIntent as soon as the component loads
    fetch("/api/checkout/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, email, pointsRedeemed, promoCode, shippingMethodId, shippingDestination }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else if (data.message === "Total is 0, no payment needed.") {
          onSuccess("SKIP_STRIPE_TOTAL_ZERO");
        } else {
          onError(data.message || "Failed to initialize payment");
        }
      })
      .catch((err) => onError(err.message));
  }, [items, email, pointsRedeemed, promoCode, shippingMethodId, shippingDestination]);

  if (keyError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500 bg-red-50 border border-red-100 rounded-md">
        <p className="text-sm font-bold uppercase tracking-widest mb-1">Configuration Error</p>
        <p className="text-xs text-center">Stripe API Keys are missing from your .env file.<br/>Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY.</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Connecting to secure payment gateway...</p>
      </div>
    );
  }

  return (
    <Elements options={{ clientSecret, appearance: { theme: 'stripe' } }} stripe={stripePromise}>
      <CheckoutForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

function CheckoutForm({ onSuccess, onError }: { onSuccess: (id: string) => void, onError: (e: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isReady) return;

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return URL is required, but we use redirect: "if_required" to handle it via AJAX
        },
        redirect: "if_required"
      });

      if (error) {
        onError(error.message || "Payment failed");
        setIsLoading(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        onError("Something went wrong with your payment.");
        setIsLoading(false);
      }
    } catch (err: any) {
      onError(err.message || "An unexpected error occurred during payment processing.");
      setIsLoading(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="mt-4">
      <PaymentElement 
        id="payment-element" 
        options={{ layout: "tabs" }} 
        onReady={() => setIsReady(true)}
      />
      <button 
        disabled={isLoading || !stripe || !elements || !isReady} 
        id="submit" 
        className="w-full mt-6 bg-zinc-950 text-white font-bold uppercase tracking-widest text-xs py-4 px-6 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : !isReady ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Loading Card Form...</>
        ) : (
          "Pay Now"
        )}
      </button>
    </form>
  );
}
