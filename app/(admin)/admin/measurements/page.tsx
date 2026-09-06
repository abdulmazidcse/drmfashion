"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Ruler, Save, Trash2, X } from "lucide-react"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import { slugify } from "@/lib/journal"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type MeasurementTier = {
  id: string
  minValue: number
  maxValue: number
  surchargeType: "FLAT" | "PERCENT"
  surchargeValue: number
  position: number
}

type MeasurementField = {
  id: string
  label: string
  key: string
  unit: string
  helpText: string | null
  placeholder: string | null
  minValue: number | null
  maxValue: number | null
  step: number
  required: boolean
  position: number
  tiers?: MeasurementTier[]
}

type MeasurementTemplate = {
  id: string
  name: string
  slug: string
  description: string | null
  instructions: string | null
  surchargeType: "FLAT" | "PERCENT"
  surchargeValue: number
  active: boolean
  position: number
  fields: MeasurementField[]
  _count?: { products: number }
}

type TemplateForm = {
  name: string
  slug: string
  description: string
  instructions: string
  surchargeType: "FLAT" | "PERCENT"
  surchargeValue: number
  active: boolean
  position: number
}

type TierForm = {
  minValue: string
  maxValue: string
  surchargeType: "FLAT" | "PERCENT"
  surchargeValue: string
}

type FieldForm = {
  label: string
  key: string
  unit: string
  helpText: string
  placeholder: string
  minValue: string
  maxValue: string
  step: string
  required: boolean
  position: number
  tiers: TierForm[]
}

const emptyTemplate: TemplateForm = {
  name: "",
  slug: "",
  description: "",
  instructions: "",
  surchargeType: "FLAT",
  surchargeValue: 0,
  active: true,
  position: 0,
}

const emptyTier: TierForm = { minValue: "", maxValue: "", surchargeType: "FLAT", surchargeValue: "" }

const emptyField: FieldForm = {
  label: "",
  key: "",
  unit: "in",
  helpText: "",
  placeholder: "",
  minValue: "",
  maxValue: "",
  step: "0.5",
  required: true,
  position: 0,
  tiers: [],
}

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-zinc-500 block"
const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm transition-all focus:border-zinc-950 focus:bg-white focus:outline-none"

export default function AdminMeasurementsPage() {
  const { baseCurrency } = useCurrency()
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplate)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateSlugLocked, setTemplateSlugLocked] = useState(false)

  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyField)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [savingField, setSavingField] = useState(false)

  function fetchTemplates() {
    return api
      .get("/admin/measurements")
      .then((res) => {
        const list: MeasurementTemplate[] = Array.isArray(res.data) ? res.data : []
        setTemplates(list)
        setActiveId((prev) => (prev && list.some((t) => t.id === prev) ? prev : list[0]?.id ?? null))
      })
      .catch((err) => {
        console.error(err)
        setTemplates([])
      })
  }

  useEffect(() => {
    fetchTemplates().finally(() => setLoading(false))
  }, [])

  const active = templates.find((t) => t.id === activeId) || null

  function resetTemplateForm() {
    setTemplateForm(emptyTemplate)
    setEditingTemplateId(null)
    setTemplateSlugLocked(false)
  }

  function startEditTemplate(template: MeasurementTemplate) {
    setEditingTemplateId(template.id)
    setTemplateSlugLocked(true)
    setTemplateForm({
      name: template.name,
      slug: template.slug,
      description: template.description || "",
      instructions: template.instructions || "",
      surchargeType: template.surchargeType,
      surchargeValue: template.surchargeValue,
      active: template.active,
      position: template.position,
    })
  }

  async function submitTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!templateForm.name.trim()) return

    setSavingTemplate(true)
    try {
      const payload = { ...templateForm, slug: slugify(templateForm.slug || templateForm.name) }
      if (editingTemplateId) {
        await api.put(`/admin/measurements/${editingTemplateId}`, payload)
      } else {
        const res = await api.post("/admin/measurements", payload)
        setActiveId(res.data?.id ?? null)
      }
      resetTemplateForm()
      await fetchTemplates()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to save template",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    } finally {
      setSavingTemplate(false)
    }
  }

  async function deleteTemplate(template: MeasurementTemplate) {
    const linked = template._count?.products ?? 0
    const warning = linked
      ? `Delete "${template.name}"? ${linked} product(s) will fall back to standard sizing.`
      : `Delete "${template.name}"?`

    if (!(await confirmDelete(warning))) return

    try {
      await api.delete(`/admin/measurements/${template.id}`)
      if (editingTemplateId === template.id) resetTemplateForm()
      await fetchTemplates()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to delete template",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    }
  }

  function resetFieldForm() {
    setFieldForm(emptyField)
    setEditingFieldId(null)
  }

  function startEditField(field: MeasurementField) {
    setEditingFieldId(field.id)
    setFieldForm({
      label: field.label,
      key: field.key,
      unit: field.unit,
      helpText: field.helpText || "",
      placeholder: field.placeholder || "",
      minValue: field.minValue?.toString() ?? "",
      maxValue: field.maxValue?.toString() ?? "",
      step: field.step?.toString() ?? "0.5",
      required: field.required,
      position: field.position,
      tiers: (field.tiers ?? []).map((tier) => ({
        minValue: tier.minValue.toString(),
        maxValue: tier.maxValue.toString(),
        surchargeType: tier.surchargeType,
        surchargeValue: tier.surchargeValue.toString(),
      })),
    })
  }

  function addTier() {
    setFieldForm((prev) => {
      // Start the new bracket where the last one ended, which is what admins
      // building a 39-40 / 41-42 / 43-44 ladder almost always want next.
      const last = prev.tiers[prev.tiers.length - 1]
      const nextMin = last && Number.isFinite(Number(last.maxValue)) ? String(Number(last.maxValue) + 1) : ""
      return {
        ...prev,
        tiers: [...prev.tiers, { ...emptyTier, minValue: nextMin, surchargeType: last?.surchargeType ?? "FLAT" }],
      }
    })
  }

  function updateTier(index: number, patch: Partial<TierForm>) {
    setFieldForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    }))
  }

  function removeTier(index: number) {
    setFieldForm((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }))
  }

  async function submitField(e: React.FormEvent) {
    e.preventDefault()
    if (!active || !fieldForm.label.trim()) return

    setSavingField(true)
    try {
      if (editingFieldId) {
        await api.put(`/admin/measurements/fields/${editingFieldId}`, fieldForm)
      } else {
        await api.post(`/admin/measurements/${active.id}/fields`, fieldForm)
      }
      resetFieldForm()
      await fetchTemplates()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to save field",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    } finally {
      setSavingField(false)
    }
  }

  async function deleteField(field: MeasurementField) {
    if (!(await confirmDelete(`Delete the "${field.label}" measurement?`))) return
    try {
      await api.delete(`/admin/measurements/fields/${field.id}`)
      if (editingFieldId === field.id) resetFieldForm()
      await fetchTemplates()
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to delete field",
        icon: "error",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Custom Measurements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Made-to-measure garment types and the tailoring surcharge charged for each.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ─── Template form + list ─────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {editingTemplateId ? "Edit Garment Type" : "Add Garment Type"}
            </p>
            <form onSubmit={submitTemplate} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: templateSlugLocked ? prev.slug : slugify(e.target.value),
                    }))
                  }
                  placeholder="e.g. Shirt"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Slug</label>
                <input
                  type="text"
                  required
                  value={templateForm.slug}
                  onChange={(e) => {
                    setTemplateSlugLocked(true)
                    setTemplateForm((prev) => ({ ...prev, slug: e.target.value }))
                  }}
                  placeholder="shirt"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>Surcharge Type</label>
                  <select
                    value={templateForm.surchargeType}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, surchargeType: e.target.value as "FLAT" | "PERCENT" }))
                    }
                    className={inputClass}
                  >
                    <option value="FLAT">Flat amount</option>
                    <option value="PERCENT">% of price</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    {templateForm.surchargeType === "PERCENT" ? "Percent" : `Amount (${baseCurrency.symbol})`}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={templateForm.surchargeValue}
                    onChange={(e) =>
                      setTemplateForm((prev) => ({ ...prev, surchargeValue: Number(e.target.value) }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>How To Measure (shown to customer)</label>
                <textarea
                  rows={3}
                  value={templateForm.instructions}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Measure across the back from shoulder seam to shoulder seam..."
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelClass}>Position</label>
                  <input
                    type="number"
                    value={templateForm.position}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, position: Number(e.target.value) }))}
                    className={inputClass}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={templateForm.active}
                    onChange={(e) => setTemplateForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span className="text-sm font-medium text-zinc-700">Active</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingTemplate ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingTemplateId ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingTemplateId ? "Update" : "Add"}
                </button>
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={resetTemplateForm}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                )}
              </div>
            </form>
          </Card>

          <Card className="p-0">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <Ruler className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm">No garment types yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {templates.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(template.id)
                        resetFieldForm()
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors ${
                        activeId === template.id ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{template.name}</span>
                          {!template.active && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              Off
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {template.fields.length} field{template.fields.length === 1 ? "" : "s"} ·{" "}
                          {template._count?.products ?? 0} product
                          {(template._count?.products ?? 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-bold text-white">
                        {template.surchargeType === "PERCENT"
                          ? `+${template.surchargeValue}%`
                          : `+${baseCurrency.symbol}${template.surchargeValue}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ─── Field editor ─────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {!active ? (
            <Card className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Ruler className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm">Add a garment type to start defining measurements.</p>
            </Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{active.name}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Tailoring fee:{" "}
                      <span className="font-medium text-foreground">
                        {active.surchargeType === "PERCENT"
                          ? `${active.surchargeValue}% of the item price`
                          : `${baseCurrency.symbol}${active.surchargeValue} flat per item`}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditTemplate(active)}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(active)}
                      className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {editingFieldId ? "Edit Measurement" : "Add Measurement"}
                </p>
                <form onSubmit={submitField} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Label</label>
                      <input
                        type="text"
                        required
                        value={fieldForm.label}
                        onChange={(e) =>
                          setFieldForm((prev) => ({
                            ...prev,
                            label: e.target.value,
                            key: editingFieldId ? prev.key : slugify(e.target.value).replace(/-/g, "_"),
                          }))
                        }
                        placeholder="e.g. Shoulder"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Key</label>
                      <input
                        type="text"
                        required
                        value={fieldForm.key}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, key: e.target.value }))}
                        placeholder="shoulder"
                        className={`${inputClass} font-mono text-xs`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Unit</label>
                      <select
                        value={fieldForm.unit}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, unit: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="in">in</option>
                        <option value="cm">cm</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Allowed Min</label>
                      <input
                        type="number"
                        step="0.1"
                        value={fieldForm.minValue}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, minValue: e.target.value }))}
                        placeholder="14"
                        className={inputClass}
                      />
                      <p className="text-[10px] text-zinc-400">Smallest value a customer may enter</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Allowed Max</label>
                      <input
                        type="number"
                        step="0.1"
                        value={fieldForm.maxValue}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, maxValue: e.target.value }))}
                        placeholder="26"
                        className={inputClass}
                      />
                      <p className="text-[10px] text-zinc-400">Largest value a customer may enter</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Step</label>
                      <input
                        type="number"
                        step="0.1"
                        value={fieldForm.step}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, step: e.target.value }))}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-zinc-400">How much the input&apos;s arrows move, e.g. 18 → 18.5</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Position</label>
                      <input
                        type="number"
                        value={fieldForm.position}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, position: Number(e.target.value) }))}
                        className={inputClass}
                      />
                      <p className="text-[10px] text-zinc-400">Order on the customer&apos;s form, lowest first</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelClass}>Help Text</label>
                    <input
                      type="text"
                      value={fieldForm.helpText}
                      onChange={(e) => setFieldForm((prev) => ({ ...prev, helpText: e.target.value }))}
                      placeholder="Measure across the back, seam to seam"
                      className={inputClass}
                    />
                  </div>

                  {/* ─── Size-based upcharge brackets ───────────────────── */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Price Upcharge By Size
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                          Charged on top of the garment type&apos;s tailoring fee when the customer&apos;s{" "}
                          {fieldForm.label.trim() ? fieldForm.label.trim().toLowerCase() : "measurement"} falls in a
                          bracket. Both ends are inclusive, brackets must not overlap or fall outside the allowed range
                          above, and a value in no bracket costs nothing extra.
                        </p>
                        {Number(fieldForm.step) > 0 && Number(fieldForm.step) < 1 && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                            This field steps by {fieldForm.step}, so 39–40 leaves 40.5 unpriced. Either end each bracket
                            just below the next one (39–40.5) or set the step to 1.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={addTier}
                        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors hover:bg-zinc-100"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Tier
                      </button>
                    </div>

                    {fieldForm.tiers.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_1.2fr_1fr_auto] gap-2 px-1">
                          <span className={labelClass}>From</span>
                          <span className={labelClass}>To</span>
                          <span className={labelClass}>Type</span>
                          <span className={labelClass}>Upcharge</span>
                          <span className="w-8" />
                        </div>
                        {fieldForm.tiers.map((tier, index) => (
                          <div key={index} className="grid grid-cols-[1fr_1fr_1.2fr_1fr_auto] items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              value={tier.minValue}
                              onChange={(e) => updateTier(index, { minValue: e.target.value })}
                              placeholder="39"
                              className={`${inputClass} bg-white px-3 py-2`}
                            />
                            <input
                              type="number"
                              step="0.1"
                              value={tier.maxValue}
                              onChange={(e) => updateTier(index, { maxValue: e.target.value })}
                              placeholder="40"
                              className={`${inputClass} bg-white px-3 py-2`}
                            />
                            <select
                              value={tier.surchargeType}
                              onChange={(e) =>
                                updateTier(index, { surchargeType: e.target.value as "FLAT" | "PERCENT" })
                              }
                              className={`${inputClass} bg-white px-3 py-2`}
                            >
                              <option value="FLAT">{baseCurrency.symbol} Flat</option>
                              <option value="PERCENT">% of price</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={tier.surchargeValue}
                              onChange={(e) => updateTier(index, { surchargeValue: e.target.value })}
                              placeholder="45"
                              className={`${inputClass} bg-white px-3 py-2`}
                            />
                            <button
                              type="button"
                              onClick={() => removeTier(index)}
                              aria-label="Remove tier"
                              className="cursor-pointer rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={fieldForm.required}
                        onChange={(e) => setFieldForm((prev) => ({ ...prev, required: e.target.checked }))}
                        className="h-4 w-4 accent-zinc-950"
                      />
                      <span className="text-sm font-medium text-zinc-700">Required</span>
                    </label>

                    <div className="flex items-center gap-2">
                      {editingFieldId && (
                        <button
                          type="button"
                          onClick={resetFieldForm}
                          className="flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:bg-zinc-50"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingField}
                        className="flex cursor-pointer items-center gap-2 rounded-lg bg-zinc-950 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {savingField ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : editingFieldId ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {editingFieldId ? "Update Measurement" : "Add Measurement"}
                      </button>
                    </div>
                  </div>
                </form>
              </Card>

              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Measurement</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Size Upcharge</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          No measurements defined for {active.name} yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      active.fields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <span className="font-medium text-foreground">{field.label}</span>
                            {field.helpText && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{field.helpText}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{field.key}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {field.minValue != null || field.maxValue != null
                              ? `${field.minValue ?? "—"} – ${field.maxValue ?? "—"} ${field.unit}`
                              : `Any (${field.unit})`}
                          </TableCell>
                          <TableCell>
                            {field.tiers && field.tiers.length > 0 ? (
                              <div className="space-y-0.5">
                                {field.tiers.map((tier) => (
                                  <div key={tier.id} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">
                                      {tier.minValue}–{tier.maxValue} {field.unit}
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      +
                                      {tier.surchargeType === "PERCENT"
                                        ? `${tier.surchargeValue}%`
                                        : `${baseCurrency.symbol}${tier.surchargeValue}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{field.required ? "Yes" : "Optional"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEditField(field)}
                                className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteField(field)}
                                className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
