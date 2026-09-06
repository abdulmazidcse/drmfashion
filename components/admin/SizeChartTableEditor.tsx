"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { convertCell, type ChartUnit, type SizeChartTable } from "@/lib/sizeChart"

/** Blank starter matching the shape of the built-in Tops chart. */
export const emptySizeChartTable: SizeChartTable = {
  title: "Tops: Your Body Measurements (Alpha Sizing)",
  unit: "in",
  columns: ["Size", "Your Chest", "Your Neck", "Your Sleeve Length", "Your Waist"],
  rows: [
    ["S Semi Tall", "", "", "", ""],
    ["M Semi Tall", "", "", "", ""],
    ["L Semi Tall", "", "", "", ""],
  ],
}

/**
 * Grid editor for a named size chart.
 *
 * Values are entered in ONE unit; the storefront toggle converts the other way,
 * so the admin never types the table twice. The first column is the size label
 * and is never converted.
 */
export default function SizeChartTableEditor({
  value,
  onChange,
}: {
  value: SizeChartTable | null
  onChange: (next: SizeChartTable | null) => void
}) {
  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-xs text-muted-foreground">
          No table yet. Add one, then pick this chart on any product that should show it.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onChange(emptySizeChartTable)}>
          <Plus className="w-3.5 h-3.5" /> Add Size Chart
        </Button>
      </div>
    )
  }

  const table = value
  const otherUnit: ChartUnit = table.unit === "in" ? "cm" : "in"

  const patch = (next: Partial<SizeChartTable>) => onChange({ ...table, ...next })

  function setColumn(index: number, label: string) {
    patch({ columns: table.columns.map((c, i) => (i === index ? label : c)) })
  }

  function addColumn() {
    patch({
      columns: [...table.columns, `Column ${table.columns.length + 1}`],
      rows: table.rows.map((r) => [...r, ""]),
    })
  }

  function removeColumn(index: number) {
    // The first column carries the size label, so it always stays.
    if (index === 0 || table.columns.length <= 2) return
    patch({
      columns: table.columns.filter((_, i) => i !== index),
      rows: table.rows.map((r) => r.filter((_, i) => i !== index)),
    })
  }

  function setCell(rowIndex: number, colIndex: number, cellValue: string) {
    patch({
      rows: table.rows.map((r, i) => (i === rowIndex ? r.map((c, j) => (j === colIndex ? cellValue : c)) : r)),
    })
  }

  function addRow() {
    patch({ rows: [...table.rows, table.columns.map(() => "")] })
  }

  function removeRow(index: number) {
    patch({ rows: table.rows.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:items-end">
        <div className="space-y-2">
          <Label>Chart Title</Label>
          <Input
            value={table.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Tops: Your Body Measurements (Alpha Sizing)"
          />
        </div>
        <div className="space-y-2">
          <Label>Values Entered In</Label>
          <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
            {(["in", "cm"] as ChartUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => patch({ unit: u })}
                className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  table.unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {u === "in" ? "Inches" : "Centimeters"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Type the numbers once in {table.unit === "in" ? "inches" : "centimeters"} — the storefront converts them to{" "}
        {otherUnit === "in" ? "inches" : "centimeters"} on its own. Ranges work: &ldquo;35-37&rdquo; becomes &ldquo;
        {convertCell("35-37", table.unit, otherUnit)}&rdquo;.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {table.columns.map((col, colIndex) => (
                <th key={colIndex} className="p-1 align-bottom min-w-[130px]">
                  <div className="flex items-center gap-1">
                    <Input
                      value={col}
                      onChange={(e) => setColumn(colIndex, e.target.value)}
                      placeholder={colIndex === 0 ? "Size" : "Your Chest"}
                      className="h-8 text-xs font-semibold"
                    />
                    {colIndex > 0 && table.columns.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeColumn(colIndex)}
                        title="Remove column"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                  {colIndex === 0 && (
                    <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                      Label column — never converted
                    </span>
                  )}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {table.columns.map((_, colIndex) => (
                  <td key={colIndex} className="p-1">
                    <Input
                      value={row[colIndex] ?? ""}
                      onChange={(e) => setCell(rowIndex, colIndex, e.target.value)}
                      placeholder={colIndex === 0 ? "S Semi Tall" : "35-37"}
                      className="h-8 text-xs"
                    />
                  </td>
                ))}
                <td className="p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeRow(rowIndex)}
                    title="Remove row"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3.5 h-3.5" /> Add Row
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="w-3.5 h-3.5" /> Add Column
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove Chart
        </Button>
      </div>
    </div>
  )
}
