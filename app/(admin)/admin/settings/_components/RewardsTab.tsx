"use client"

import { Star, DollarSign, TrendingUp, Globe, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function RewardsTab() {
  const {
    rewardPointValue,
    setRewardPointValue,
    rewardPointEarnRate,
    setRewardPointEarnRate,
    currencies,
    setCurrencies,
    fieldLabel,
    helpText,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* REWARD POINTS SETTINGS */}
          <CollapsibleCard
          title="Loyalty Rewards Program"
          description="Manage how customers earn and spend their reward points."
          icon={Star}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Redemption Value */}
            <div className="space-y-4">
              <div>
                <Label className={cn(fieldLabel, "mb-2 flex items-center gap-1.5")}>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Point Redemption Value
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <span className="text-sm font-bold text-muted-foreground">1 Point = $</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rewardPointValue}
                    onChange={(e) => setRewardPointValue(e.target.value)}
                    className="pl-24 font-mono font-bold"
                  />
                </div>
                <p className={helpText}>
                  How much dollar value 1 reward point is worth during checkout. (e.g. 1 means 1 Point = $1)
                </p>
              </div>
            </div>

            {/* Earning Rate */}
            <div className="space-y-4">
              <div>
                <Label className={cn(fieldLabel, "mb-2 flex items-center gap-1.5")}>
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  Point Earning Rate
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <span className="text-sm font-bold text-muted-foreground">Earn 1 Point per $</span>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={rewardPointEarnRate}
                    onChange={(e) => setRewardPointEarnRate(e.target.value)}
                    className="pl-[135px] font-mono font-bold"
                  />
                </div>
                <p className={helpText}>
                  How much a customer needs to spend to earn 1 reward point. (e.g. 10 means spend $10 to get 1 Point)
                </p>
              </div>
            </div>
          </div>
        </CollapsibleCard>

        {/* CURRENCY SETTINGS */}
        <CollapsibleCard
          title="Store Currencies"
          description="Manage multiple currencies and exchange rates."
          icon={Globe}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrencies([...currencies, { code: "EUR", symbol: "€", rate: 0.92 }])}
            >
              <Plus className="w-4 h-4" /> Add Currency
            </Button>
          }
        >
          <div className="space-y-4">
            {currencies.map((currency, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4 items-end bg-muted/50 p-4 rounded-lg border">
                <div className="flex-1 w-full">
                  <Label className={cn(fieldLabel, "mb-2")}>Code</Label>
                  <Input
                    type="text"
                    value={currency.code}
                    onChange={e => {
                      const newCurrencies = [...currencies];
                      newCurrencies[index].code = e.target.value.toUpperCase();
                      setCurrencies(newCurrencies);
                    }}
                    placeholder="e.g. USD, BDT"
                    className="bg-card font-bold"
                  />
                </div>
                <div className="flex-1 w-full">
                  <Label className={cn(fieldLabel, "mb-2")}>Symbol</Label>
                  <Input
                    type="text"
                    value={currency.symbol}
                    onChange={e => {
                      const newCurrencies = [...currencies];
                      newCurrencies[index].symbol = e.target.value;
                      setCurrencies(newCurrencies);
                    }}
                    placeholder="e.g. $, ৳"
                    className="bg-card font-bold"
                  />
                </div>
                <div className="flex-1 w-full relative">
                  <Label className={cn(fieldLabel, "mb-2")}>Rate (vs USD)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currency.rate}
                    onChange={e => {
                      const newCurrencies = [...currencies];
                      newCurrencies[index].rate = Number(e.target.value);
                      setCurrencies(newCurrencies);
                    }}
                    className="bg-card font-mono font-bold"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrencies(currencies.filter((_, i) => i !== index))}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove currency"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
          <p className={cn(helpText, "mt-4")}>
            * Set the base currency (usually USD) to a rate of 1. All other currency rates should be relative to this base currency.
          </p>
        </CollapsibleCard>
    </div>
  )
}
