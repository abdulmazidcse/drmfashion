"use client"

import { useState, useEffect } from "react"
import { Save, Loader2, Truck, Info } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export default function ShippingSettingsPage() {
  const { baseCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    shipping_enabled: "true",
    shipping_flat_rate: "60",
    shipping_free_threshold: "1000",
  })

  useEffect(() => {
    fetch("/api/admin/settings/shipping")
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error("Failed to save")
      Swal.fire({ text: "Shipping settings saved!", confirmButtonColor: "#18181b" })
    } catch (err: any) {
      Swal.fire({ text: err.message, confirmButtonColor: "#18181b" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipping Settings</h1>
          <p className="text-sm text-muted-foreground">Configure shipping fees and free-shipping rules.</p>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-8">
          {/* Enable Shipping */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" /> Enable Shipping Fee
              </h2>
              <p className="text-xs text-muted-foreground mt-1">If disabled, shipping will always be free.</p>
            </div>
            <Switch
              checked={form.shipping_enabled === "true"}
              onCheckedChange={() => setForm(f => ({ ...f, shipping_enabled: f.shipping_enabled === "true" ? "false" : "true" }))}
            />
          </div>

          <Separator />

          {/* Flat Rate */}
          <div className="space-y-2">
            <Label htmlFor="shipping_flat_rate">Flat Shipping Rate ({baseCurrency.symbol})</Label>
            <p className="text-xs text-muted-foreground">Fixed shipping charge applied to every order.</p>
            <Input
              id="shipping_flat_rate"
              type="number"
              value={form.shipping_flat_rate}
              onChange={e => setForm(f => ({ ...f, shipping_flat_rate: e.target.value }))}
              className="max-w-xs"
              min="0"
            />
          </div>

          <Separator />

          {/* Free Threshold */}
          <div className="space-y-2">
            <Label htmlFor="shipping_free_threshold">Free Shipping Threshold ({baseCurrency.symbol})</Label>
            <p className="text-xs text-muted-foreground">Orders above this amount will get free shipping. Set to 0 to disable.</p>
            <Input
              id="shipping_free_threshold"
              type="number"
              value={form.shipping_free_threshold}
              onChange={e => setForm(f => ({ ...f, shipping_free_threshold: e.target.value }))}
              className="max-w-xs"
              min="0"
            />
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              Currently: {form.shipping_enabled === "true"
                ? `${baseCurrency.symbol}${form.shipping_flat_rate} flat rate. Free shipping on orders above ${baseCurrency.symbol}${form.shipping_free_threshold}.`
                : "Shipping is disabled (always free)."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
