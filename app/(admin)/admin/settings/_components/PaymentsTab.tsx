"use client"

import { DollarSign, CreditCard, Wallet, Smartphone } from "lucide-react"
import { Label } from "@/components/ui/label"
import { COUNTRIES } from "@/lib/countries"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function PaymentsTab() {
  const {
    paymentCodEnabled,
    setPaymentCodEnabled,
    paymentCodCountry,
    setPaymentCodCountry,
    paymentStripeEnabled,
    setPaymentStripeEnabled,
    paymentBkashEnabled,
    setPaymentBkashEnabled,
    paymentNagadEnabled,
    setPaymentNagadEnabled,
    paymentSquareEnabled,
    setPaymentSquareEnabled,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* PAYMENT SETTINGS */}
          <CollapsibleCard
            title="Payment Methods"
            description="Enable or disable payment methods at checkout."
            icon={CreditCard}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className={`p-5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${paymentCodEnabled === "true" ? 'border-primary bg-muted/50' : 'border-border bg-card opacity-60'} ${paymentCodEnabled === "true" ? 'rounded-b-none border-b-0' : ''}`} onClick={() => setPaymentCodEnabled(prev => prev === "true" ? "false" : "true")}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${paymentCodEnabled === "true" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-widest uppercase text-foreground mb-1">Cash on Delivery</h3>
                      <p className="text-xs text-muted-foreground">Pay when order arrives</p>
                    </div>
                  </div>
                  <button type="button" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${paymentCodEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${paymentCodEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {paymentCodEnabled === "true" && (
                  <div className="p-5 border border-t-0 border-primary bg-muted/30 rounded-b-lg space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Enable COD Only for Country:</Label>
                    <select
                      value={paymentCodCountry}
                      onChange={(e) => setPaymentCodCountry(e.target.value)}
                      className="w-full border border-border bg-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                      <option value="">All Countries (Default)</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={`p-5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${paymentStripeEnabled === "true" ? 'border-primary bg-muted/50' : 'border-border bg-card opacity-60'}`} onClick={() => setPaymentStripeEnabled(prev => prev === "true" ? "false" : "true")}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${paymentStripeEnabled === "true" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-foreground mb-1">Stripe (Cards)</h3>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                  </div>
                </div>
                <button type="button" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${paymentStripeEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${paymentStripeEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`p-5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${paymentBkashEnabled === "true" ? 'border-primary bg-muted/50' : 'border-border bg-card opacity-60'}`} onClick={() => setPaymentBkashEnabled(prev => prev === "true" ? "false" : "true")}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${paymentBkashEnabled === "true" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-foreground mb-1">bKash</h3>
                    <p className="text-xs text-muted-foreground">Manual bKash transfer</p>
                  </div>
                </div>
                <button type="button" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${paymentBkashEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${paymentBkashEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`p-5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${paymentNagadEnabled === "true" ? 'border-primary bg-muted/50' : 'border-border bg-card opacity-60'}`} onClick={() => setPaymentNagadEnabled(prev => prev === "true" ? "false" : "true")}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${paymentNagadEnabled === "true" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-foreground mb-1">Nagad</h3>
                    <p className="text-xs text-muted-foreground">Manual Nagad transfer</p>
                  </div>
                </div>
                <button type="button" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${paymentNagadEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${paymentNagadEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className={`p-5 border rounded-lg transition-all flex items-center justify-between cursor-pointer ${paymentSquareEnabled === "true" ? 'border-primary bg-muted/50' : 'border-border bg-card opacity-60'}`} onClick={() => setPaymentSquareEnabled(prev => prev === "true" ? "false" : "true")}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${paymentSquareEnabled === "true" ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-foreground mb-1">Square</h3>
                    <p className="text-xs text-muted-foreground">Pay securely with Square</p>
                  </div>
                </div>
                <button type="button" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${paymentSquareEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${paymentSquareEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
          </div>
        </CollapsibleCard>
    </div>
  )
}
