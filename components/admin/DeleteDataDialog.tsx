"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Target =
  | "images"
  | "variants"
  | "products"
  | "categories"
  | "brands"
  | "colors"
  | "sizes"
  | "lengths"
  | "measurements"

interface Item {
  id: Target
  label: string
  hint: string
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Catalogue",
    items: [
      {
        id: "images",
        label: "Product Images",
        hint: "Every ProductImage row. Uploaded files in the media library are left alone.",
      },
      {
        id: "variants",
        label: "Product Variants",
        hint: "Size / colour rows with their stock, plus the cart, wishlist and stock-alert entries pointing at them.",
      },
      {
        id: "products",
        label: "Products",
        hint: "The products themselves, along with their reviews and questions.",
      },
    ],
  },
  {
    title: "Taxonomy & attributes",
    items: [
      {
        id: "categories",
        label: "Categories",
        hint: "The whole tree, deleted leaf-first. A category still holding products is kept.",
      },
      { id: "brands", label: "Brands", hint: "A brand still linked to a product is kept." },
      {
        id: "colors",
        label: "Colors",
        hint: "The colour swatch list. Variants store colour as plain text, so nothing blocks this.",
      },
      { id: "sizes", label: "Sizes", hint: "The size lookup list." },
      { id: "lengths", label: "Lengths", hint: "The length lookup list." },
      {
        id: "measurements",
        label: "Measurement Templates",
        hint: "Templates with their fields and price tiers. Products using one lose the link.",
      },
    ],
  },
]

const ALL_TARGETS = GROUPS.flatMap((g) => g.items.map((i) => i.id))

interface PurgeResult {
  deleted: Record<Target, number>
  skipped: { variants: number; products: number; categories: number; brands: number }
}

const RESULT_ROWS: { id: Target; label: string }[] = [
  { id: "images", label: "Images" },
  { id: "variants", label: "Variants" },
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "brands", label: "Brands" },
  { id: "colors", label: "Colors" },
  { id: "sizes", label: "Sizes" },
  { id: "lengths", label: "Lengths" },
  { id: "measurements", label: "Measurement templates" },
]

export default function DeleteDataDialog() {
  const [open, setOpen] = useState(false)
  const [targets, setTargets] = useState<Target[]>(ALL_TARGETS)
  const [password, setPassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<PurgeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (deleting) return
    setOpen(next)
    // Reset on the way in as well as out: every session starts from the same
    // state, and the password is never left sitting in memory.
    setTargets(ALL_TARGETS)
    setPassword("")
    setResult(null)
    setError(null)
  }

  function toggle(id: Target, checked: boolean) {
    setTargets((prev) => (checked ? [...prev, id] : prev.filter((t) => t !== id)))
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await api.post("/admin/data/purge", { targets, password })
      setResult(res.data)
      setPassword("")
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Delete failed. Please try again."
      setError(message)
    } finally {
      setDeleting(false)
    }
  }

  const allChecked = targets.length === ALL_TARGETS.length
  const canDelete = targets.length > 0 && password.length > 0

  const skippedNotes = result
    ? (
        [
          ["product", result.skipped.products],
          ["variant", result.skipped.variants],
          ["category", result.skipped.categories],
          ["brand", result.skipped.brands],
        ] as const
      ).filter(([, n]) => n > 0)
    : []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 px-2 sm:px-3"
          title="Permanently delete catalogue data"
          aria-label="Delete Data"
        >
          <Trash2 className="size-[18px]" />
          <span className="hidden md:inline text-xs font-medium">Delete Data</span>
        </Button>
      </DialogTrigger>

      {/* Bounded to the viewport with the body as the only scrolling row, so the
          title and the confirm buttons stay put however long the list gets —
          otherwise a short screen clips the dialog with no way to reach it. */}
      <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Delete data permanently
          </DialogTitle>
          <DialogDescription>
            This removes rows from the database outright — it is not the soft delete used elsewhere
            in the admin, and there is no undo.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-sm overflow-y-auto -mx-1 px-1">
            <p className="font-medium text-foreground">Done.</p>
            <ul className="space-y-1 text-muted-foreground">
              {RESULT_ROWS.filter((r) => result.deleted[r.id] > 0).map((r) => (
                <li key={r.id}>
                  {r.label} deleted:{" "}
                  <span className="font-medium text-foreground">{result.deleted[r.id]}</span>
                </li>
              ))}
              {RESULT_ROWS.every((r) => result.deleted[r.id] === 0) && <li>Nothing was deleted.</li>}
            </ul>
            {skippedNotes.length > 0 && (
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Kept {skippedNotes.map(([name, n]) => `${n} ${name}(s)`).join(", ")} — they are still
                referenced by orders, purchase orders, inventory logs or surviving products, so
                deleting them would destroy history.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto -mx-1 px-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {targets.length} of {ALL_TARGETS.length} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleting}
                onClick={() => setTargets(allChecked ? [] : ALL_TARGETS)}
              >
                {allChecked ? "Clear all" : "Select all"}
              </Button>
            </div>

            <div className="space-y-4">
              {GROUPS.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </p>
                  {group.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={targets.includes(item.id)}
                        onCheckedChange={(c) => toggle(item.id, c === true)}
                        disabled={deleting}
                        className="mt-0.5"
                      />
                      <span className="space-y-0.5">
                        <span className="block text-sm font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">{item.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <p className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200">
              Anything tied to an order, purchase order or inventory log is skipped automatically so
              your sales history stays intact. You will get a count of what was kept.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="purge-password" className="text-sm font-medium text-foreground">
                Enter your admin password to confirm
              </label>
              <Input
                id="purge-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={deleting}
                // The field must start empty every time — a saved-password
                // autofill would put the delete one keystroke away. "new-password"
                // is what browsers actually honour here; the data-* attributes
                // opt the same way out of 1Password and LastPass.
                autoComplete="new-password"
                name="purge-confirm-password"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                placeholder="Password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canDelete && !deleting) handleDelete()
                }}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border">
          {result ? (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || deleting}>
                {deleting && <Loader2 className="size-4 animate-spin" />}
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
