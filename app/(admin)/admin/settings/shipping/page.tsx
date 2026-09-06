"use client"

import { useState, useEffect } from "react"

// Mirrors the server's sentinel: posted back unchanged when no new secret was
// typed, so saving other fields cannot blank a working credential.
const SECRET_PLACEHOLDER = "__unchanged__"
import { Save, Loader2, Truck, Info, Plus, Trash2, GripVertical, Warehouse, KeyRound, CheckCircle2, AlertTriangle } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { DEFAULT_SHIPPING_METHODS, type ShippingMethod } from "@/lib/shipping"
import { DEFAULT_WAREHOUSE, isWarehouseComplete, type WarehouseAddress } from "@/lib/warehouse"
import { COUNTRIES } from "@/lib/countries"
import { regionLabelFor } from "@/lib/regions"
import { useRegions } from "@/lib/useRegions"

export default function ShippingSettingsPage() {
  const { baseCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [methods, setMethods] = useState<ShippingMethod[]>(DEFAULT_SHIPPING_METHODS)
  const [warehouse, setWarehouse] = useState<WarehouseAddress>(DEFAULT_WAREHOUSE)
  const [ups, setUps] = useState({
    enabled: false,
    environment: "sandbox",
    clientId: "",
    accountNumber: "",
    secret: SECRET_PLACEHOLDER,
    secretSet: false,
    isConfigured: false,
  })
  const { regions: warehouseRegions, loading: warehouseRegionsLoading } = useRegions(warehouse.country)

  useEffect(() => {
    fetch("/api/admin/settings/shipping")
      .then(r => r.json())
      .then(data => {
        setEnabled(data.shipping_enabled !== "false")
        if (Array.isArray(data.shipping_methods) && data.shipping_methods.length > 0) {
          setMethods(data.shipping_methods)
        }
        if (data.warehouse_address) setWarehouse(data.warehouse_address)
      setUps(u => ({
        ...u,
        secret: SECRET_PLACEHOLDER,
        secretSet: Boolean(data.ups_client_secret_set),
        isConfigured: Boolean(data.ups_is_configured),
      }))
        setUps({
          enabled: data.ups_enabled === "true",
          environment: data.ups_environment || "sandbox",
          clientId: data.ups_client_id || "",
          accountNumber: data.ups_account_number || "",
          secret: SECRET_PLACEHOLDER,
          secretSet: Boolean(data.ups_client_secret_set),
          isConfigured: Boolean(data.ups_is_configured),
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateMethod = (index: number, patch: Partial<ShippingMethod>) =>
    setMethods(list => list.map((m, i) => (i === index ? { ...m, ...patch } : m)))

  const addMethod = () =>
    setMethods(list => [
      ...list,
      { id: "", name: "", deliveryTime: "", price: 0, active: true },
    ])

  const removeMethod = (index: number) =>
    setMethods(list => list.filter((_, i) => i !== index))

  const move = (index: number, direction: -1 | 1) =>
    setMethods(list => {
      const target = index + direction
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      const [row] = next.splice(index, 1)
      next.splice(target, 0, row)
      return next
    })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_enabled: String(enabled),
          shipping_methods: methods,
          warehouse_address: warehouse,
          ups_enabled: String(ups.enabled),
          ups_environment: ups.environment,
          ups_client_id: ups.clientId,
          ups_account_number: ups.accountNumber,
          ups_client_secret: ups.secret,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save")
      // The server assigns ids and rounds prices — take its copy back so the
      // form matches what checkout will actually offer.
      if (Array.isArray(data.shipping_methods)) setMethods(data.shipping_methods)
      if (data.warehouse_address) setWarehouse(data.warehouse_address)
      setUps(u => ({
        ...u,
        secret: SECRET_PLACEHOLDER,
        secretSet: Boolean(data.ups_client_secret_set),
        isConfigured: Boolean(data.ups_is_configured),
      }))
      Swal.fire({ text: "Shipping settings saved!", confirmButtonColor: "#18181b" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save"
      Swal.fire({ text: message, confirmButtonColor: "#18181b" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const activeMethods = methods.filter(m => m.active && m.name.trim())

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipping Settings</h1>
          <p className="text-sm text-muted-foreground">Configure the shipping methods offered at checkout.</p>
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
              <p className="text-xs text-muted-foreground mt-1">
                If disabled, every method is charged at {baseCurrency.symbol}0 — customers still pick a delivery speed.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={() => setEnabled(v => !v)} />
          </div>

          <Separator />

          {/* Methods */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium">Shipping Methods</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Shown at checkout in this order. Set a price of 0 for free shipping.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMethod}>
                <Plus className="h-4 w-4" /> Add Method
              </Button>
            </div>

            <div className="space-y-3">
              {methods.map((method, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 space-y-3 ${method.active ? "" : "opacity-60 bg-muted/40"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                        aria-label="Move up"
                      >▲</button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === methods.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none"
                        aria-label="Move down"
                      >▼</button>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">
                      {method.id ? `id: ${method.id}` : "New method"}
                    </span>
                    <Switch
                      checked={method.active}
                      onCheckedChange={() => updateMethod(i, { active: !method.active })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMethod(i)}
                      disabled={methods.length === 1}
                      aria-label="Remove method"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[2fr_1.5fr_1fr]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`name-${i}`}>Method Name</Label>
                      <Input
                        id={`name-${i}`}
                        value={method.name}
                        placeholder="Standard Shipping"
                        onChange={e => updateMethod(i, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`time-${i}`}>Delivery Time</Label>
                      <Input
                        id={`time-${i}`}
                        value={method.deliveryTime}
                        placeholder="8-12 days"
                        onChange={e => updateMethod(i, { deliveryTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`price-${i}`}>Price ({baseCurrency.symbol})</Label>
                      <Input
                        id={`price-${i}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={method.price}
                        onChange={e => updateMethod(i, { price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* UPS live rates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-muted-foreground" /> UPS Live Rates
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Offer UPS services at checkout alongside your own methods, priced by UPS.
                </p>
              </div>
              <Switch checked={ups.enabled} onCheckedChange={() => setUps(u => ({ ...u, enabled: !u.enabled }))} />
            </div>

            {ups.enabled && (
              <>
                <div className={`rounded-md border p-3 flex gap-2 text-xs ${
                  ups.isConfigured
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}>
                  {ups.isConfigured
                    ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <p>
                    {ups.isConfigured
                      ? `Credentials saved — quoting against UPS ${ups.environment}.`
                      : "No credentials yet. UPS options appear at checkout as sample rates and cannot be ordered until real credentials are saved."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ups_env">Environment</Label>
                    <select
                      id="ups_env"
                      value={ups.environment}
                      onChange={e => setUps(u => ({ ...u, environment: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      <option value="sandbox">Sandbox (testing)</option>
                      <option value="production">Production (live)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ups_account">Account Number</Label>
                    <Input
                      id="ups_account"
                      value={ups.accountNumber}
                      placeholder="A1B2C3"
                      onChange={e => setUps(u => ({ ...u, accountNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ups_client_id">Client ID</Label>
                    <Input
                      id="ups_client_id"
                      value={ups.clientId}
                      autoComplete="off"
                      onChange={e => setUps(u => ({ ...u, clientId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ups_secret">Client Secret</Label>
                    <Input
                      id="ups_secret"
                      type="password"
                      autoComplete="new-password"
                      value={ups.secret === SECRET_PLACEHOLDER ? "" : ups.secret}
                      placeholder={ups.secretSet ? "Saved — type to replace" : "Paste your UPS client secret"}
                      onChange={e => setUps(u => ({ ...u, secret: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Stored server-side and never sent back to this page. Leave blank to keep the
                      current one.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Get these from developer.ups.com by creating an app with the Rating API enabled.
                </p>

                <Separator />

                {/* Ship-from address — the origin UPS prices against. Only UPS
                    reads it, so it lives inside this section rather than
                    sitting above asking to be filled in for no reason. */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-medium flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-muted-foreground" /> Ship-From Address
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Where parcels are sent from. UPS prices by distance, so a wrong address here makes
                    every live rate wrong without showing an error.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="wh_name">Business Name</Label>
                    <Input
                      id="wh_name"
                      value={warehouse.name}
                      placeholder="Tall Plus Fulfillment"
                      onChange={e => setWarehouse(w => ({ ...w, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="wh_line">Street Address</Label>
                    <Input
                      id="wh_line"
                      value={warehouse.addressLine}
                      placeholder="123 Warehouse Rd"
                      onChange={e => setWarehouse(w => ({ ...w, addressLine: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh_country">Country</Label>
                    <select
                      id="wh_country"
                      value={warehouse.country}
                      onChange={e =>
                        // A province code from the previous country would be sent to
                        // UPS as a valid-looking but wrong origin.
                        setWarehouse(w => ({ ...w, country: e.target.value, state: "" }))
                      }
                      className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh_city">City</Label>
                    <Input
                      id="wh_city"
                      value={warehouse.city}
                      placeholder="Toronto"
                      onChange={e => setWarehouse(w => ({ ...w, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh_state">{regionLabelFor(warehouse.country)}</Label>
                    {warehouseRegions.length > 0 || warehouseRegionsLoading ? (
                      <select
                        id="wh_state"
                        value={warehouse.state}
                        disabled={warehouseRegionsLoading}
                        onChange={e => setWarehouse(w => ({ ...w, state: e.target.value }))}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="">{warehouseRegionsLoading ? "Loading…" : "Select…"}</option>
                        {warehouseRegions.map(r => (
                          <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="wh_state"
                        value={warehouse.state}
                        onChange={e => setWarehouse(w => ({ ...w, state: e.target.value }))}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh_postal">Postal Code</Label>
                    <Input
                      id="wh_postal"
                      value={warehouse.postalCode}
                      placeholder="M5H 2N2"
                      onChange={e => setWarehouse(w => ({ ...w, postalCode: e.target.value }))}
                    />
                  </div>
                </div>

                {!isWarehouseComplete(warehouse) && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                    Incomplete — UPS live rates stay unavailable until street address, city, postal code
                    and country are all filled in. Your own methods above work regardless.
                  </p>
                )}
              </div>
              </>
            )}
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-medium">Customers will see:</p>
              {activeMethods.length === 0 ? (
                <p>No active method — checkout has nothing to offer.</p>
              ) : (
                <ul className="space-y-0.5">
                  {activeMethods.map((m, i) => (
                    <li key={i}>
                      {m.name}
                      {m.deliveryTime ? ` — ${m.deliveryTime}` : ""} —{" "}
                      {!enabled || m.price === 0 ? "Free" : `${baseCurrency.symbol}${m.price}`}
                    </li>
                  ))}
                </ul>
              )}
              <p className="pt-1 text-blue-600/80">
                Prices are in your base currency ({baseCurrency.code}) and are converted automatically for
                shoppers browsing in another currency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
