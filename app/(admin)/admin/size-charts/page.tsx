"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2, Ruler, Trash2, Pencil, Save, X } from "lucide-react"
import Swal from "sweetalert2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import SizeChartTableEditor, { emptySizeChartTable } from "@/components/admin/SizeChartTableEditor"
import { normalizeSizeChartTable, type SizeChartTable } from "@/lib/sizeChart"

interface ChartRow {
  id: string
  name: string
  table: unknown
  productCount: number
}

export default function SizeChartsPage() {
  const [charts, setCharts] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // `null` = nothing open, `""` = the new-chart form, otherwise the id in edit.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [table, setTable] = useState<SizeChartTable | null>(null)

  const load = () =>
    fetch("/api/admin/size-charts")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCharts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  const startCreate = () => {
    setEditingId("")
    setName("")
    setTable(emptySizeChartTable)
  }

  const startEdit = (chart: ChartRow) => {
    setEditingId(chart.id)
    setName(chart.name)
    setTable(normalizeSizeChartTable(chart.table) ?? emptySizeChartTable)
  }

  const cancel = () => {
    setEditingId(null)
    setName("")
    setTable(null)
  }

  const save = async () => {
    setSaving(true)
    try {
      const creating = editingId === ""
      const res = await fetch(
        creating ? "/api/admin/size-charts" : `/api/admin/size-charts/${editingId}`,
        {
          method: creating ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, table }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to save")

      await load()
      cancel()
      Swal.fire({ text: "Size chart saved!", confirmButtonColor: "#18181b" })
    } catch (err) {
      Swal.fire({
        text: err instanceof Error ? err.message : "Failed to save",
        confirmButtonColor: "#18181b",
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (chart: ChartRow) => {
    // Deleting only unlinks — products keep selling, they just stop offering a
    // chart — but the count is worth stating before it happens.
    const confirmed = await Swal.fire({
      title: `Delete "${chart.name}"?`,
      text: chart.productCount
        ? `${chart.productCount} product${chart.productCount === 1 ? "" : "s"} use this chart and will stop showing one.`
        : "No products use this chart.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    })
    if (!confirmed.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/size-charts/${chart.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to delete")
      await load()
      if (editingId === chart.id) cancel()
    } catch (err) {
      Swal.fire({
        text: err instanceof Error ? err.message : "Failed to delete",
        confirmButtonColor: "#18181b",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Size Charts</h1>
          <p className="text-sm text-muted-foreground">
            Write a chart once, then pick it on any product that should show it.
          </p>
        </div>
        {editingId === null && (
          <Button size="lg" onClick={startCreate}>
            <Plus className="h-4 w-4" /> New Size Chart
          </Button>
        )}
      </div>

      {/* Create / edit form */}
      {editingId !== null && (
        <Card>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1.5 max-w-md">
                <Label htmlFor="chart_name">Chart Name</Label>
                <p className="text-xs text-muted-foreground">
                  How it appears in the product picker — e.g. &quot;Men&apos;s Tops&quot;.
                </p>
                <Input
                  id="chart_name"
                  value={name}
                  placeholder="Men's Tops"
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-6">
                <Button variant="outline" onClick={cancel} disabled={saving}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={save} disabled={saving || !name.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <SizeChartTableEditor value={table} onChange={setTable} />
          </CardContent>
        </Card>
      )}

      {/* List */}
      {charts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Ruler className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No size charts yet. Create one, then choose it on a product.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {charts.map(chart => {
            const parsed = normalizeSizeChartTable(chart.table)
            return (
              <Card key={chart.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <Ruler className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chart.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsed
                        ? `${parsed.columns.length} columns · ${parsed.rows.length} rows · ${parsed.unit}`
                        : "Empty table"}
                      {" · "}
                      {chart.productCount} product{chart.productCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startEdit(chart)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(chart)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
