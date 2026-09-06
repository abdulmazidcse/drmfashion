"use client"

import { useMemo, useState, useEffect } from "react"
import { Save, Loader2, Percent, Info, Plus, Trash2, Search } from "lucide-react"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { DEFAULT_TAX_RATES, TAX_STATE_ANY, type TaxRate } from "@/lib/tax"
import { regionLabelFor } from "@/lib/regions"
import { useRegions } from "@/lib/useRegions"
import { COUNTRIES } from "@/lib/countries"

// Canada and the US first — they are what this store charges tax in today —
// then everywhere else alphabetically.
const TAX_COUNTRIES = [
  ...COUNTRIES.filter(c => c.code === "CA" || c.code === "US"),
  ...COUNTRIES.filter(c => c.code !== "CA" && c.code !== "US")
    .sort((a, b) => a.name.localeCompare(b.name)),
]

/**
 * One row's region control. Split out because hooks cannot be called in a loop
 * — each row needs its own `useRegions` for whatever country it is set to.
 */
function RegionField({
  country,
  value,
  invalid,
  onChange,
}: {
  country: string
  value: string
  invalid: boolean
  onChange: (value: string) => void
}) {
  const { regions, loading } = useRegions(country)

  if (loading) {
    return (
      <select disabled className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm">
        <option>Loading…</option>
      </select>
    )
  }

  if (regions.length === 0) {
    // No subdivisions on record for this country — the only meaningful scope is
    // the country as a whole.
    return (
      <Input
        className={`h-9 ${invalid ? "border-destructive" : ""}`}
        value={value}
        placeholder="* for entire country"
        onChange={e => onChange(e.target.value.toUpperCase())}
      />
    )
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full h-9 rounded-md border bg-transparent px-2 text-sm ${
        invalid ? "border-destructive" : "border-input"
      }`}
    >
      <option value="">Select…</option>
      <option value={TAX_STATE_ANY}>Entire country</option>
      {regions.map(r => (
        <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
      ))}
    </select>
  )
}

export default function TaxSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [onShipping, setOnShipping] = useState(true)
  const [defaultRate, setDefaultRate] = useState("0")
  const [defaultLabel, setDefaultLabel] = useState("Tax")
  const [rates, setRates] = useState<TaxRate[]>(DEFAULT_TAX_RATES)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    fetch("/api/admin/settings/tax")
      .then(r => r.json())
      .then(data => {
        setEnabled(data.tax_enabled !== "false")
        setOnShipping(data.tax_on_shipping !== "false")
        setDefaultRate(String(data.tax_default_rate ?? "0"))
        setDefaultLabel(data.tax_default_label || "Tax")
        if (Array.isArray(data.tax_rates)) setRates(data.tax_rates)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateRate = (index: number, patch: Partial<TaxRate>) =>
    setRates(list => list.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const addRate = () =>
    setRates(list => [...list, { id: "", country: "CA", state: "", label: "Tax", rate: 0, active: true }])

  // Switching country clears the region — a province code from the old country
  // would otherwise sit there looking valid. `*` survives because it means the
  // same thing everywhere.
  const changeCountry = (index: number, country: string) =>
    setRates(list =>
      list.map((r, i) =>
        i === index ? { ...r, country, state: r.state === TAX_STATE_ANY ? r.state : "" } : r
      )
    )

  const removeRate = (index: number) => setRates(list => list.filter((_, i) => i !== index))

  // Same country+state twice makes the checkout lookup order-dependent, so the
  // clash is flagged here rather than only being rejected on save.
  const duplicates = useMemo(() => {
    const counts = new Map<string, number>()
    rates.forEach(r => {
      const key = `${r.country}:${r.state}`.toUpperCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    return counts
  }, [rates])

  const isDuplicate = (r: TaxRate) =>
    Boolean(r.state) && (duplicates.get(`${r.country}:${r.state}`.toUpperCase()) ?? 0) > 1

  const visible = rates
    .map((rate, index) => ({ rate, index }))
    .filter(({ rate }) => {
      if (!filter.trim()) return true
      const q = filter.trim().toLowerCase()
      return (
        rate.country.toLowerCase().includes(q) ||
        rate.state.toLowerCase().includes(q) ||
        rate.label.toLowerCase().includes(q)
      )
    })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tax_enabled: String(enabled),
          tax_on_shipping: String(onShipping),
          tax_default_rate: defaultRate,
          tax_default_label: defaultLabel,
          tax_rates: rates,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save")
      if (Array.isArray(data.tax_rates)) setRates(data.tax_rates)
      Swal.fire({ text: "Tax settings saved!", confirmButtonColor: "#18181b" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save"
      Swal.fire({ text: message, confirmButtonColor: "#18181b" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const activeCount = rates.filter(r => r.active && r.state).length

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Settings</h1>
          <p className="text-sm text-muted-foreground">Sales tax charged by the customer&apos;s province or state.</p>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Percent className="w-4 h-4 text-muted-foreground" /> Charge Sales Tax
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Turn off to sell tax-free everywhere.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={() => setEnabled(v => !v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Tax the Shipping Fee</h2>
              <p className="text-xs text-muted-foreground mt-1">
                In Canada GST/HST applies to shipping as well as the goods. In the US it varies by
                state — check with your accountant.
              </p>
            </div>
            <Switch checked={onShipping} onCheckedChange={() => setOnShipping(v => !v)} />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="default_rate">Default Rate (%)</Label>
              <p className="text-xs text-muted-foreground">
                Used when the address matches no row below. Keep at 0 unless you owe tax everywhere.
              </p>
              <Input
                id="default_rate"
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={defaultRate}
                onChange={e => setDefaultRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="default_label">Default Label</Label>
              <p className="text-xs text-muted-foreground">Wording on the invoice, e.g. &quot;Tax&quot;.</p>
              <Input
                id="default_label"
                value={defaultLabel}
                onChange={e => setDefaultLabel(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-medium">Rates by Province / State</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeCount} active {activeCount === 1 ? "rate" : "rates"}. Only add the places you are
                  registered to collect tax in.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    placeholder="Filter…"
                    className="pl-8 h-9 w-40"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRate}>
                  <Plus className="h-4 w-4" /> Add Rate
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg">
                {rates.length === 0 ? "No rates configured — every order is charged the default rate." : "No rows match that filter."}
              </p>
            ) : (
              <div className="space-y-2">
                {visible.map(({ rate, index }) => {
                  const clash = isDuplicate(rate)
                  return (
                    <div
                      key={index}
                      className={`grid gap-2 items-end rounded-lg border p-3 sm:grid-cols-[1.2fr_1.5fr_1.5fr_0.9fr_auto_auto] ${
                        clash ? "border-destructive" : ""
                      } ${rate.active ? "" : "opacity-60 bg-muted/40"}`}
                    >
                      <div className="space-y-1">
                        <Label className="text-[11px]">Country</Label>
                        <select
                          value={rate.country}
                          onChange={e => changeCountry(index, e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                        >
                          {TAX_COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">{regionLabelFor(rate.country)}</Label>
                        <RegionField
                          country={rate.country}
                          value={rate.state}
                          invalid={clash}
                          onChange={value => updateRate(index, { state: value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Label</Label>
                        <Input
                          className="h-9"
                          value={rate.label}
                          placeholder="HST"
                          onChange={e => updateRate(index, { label: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px]">Rate (%)</Label>
                        <Input
                          className="h-9"
                          type="number"
                          min="0"
                          max="100"
                          step="0.001"
                          value={rate.rate}
                          onChange={e => updateRate(index, { rate: Number(e.target.value) })}
                        />
                      </div>

                      <div className="flex items-center pb-1.5">
                        <Switch
                          checked={rate.active}
                          onCheckedChange={() => updateRate(index, { active: !rate.active })}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRate(index)}
                        aria-label="Remove rate"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            {Array.from(duplicates.values()).some(n => n > 1) && (
              <p className="text-xs text-destructive">
                Two rows cover the same province/state. Remove one before saving.
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p>
                Tax is worked out from the shipping address, and the rate is stored on each order — so
                changing a rate here never rewrites an invoice that has already been issued.
              </p>
              <p className="text-blue-600/80">
                Sales tax is generally owed only where the business is registered. Adding a state you
                are not registered in means collecting money you may not be entitled to.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
