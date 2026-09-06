"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Plus, Trash2, ShieldCheck, Loader2, Pencil, X, Check, Users, Lock, AlertTriangle } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { PERMISSION_MODULES, PERMISSION_GROUPS, type PermissionAction } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

type AdminRole = {
  id: string
  name: string
  slug: string
  description?: string | null
  permissions: string[]
  isSystem: boolean
  _count?: { users: number }
}
type FormValues = { name: string; slug: string; description: string }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")
}

function errorMessage(e: unknown, fallback: string) {
  const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
  return msg || fallback
}

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((p) => set.has(p))
}

// ─── Permission matrix ──────────────────────────────────────────────────────
// Rows = modules grouped by sidebar group, columns = View / Manage. Manage
// implies View, so ticking Manage ticks View and unticking View clears both.

type MatrixProps = { value: string[]; onChange: (next: string[]) => void }

function PermissionMatrix({ value, onChange }: MatrixProps) {
  const selected = useMemo(() => new Set(value), [value])
  const has = (key: string) => selected.has(key)

  function apply(mutate: (set: Set<string>) => void) {
    const next = new Set(selected)
    mutate(next)
    onChange(Array.from(next))
  }

  function setModule(set: Set<string>, mod: string, action: PermissionAction, checked: boolean) {
    if (action === "manage") {
      if (checked) { set.add(`${mod}.manage`); set.add(`${mod}.view`) }
      else set.delete(`${mod}.manage`)
    } else {
      if (checked) set.add(`${mod}.view`)
      else { set.delete(`${mod}.view`); set.delete(`${mod}.manage`) }
    }
  }

  const allKeys = PERMISSION_MODULES.map((m) => m.key)
  const columnState = (action: PermissionAction, keys: string[]) => {
    const count = keys.filter((k) => has(`${k}.${action}`)).length
    return count === 0 ? false : count === keys.length ? true : ("indeterminate" as const)
  }

  const toggleColumn = (action: PermissionAction, keys: string[]) => {
    const state = columnState(action, keys)
    const checked = state !== true
    apply((set) => keys.forEach((k) => setModule(set, k, action, checked)))
  }

  const rowState = (mod: string) =>
    has(`${mod}.manage`) ? true : has(`${mod}.view`) ? ("indeterminate" as const) : false

  const toggleRow = (mod: string) => {
    // Nothing → View → Manage → Nothing keeps a single click useful.
    apply((set) => {
      if (has(`${mod}.manage`)) { set.delete(`${mod}.manage`); set.delete(`${mod}.view`) }
      else if (has(`${mod}.view`)) set.add(`${mod}.manage`)
      else set.add(`${mod}.view`)
    })
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[55%]">Section</TableHead>
            <TableHead className="text-center">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <Checkbox checked={columnState("view", allKeys)} onCheckedChange={() => toggleColumn("view", allKeys)} aria-label="Toggle view for all sections" />
                <span>View</span>
              </label>
            </TableHead>
            <TableHead className="text-center">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <Checkbox checked={columnState("manage", allKeys)} onCheckedChange={() => toggleColumn("manage", allKeys)} aria-label="Toggle manage for all sections" />
                <span>Manage</span>
              </label>
            </TableHead>
            <TableHead className="text-center w-20">All</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMISSION_GROUPS.map((group) => {
            const mods = PERMISSION_MODULES.filter((m) => m.group === group)
            const keys = mods.map((m) => m.key)
            return (
              <GroupRows
                key={group}
                group={group}
                mods={mods}
                has={has}
                viewState={columnState("view", keys)}
                manageState={columnState("manage", keys)}
                onToggleGroup={(action) => toggleColumn(action, keys)}
                onToggleCell={(mod, action, checked) => apply((set) => setModule(set, mod, action, checked))}
                rowState={rowState}
                onToggleRow={toggleRow}
              />
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

type GroupRowsProps = {
  group: string
  mods: typeof PERMISSION_MODULES
  has: (key: string) => boolean
  viewState: boolean | "indeterminate"
  manageState: boolean | "indeterminate"
  onToggleGroup: (action: PermissionAction) => void
  onToggleCell: (mod: string, action: PermissionAction, checked: boolean) => void
  rowState: (mod: string) => boolean | "indeterminate"
  onToggleRow: (mod: string) => void
}

function GroupRows({ group, mods, has, viewState, manageState, onToggleGroup, onToggleCell, rowState, onToggleRow }: GroupRowsProps) {
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell className="py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group}</TableCell>
        <TableCell className="py-2 text-center">
          <Checkbox checked={viewState} onCheckedChange={() => onToggleGroup("view")} aria-label={`Toggle view for ${group}`} />
        </TableCell>
        <TableCell className="py-2 text-center">
          <Checkbox checked={manageState} onCheckedChange={() => onToggleGroup("manage")} aria-label={`Toggle manage for ${group}`} />
        </TableCell>
        <TableCell />
      </TableRow>
      {mods.map((m) => (
        <TableRow key={m.key}>
          <TableCell className="py-2.5">
            <p className="text-sm font-medium text-foreground">{m.label}</p>
            <p className="text-[11px] font-mono text-muted-foreground">{m.key}</p>
          </TableCell>
          <TableCell className="text-center">
            <Checkbox checked={has(`${m.key}.view`)} onCheckedChange={(c) => onToggleCell(m.key, "view", c === true)} aria-label={`View ${m.label}`} />
          </TableCell>
          <TableCell className="text-center">
            <Checkbox checked={has(`${m.key}.manage`)} onCheckedChange={(c) => onToggleCell(m.key, "manage", c === true)} aria-label={`Manage ${m.label}`} />
          </TableCell>
          <TableCell className="text-center">
            <Checkbox checked={rowState(m.key)} onCheckedChange={() => onToggleRow(m.key)} aria-label={`Cycle access for ${m.label}`} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [addPermissions, setAddPermissions] = useState<string[]>([])
  const [editPermissions, setEditPermissions] = useState<string[]>([])

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>()
  const editForm = useForm<FormValues>()

  async function fetchRoles() {
    try { setLoading(true); const res = await api.get("/admin/roles"); setRoles(res.data) }
    catch (e) { console.log(e) } finally { setLoading(false) }
  }

  async function onSubmit(data: FormValues) {
    try {
      setSubmitting(true)
      await api.post("/admin/roles", { ...data, permissions: addPermissions })
      reset()
      setAddPermissions([])
      setShowAddModal(false)
      fetchRoles()
    }
    catch (e) { Swal.fire({ text: errorMessage(e, "Failed to create role."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setSubmitting(false) }
  }

  const editUserCount = editingRole?._count?.users ?? 0
  const editPermissionsChanged = editingRole ? !sameSet(editPermissions, editingRole.permissions) : false

  async function onEditSubmit(data: FormValues) {
    if (!editingRole) return
    if (editPermissionsChanged && editUserCount > 0) {
      const confirmed = await Swal.fire({
        title: "Sign out role members?",
        text: `${editUserCount} user${editUserCount === 1 ? "" : "s"} with this role will be signed out and must log in again to receive the new permissions.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Save & Sign Out",
        confirmButtonColor: "#18181b",
      })
      if (!confirmed.isConfirmed) return
    }
    try {
      setEditSubmitting(true)
      const res = await api.patch(`/admin/roles/${editingRole.id}`, { ...data, permissions: editPermissions })
      setEditingRole(null)
      fetchRoles()
      if (res.data?.sessionsRevoked && editUserCount > 0) {
        Swal.fire({ text: "Role updated. Users with this role have been signed out.", icon: "success", confirmButtonColor: "#18181b" })
      }
    }
    catch (e) { Swal.fire({ text: errorMessage(e, "Failed to update role."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setEditSubmitting(false) }
  }

  function openAdd() {
    reset({ name: "", slug: "", description: "" })
    setAddPermissions([])
    setShowAddModal(true)
  }

  function openEdit(r: AdminRole) {
    setEditingRole(r)
    editForm.reset({ name: r.name, slug: r.slug, description: r.description || "" })
    setEditPermissions([...r.permissions])
  }

  async function handleDelete(r: AdminRole) {
    if (!(await confirmDelete(`Delete the "${r.name}" role?`))) return
    try { setDeletingId(r.id); await api.delete(`/admin/roles/${r.id}`); fetchRoles() }
    catch (e) { Swal.fire({ text: errorMessage(e, "Failed to delete role."), confirmButtonColor: "#18181b", icon: "error" }) }
    finally { setDeletingId(null) }
  }

  useEffect(() => {
    let cancelled = false
    api.get("/admin/roles")
      .then((res) => { if (!cancelled) setRoles(res.data) })
      .catch((e) => console.log(e))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const summarize = (perms: string[]) => {
    const manage = perms.filter((p) => p.endsWith(".manage")).length
    const view = perms.filter((p) => p.endsWith(".view") && !perms.includes(p.replace(/\.view$/, ".manage"))).length
    return { manage, view }
  }

  return (
    <>
      {/* Add Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Plus className="w-5 h-5 text-foreground" /></div>
              <div><h2 className="text-lg font-semibold tracking-tight text-foreground">Add Role</h2><p className="text-xs text-muted-foreground">Define what staff members with this role can open and change</p></div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Name</Label>
                  <Input {...register("name", { required: true, onChange: (e) => setValue("slug", slugify(e.target.value)) })} placeholder="e.g. Order Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                  <Input {...register("slug", { required: true })} placeholder="auto-generated" className="font-mono text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea {...register("description")} rows={2} placeholder="What this role is for" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</Label>
                <PermissionMatrix value={addPermissions} onChange={setAddPermissions} />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" size="lg" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? "Creating..." : "Create Role"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <Card className="w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <Button variant="ghost" size="icon" onClick={() => setEditingRole(null)} className="absolute top-4 right-4 h-8 w-8 text-muted-foreground"><X size={18} /></Button>
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
              <div className="p-2.5 bg-muted rounded-lg"><Pencil className="w-5 h-5 text-foreground" /></div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Edit Role</h2>
                <p className="text-xs text-muted-foreground">
                  {editUserCount} user{editUserCount === 1 ? "" : "s"} currently hold this role
                  {editingRole.isSystem ? " · built-in role" : ""}
                </p>
              </div>
            </div>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role Name</Label>
                  <Input {...editForm.register("name", { required: true, onChange: (e) => editForm.setValue("slug", slugify(e.target.value)) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slug</Label>
                  <Input {...editForm.register("slug", { required: true })} className="font-mono text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
                <Textarea {...editForm.register("description")} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permissions</Label>
                <PermissionMatrix value={editPermissions} onChange={setEditPermissions} />
              </div>
              {editPermissionsChanged && editUserCount > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Saving changed permissions will sign out the {editUserCount} user{editUserCount === 1 ? "" : "s"} with this role. They receive the new access on their next login.</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditingRole(null)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={editSubmitting} className="flex-1">
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6 max-w-7xl mx-auto p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><ShieldCheck size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Roles & Permissions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Control which sections staff accounts can view and manage</p>
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        </div>

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading roles...</span>
          </Card>
        ) : roles.length === 0 ? (
          <Card className="text-center py-16 flex flex-col items-center">
            <ShieldCheck className="text-muted-foreground/40 w-12 h-12 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No roles yet</h3>
            <p className="text-muted-foreground mt-1 text-xs">Create your first role using the button above.</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const { manage, view } = summarize(role.permissions)
                    const userCount = role._count?.users ?? 0
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{role.name}</p>
                            {role.isSystem && (
                              <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground"><Lock className="w-3 h-3" /> Built-in</Badge>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground">/{role.slug}</p>
                          {role.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">{role.description}</p>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">{manage} manage</Badge>
                            <Badge variant="outline" className="text-muted-foreground font-mono">{view} view-only</Badge>
                            {role.permissions.length === 0 && <span className="text-xs text-muted-foreground">No access</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm font-mono text-foreground">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" /> {userCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(role)} className="h-8 w-8 text-muted-foreground"><Pencil size={14} /></Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(role)}
                              disabled={deletingId === role.id || role.isSystem || userCount > 0}
                              title={role.isSystem ? "Built-in roles cannot be deleted" : userCount > 0 ? "Reassign its users first" : "Delete role"}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              {deletingId === role.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
