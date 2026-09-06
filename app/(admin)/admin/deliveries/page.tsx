"use client"

import { useEffect, useState } from "react"
import {
  Truck,
  Search,
  Filter,
  RotateCcw,
  Loader2,
  PackageOpen,
  PackageCheck,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Settings2,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { buildTrackingUrl, TRACKING_PLACEHOLDER, type DeliveryCarrier } from "@/lib/delivery"

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = "PROCESSING" | "SHIPPED" | "DELIVERED"

type DeliveryRow = {
  id: string
  user: { name: string; email: string }
  shippingPhone: string
  shippingAddress: string
  shippingCarrier: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  estimatedDeliveryAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  deliveryNote: string | null
  status: DeliveryStatus
  totalAmount: number
  currencySymbol?: string | null
  exchangeRate?: number | null
  createdAt: string
  itemCount: number
}

type Stats = { awaitingDispatch: number; inTransit: number; deliveredToday: number; overdue: number }

type DeliveryForm = {
  carrier: string
  customCarrier: string
  trackingNumber: string
  trackingUrl: string
  estimatedDeliveryAt: string
  deliveryNote: string
}

type SaveAction = "save" | "ship" | "deliver"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sentinel option value: the admin types the carrier name instead. */
const CUSTOM_CARRIER = "__custom__"

const STATUS_TABS: { value: "ALL" | DeliveryStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PROCESSING", label: "Awaiting dispatch" },
  { value: "SHIPPED", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/60",
  PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
  SHIPPED: "bg-sky-50 text-sky-700 border-sky-200/60",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200/60",
}

function formatOrderPrice(ord: { currencySymbol?: string | null; exchangeRate?: number | null }, usdPrice: number) {
  const symbol = ord.currencySymbol || "$"
  const rate = ord.exchangeRate || 1.0
  const formatted = (usdPrice * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol}${formatted}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" })
}

/** ISO → local `YYYY-MM-DD` for a `<input type="date">`. */
function toDateInput(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `YYYY-MM-DD` → ISO at local midnight, or null when cleared. */
function fromDateInput(value: string) {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function isOverdue(row: { status: string; estimatedDeliveryAt: string | null }, now: number) {
  return row.status === "SHIPPED" && !!row.estimatedDeliveryAt && new Date(row.estimatedDeliveryAt).getTime() < now
}

function newCarrier(): DeliveryCarrier {
  return { id: "", name: "", trackingUrlTemplate: "", active: true }
}

/** The API's `{ message }` when the request failed with one, else the fallback. */
function apiMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof message === "string" && message ? message : fallback
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDeliveriesPage() {
  const [rows, setRows] = useState<DeliveryRow[]>([])
  const [stats, setStats] = useState<Stats>({ awaitingDispatch: 0, inTransit: 0, deliveredToday: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)
  // Captured once so the "overdue" check keeps the render pure; refreshed with each fetch.
  const [now, setNow] = useState(() => Date.now())

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeliveryStatus>("ALL")
  const [carrierFilter, setCarrierFilter] = useState("")

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  const [carriers, setCarriers] = useState<DeliveryCarrier[]>([])

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<"SHIPPED" | "DELIVERED" | null>(null)

  // Update delivery dialog
  const [editing, setEditing] = useState<DeliveryRow | null>(null)
  const [form, setForm] = useState<DeliveryForm>({ carrier: "", customCarrier: "", trackingNumber: "", trackingUrl: "", estimatedDeliveryAt: "", deliveryNote: "" })
  const [urlDirty, setUrlDirty] = useState(false)
  const [saving, setSaving] = useState<SaveAction | null>(null)

  // Manage carriers dialog
  const [manageOpen, setManageOpen] = useState(false)
  const [draft, setDraft] = useState<DeliveryCarrier[]>([])
  const [savingCarriers, setSavingCarriers] = useState(false)

  async function fetchDeliveries() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
        carrier: carrierFilter,
        search: searchQuery,
      })
      const res = await api.get(`/admin/deliveries?${params.toString()}`)
      setNow(Date.now())
      setRows(Array.isArray(res.data.data) ? res.data.data : [])
      if (res.data.stats) setStats(res.data.stats)
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages || 1)
        setTotalRecords(res.data.meta.total || 0)
      }
      setSelected(new Set())
    } catch (error) {
      console.error("Failed to fetch deliveries:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get("/admin/deliveries/carriers")
      .then((res) => setCarriers(Array.isArray(res.data) ? res.data : []))
      .catch((error) => console.error("Failed to fetch carriers:", error))
  }, [])

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchDeliveries()
    }, 400)
    return () => clearTimeout(handler)
  }, [page, searchQuery, statusFilter, carrierFilter])

  // Any filter change starts again from the first page.
  function applySearch(value: string) {
    setSearchQuery(value)
    setPage(1)
  }
  function applyStatus(value: "ALL" | DeliveryStatus) {
    setStatusFilter(value)
    setPage(1)
  }
  function applyCarrier(value: string) {
    setCarrierFilter(value)
    setPage(1)
  }

  // ── Selection ───────────────────────────────────────────────────────────────

  const selectableRows = rows.filter((r) => r.status !== "DELIVERED")
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id))

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectableRows.map((r) => r.id)) : new Set())
  }

  async function handleBulk(status: "SHIPPED" | "DELIVERED") {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const label = status === "SHIPPED" ? "shipped" : "delivered"
    const result = await Swal.fire({
      title: `Mark ${ids.length} order${ids.length === 1 ? "" : "s"} as ${label}?`,
      text: "Customers will be emailed about the status change.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#18181b",
      confirmButtonText: `Mark ${label}`,
    })
    if (!result.isConfirmed) return

    try {
      setBulkLoading(status)
      const res = await api.patch("/admin/deliveries/bulk", { ids, status })
      const { updated = 0, skipped = 0 } = res.data || {}
      Swal.fire({
        text: `${updated} order${updated === 1 ? "" : "s"} marked ${label}${skipped ? ` (${skipped} skipped)` : ""}.`,
        icon: "success",
        confirmButtonColor: "#18181b",
        timer: 1800,
        showConfirmButton: false,
      })
      fetchDeliveries()
    } catch (error) {
      Swal.fire({ text: apiMessage(error, "Failed to update deliveries."), icon: "error", confirmButtonColor: "#18181b" })
      console.error(error)
    } finally {
      setBulkLoading(null)
    }
  }

  // ── Update delivery dialog ──────────────────────────────────────────────────

  function carrierNameFromForm(f: DeliveryForm) {
    return f.carrier === CUSTOM_CARRIER ? f.customCarrier.trim() : f.carrier
  }

  function openEdit(row: DeliveryRow) {
    const known = carriers.find((c) => c.name.toLowerCase() === (row.shippingCarrier || "").toLowerCase())
    const derived = buildTrackingUrl(carriers, row.shippingCarrier, row.trackingNumber) || ""
    setForm({
      carrier: known ? known.name : row.shippingCarrier ? CUSTOM_CARRIER : "",
      customCarrier: known ? "" : row.shippingCarrier || "",
      trackingNumber: row.trackingNumber || "",
      trackingUrl: row.trackingUrl || derived,
      estimatedDeliveryAt: toDateInput(row.estimatedDeliveryAt),
      deliveryNote: row.deliveryNote || "",
    })
    // A stored URL that differs from the template is the admin's own; keep it.
    setUrlDirty(!!row.trackingUrl && row.trackingUrl !== derived)
    setEditing(row)
  }

  /** Applies a change and, unless the admin has hand-edited the URL, re-derives it. */
  function updateForm(patch: Partial<DeliveryForm>) {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if (!urlDirty) next.trackingUrl = buildTrackingUrl(carriers, carrierNameFromForm(next), next.trackingNumber) || ""
      return next
    })
  }

  function handleUrlChange(value: string) {
    if (value.trim() === "") {
      // Cleared: fall back to the template again.
      setUrlDirty(false)
      setForm((prev) => ({ ...prev, trackingUrl: buildTrackingUrl(carriers, carrierNameFromForm(prev), prev.trackingNumber) || "" }))
    } else {
      setUrlDirty(true)
      setForm((prev) => ({ ...prev, trackingUrl: value }))
    }
  }

  async function submitDelivery(action: SaveAction) {
    if (!editing) return
    const payload: Record<string, unknown> = {
      shippingCarrier: carrierNameFromForm(form) || null,
      trackingNumber: form.trackingNumber.trim() || null,
      trackingUrl: form.trackingUrl.trim() || null,
      estimatedDeliveryAt: fromDateInput(form.estimatedDeliveryAt),
      deliveryNote: form.deliveryNote.trim() || null,
    }
    if (action === "ship") payload.status = "SHIPPED"
    if (action === "deliver") payload.status = "DELIVERED"

    try {
      setSaving(action)
      await api.patch(`/admin/orders/${editing.id}`, payload)
      setEditing(null)
      Swal.fire({ text: "Delivery details saved.", icon: "success", confirmButtonColor: "#18181b", timer: 1500, showConfirmButton: false })
      fetchDeliveries()
    } catch (error) {
      Swal.fire({ text: apiMessage(error, "Failed to save delivery details."), icon: "error", confirmButtonColor: "#18181b" })
      console.error(error)
    } finally {
      setSaving(null)
    }
  }

  const previewTemplate = carriers.find((c) => c.name === form.carrier)?.trackingUrlTemplate || ""

  // ── Manage carriers dialog ──────────────────────────────────────────────────

  function openManage() {
    setDraft(carriers.length ? carriers.map((c) => ({ ...c })) : [newCarrier()])
    setManageOpen(true)
  }

  function updateDraft(index: number, patch: Partial<DeliveryCarrier>) {
    setDraft((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  async function saveCarriers() {
    const cleaned = draft.map((c) => ({ ...c, name: c.name.trim(), trackingUrlTemplate: c.trackingUrlTemplate.trim() }))
    if (cleaned.length === 0 || cleaned.some((c) => !c.name)) {
      Swal.fire({ text: "Every carrier needs a name.", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }
    const badTemplate = cleaned.find((c) => c.trackingUrlTemplate && !c.trackingUrlTemplate.includes(TRACKING_PLACEHOLDER))
    if (badTemplate) {
      Swal.fire({ text: `"${badTemplate.name}": the tracking URL must contain ${TRACKING_PLACEHOLDER}.`, icon: "warning", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSavingCarriers(true)
      const res = await api.put("/admin/deliveries/carriers", { carriers: cleaned })
      setCarriers(Array.isArray(res.data) ? res.data : cleaned)
      setManageOpen(false)
      Swal.fire({ text: "Carriers saved.", icon: "success", confirmButtonColor: "#18181b", timer: 1500, showConfirmButton: false })
    } catch (error) {
      Swal.fire({ text: apiMessage(error, "Failed to save carriers."), icon: "error", confirmButtonColor: "#18181b" })
      console.error(error)
    } finally {
      setSavingCarriers(false)
    }
  }

  const activeCarriers = carriers.filter((c) => c.active)

  return (
    <>
      {/* UPDATE DELIVERY DIALOG */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !saving) setEditing(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4" /> Update delivery
            </DialogTitle>
            <DialogDescription>
              {editing && (
                <>
                  Order <span className="font-mono font-semibold text-foreground">#{editing.id.slice(-8).toUpperCase()}</span> · {editing.user.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carrier</Label>
                <select
                  value={form.carrier}
                  onChange={(e) => updateForm({ carrier: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">— No carrier —</option>
                  {activeCarriers.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {form.carrier && form.carrier !== CUSTOM_CARRIER && !activeCarriers.some((c) => c.name === form.carrier) && (
                    <option value={form.carrier}>{form.carrier}</option>
                  )}
                  <option value={CUSTOM_CARRIER}>Other (type below)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracking number</Label>
                <Input
                  value={form.trackingNumber}
                  onChange={(e) => updateForm({ trackingNumber: e.target.value })}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="font-mono"
                />
              </div>
            </div>

            {form.carrier === CUSTOM_CARRIER && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carrier name</Label>
                <Input
                  value={form.customCarrier}
                  onChange={(e) => updateForm({ customCarrier: e.target.value })}
                  placeholder="e.g. Sundarban Courier"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracking URL</Label>
              <Input
                value={form.trackingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder={previewTemplate ? previewTemplate.replace(TRACKING_PLACEHOLDER, "…") : "https://"}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                {urlDirty
                  ? "Custom link. Clear the field to go back to the carrier's template."
                  : previewTemplate
                    ? "Filled in from the carrier's template; edit to override."
                    : "This carrier has no tracking template — paste a link, or leave empty."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated delivery</Label>
              <Input
                type="date"
                value={form.estimatedDeliveryAt}
                onChange={(e) => updateForm({ estimatedDeliveryAt: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delivery note</Label>
              <Textarea
                value={form.deliveryNote}
                onChange={(e) => updateForm({ deliveryNote: e.target.value })}
                placeholder="Internal note — gate code, courier instructions, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => submitDelivery("deliver")}
              disabled={saving !== null || editing?.status === "DELIVERED"}
              className="sm:mr-auto"
            >
              {saving === "deliver" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Mark delivered
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => submitDelivery("save")} disabled={saving !== null}>
                {saving === "save" && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </Button>
              <Button
                type="button"
                onClick={() => submitDelivery("ship")}
                disabled={saving !== null || editing?.status !== "PROCESSING"}
              >
                {saving === "ship" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Save &amp; mark shipped
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE CARRIERS DIALOG */}
      <Dialog open={manageOpen} onOpenChange={(open) => { if (!open && !savingCarriers) setManageOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Manage carriers
            </DialogTitle>
            <DialogDescription>
              Tracking URL templates use <span className="font-mono">{TRACKING_PLACEHOLDER}</span> where the tracking number goes. Leave it empty for carriers without a tracking page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 px-1 text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
              <span>Name</span>
              <span>Tracking URL template</span>
              <span>Active</span>
              <span />
            </div>
            {draft.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto_auto] gap-2 items-center">
                <Input
                  value={c.name}
                  onChange={(e) => updateDraft(i, { name: e.target.value })}
                  placeholder="Carrier name"
                />
                <Input
                  value={c.trackingUrlTemplate}
                  onChange={(e) => updateDraft(i, { trackingUrlTemplate: e.target.value })}
                  placeholder={`https://…?id=${TRACKING_PLACEHOLDER}`}
                  className="font-mono text-xs"
                />
                <div className="flex justify-center w-12">
                  <Checkbox checked={c.active} onCheckedChange={(v) => updateDraft(i, { active: v === true })} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={draft.length === 1}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft((prev) => [...prev, newCarrier()])}>
              <Plus className="w-3.5 h-3.5" /> Add carrier
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)} disabled={savingCarriers}>Cancel</Button>
            <Button type="button" onClick={saveCarriers} disabled={savingCarriers}>
              {savingCarriers && <Loader2 className="w-4 h-4 animate-spin" />}
              Save carriers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        {/* VIEW TITLE HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Truck size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Deliveries</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Dispatch orders, record tracking numbers and confirm hand-over.</p>
            </div>
          </div>
          <Button variant="outline" onClick={openManage}>
            <Settings2 className="w-4 h-4" /> Manage carriers
          </Button>
        </div>

        {/* METRICS GRID SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-indigo-600">
              <PackageOpen size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Awaiting Dispatch</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{stats.awaitingDispatch}</h3>
              <p className="text-[8px] text-indigo-600 font-bold uppercase mt-0.5">Processing</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-sky-600">
              <Truck size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">In Transit</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{stats.inTransit}</h3>
              <p className="text-[8px] text-sky-600 font-bold uppercase mt-0.5">Shipped</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-emerald-600">
              <CheckCircle2 size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Delivered Today</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{stats.deliveredToday}</h3>
              <p className="text-[8px] text-emerald-600 font-bold uppercase mt-0.5">Handed over</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-rose-600">
              <AlertTriangle size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Overdue</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{stats.overdue}</h3>
              <p className="text-[8px] text-rose-600 font-bold uppercase mt-0.5">Past estimated date</p>
            </div>
          </Card>
        </div>

        {/* SEARCH AND FILTERS BAR */}
        <Card className="p-4.5 gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => applyStatus(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer",
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-input hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by Order ID, Client Name, Email, or Phone..."
                value={searchQuery}
                onChange={(e) => applySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-md border border-input bg-transparent px-3 shadow-xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={carrierFilter}
                  onChange={(e) => applyCarrier(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer pr-1"
                >
                  <option value="">ALL CARRIERS</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("ALL")
                  setCarrierFilter("")
                  setPage(1)
                }}
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </Button>
            </div>
          </div>
        </Card>

        {/* BULK ACTION BAR */}
        {selected.size > 0 && (
          <Card className="p-3 flex-row items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground pl-1">
              {selected.size} order{selected.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={bulkLoading !== null}>
                Clear
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulk("SHIPPED")} disabled={bulkLoading !== null}>
                {bulkLoading === "SHIPPED" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                Mark shipped
              </Button>
              <Button size="sm" onClick={() => handleBulk("DELIVERED")} disabled={bulkLoading !== null}>
                {bulkLoading === "DELIVERED" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                Mark delivered
              </Button>
            </div>
          </Card>
        )}

        {/* DELIVERIES TABLE */}
        <Card className="p-0 overflow-hidden">
          <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
              <span className="text-muted-foreground text-xs font-medium">Retrieving deliveries...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-3">
                <Truck className="text-muted-foreground w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No deliveries</h3>
              <p className="text-muted-foreground mt-1 text-xs max-w-xs leading-relaxed">
                No processing, shipped or delivered orders match the selected filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[8.5px] font-black uppercase tracking-widest text-muted-foreground">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(v === true)}
                        disabled={selectableRows.length === 0}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="text-muted-foreground">Order #</TableHead>
                    <TableHead className="text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground">Address</TableHead>
                    <TableHead className="text-muted-foreground">Carrier / Method</TableHead>
                    <TableHead className="text-muted-foreground">Tracking</TableHead>
                    <TableHead className="text-muted-foreground">Est. Delivery</TableHead>
                    <TableHead className="text-muted-foreground">Shipped / Delivered</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {rows.map((row) => {
                    const overdue = isOverdue(row, now)
                    return (
                      <TableRow key={row.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={(v) => toggleRow(row.id, v === true)}
                            disabled={row.status === "DELIVERED"}
                            aria-label={`Select order ${row.id}`}
                          />
                        </TableCell>

                        {/* Order # */}
                        <TableCell>
                          <div className="font-mono text-[10px] font-semibold text-foreground">#{row.id.slice(-8).toUpperCase()}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(row.createdAt)} · {row.itemCount} {row.itemCount === 1 ? "item" : "items"}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatOrderPrice(row, row.totalAmount)}</div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="font-semibold text-foreground">{row.user.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{row.user.email}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{row.shippingPhone}</div>
                        </TableCell>

                        {/* Address */}
                        <TableCell>
                          <div className="max-w-[200px] truncate text-muted-foreground" title={row.shippingAddress}>
                            {row.shippingAddress}
                          </div>
                        </TableCell>

                        {/* Carrier / Method */}
                        <TableCell>
                          <div className="font-medium text-foreground">{row.shippingCarrier || <span className="text-muted-foreground">—</span>}</div>
                          {row.shippingMethod && <div className="text-[10px] text-muted-foreground mt-0.5">{row.shippingMethod}</div>}
                        </TableCell>

                        {/* Tracking */}
                        <TableCell>
                          {row.trackingNumber ? (
                            row.trackingUrl ? (
                              <a
                                href={row.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-foreground underline underline-offset-2 hover:text-primary"
                                title={row.trackingUrl}
                              >
                                {row.trackingNumber} <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="font-mono text-[10px] font-semibold text-foreground">{row.trackingNumber}</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {row.deliveryNote && (
                            <div className="max-w-[160px] truncate text-[10px] text-muted-foreground mt-0.5" title={row.deliveryNote}>
                              {row.deliveryNote}
                            </div>
                          )}
                        </TableCell>

                        {/* Est. delivery */}
                        <TableCell className={cn("font-medium", overdue ? "text-rose-600" : "text-muted-foreground")}>
                          <span className="inline-flex items-center gap-1">
                            {overdue && <AlertTriangle className="w-3 h-3" />}
                            {formatDate(row.estimatedDeliveryAt)}
                          </span>
                        </TableCell>

                        {/* Shipped / Delivered */}
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1"><Truck className="w-3 h-3" /> {formatDate(row.shippedAt)}</div>
                          <div className="flex items-center gap-1 mt-0.5"><PackageCheck className="w-3 h-3" /> {formatDate(row.deliveredAt)}</div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", STATUS_STYLES[row.status])}>
                            {row.status}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                            <Pencil size={12} /> Update delivery
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </CardContent>
        </Card>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <span className="text-xs text-muted-foreground font-medium">
              Showing page {page} of {totalPages} ({totalRecords} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Delivered orders can&apos;t be selected for bulk actions; use &quot;Update delivery&quot; to edit their details.
          </p>
        )}
      </div>
    </>
  )
}
