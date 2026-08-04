"use client"

import { Star, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import CollapsibleCard from "./CollapsibleCard"
import { useSettingsForm } from "./SettingsFormContext"

export default function FlashSaleTab() {
  const {
    flashSaleEnabled,
    setFlashSaleEnabled,
    flashSaleTitle,
    setFlashSaleTitle,
    flashSaleDescription,
    setFlashSaleDescription,
    flashSaleEndDate,
    setFlashSaleEndDate,
    flashSaleProducts,
    setFlashSaleProducts,
    allProducts,
    productsLoaded,
    fieldLabel,
  } = useSettingsForm()

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* FLASH SALE SETTINGS */}
        <CollapsibleCard
          title="Flash Sale Configuration"
          description="Control the Limited Time Offers section on the homepage."
          icon={Star}
          action={
            <div className="flex items-center gap-3">
              <Badge variant={flashSaleEnabled === "true" ? "default" : "secondary"}>
                {flashSaleEnabled === "true" ? "Active" : "Disabled"}
              </Badge>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flashSaleEnabled === "true" ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                onClick={() => setFlashSaleEnabled(prev => prev === "true" ? "false" : "true")}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${flashSaleEnabled === "true" ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          }
        >
          <div className={`space-y-6 transition-all ${flashSaleEnabled === "false" ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-3">
              <Label className={fieldLabel}>
                Sale Title
              </Label>
              <Input
                type="text"
                value={flashSaleTitle}
                onChange={(e) => setFlashSaleTitle(e.target.value)}
                placeholder="Limited Time Offers"
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Sale Description
              </Label>
              <Input
                type="text"
                value={flashSaleDescription}
                onChange={(e) => setFlashSaleDescription(e.target.value)}
                placeholder="Grab our premium collections before the timer runs out."
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                End Date & Time
              </Label>
              <Input
                type="datetime-local"
                value={flashSaleEndDate}
                onChange={(e) => setFlashSaleEndDate(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-3">
              <Label className={fieldLabel}>
                Selected Products (Max 4 recommended)
              </Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {flashSaleProducts.length === 0 && (
                  <span className="text-xs text-muted-foreground">No products selected. It will show latest 4 products automatically.</span>
                )}
                {flashSaleProducts.map(productId => {
                  const p = allProducts.find(x => x.id === productId)
                  return (
                    <div key={productId} className="flex items-center gap-2 bg-muted border rounded-md pl-3 pr-1 py-1 text-xs font-bold">
                      {p ? p.title : productId}
                      <button type="button" onClick={() => setFlashSaleProducts(prev => prev.filter(id => id !== productId))} className="p-1 hover:bg-muted-foreground/20 rounded-md">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="border rounded-lg overflow-hidden bg-muted/50 max-h-60 overflow-y-auto">
                {allProducts.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {productsLoaded ? "No products found." : "Loading products..."}
                  </div>
                )}
                {allProducts.map(product => (
                  <label key={product.id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-card cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={flashSaleProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFlashSaleProducts(prev => [...prev, product.id])
                        } else {
                          setFlashSaleProducts(prev => prev.filter(id => id !== product.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-input text-foreground focus:ring-ring"
                    />
                    <div className="flex items-center gap-3">
                      {product.thumbnail && <img src={product.thumbnail} alt={product.title} className="w-8 h-8 object-cover rounded-md" />}
                      <span className="text-sm font-medium">{product.title}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleCard>
    </div>
  )
}
