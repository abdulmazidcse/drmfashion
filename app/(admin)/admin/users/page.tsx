"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Search,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Mail,
  Phone,
  Loader2,
  Save,
  Star,
  Plus,
  Minus,
  Hash,
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export default function UsersPage() {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  async function fetchUsers() {
    try {
      setLoading(true)
      const res = await api.get(`/admin/users?page=${page}&limit=20&search=${search}&role=${roleFilter}`)
      setUsers(res.data.data || res.data)
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages)
        setTotalRecords(res.data.meta.total)
      }
    } catch (error) {
      console.error("Failed to fetch users", error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers()
    }, 500)
    return () => clearTimeout(handler)
  }, [page, search, roleFilter])

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "USER", password: "" })
  const [submitting, setSubmitting] = useState(false)

  // Reward points state
  const [rewardOperation, setRewardOperation] = useState<"add" | "deduct" | "set">("add")
  const [rewardAmount, setRewardAmount] = useState("")
  const [rewardSubmitting, setRewardSubmitting] = useState(false)

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newUser.name || !newUser.email || !newUser.password) {
      Swal.fire({ text: "Name, email, and password are required", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)
      await api.post("/admin/users", newUser)
      setIsAddModalOpen(false)
      setNewUser({ name: "", email: "", phone: "", role: "USER", password: "" })
      await fetchUsers()
    } catch (error: any) {
      console.error(error)
      Swal.fire({ text: error.response?.data?.message || "Failed to create user", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }


  async function handleRewardPoints(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseInt(rewardAmount)
    if (!rewardAmount || isNaN(amount) || amount < 0) {
      Swal.fire({ text: "Please enter a valid amount.", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setRewardSubmitting(true)
      const res = await api.patch(`/admin/users/${selectedUser.id}/reward-points`, {
        operation: rewardOperation,
        amount,
      })
      // Update user in list optimistically
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, rewardPoints: res.data.rewardPoints } : u
        )
      )
      setSelectedUser((prev: any) => ({ ...prev, rewardPoints: res.data.rewardPoints }))
      setRewardAmount("")
      Swal.fire({ text: `Reward points updated successfully! New balance: ${res.data.rewardPoints} pts`, confirmButtonColor: "#18181b", icon: "success" })
      setIsRewardModalOpen(false)
    } catch (error: any) {
      console.error(error)
      Swal.fire({ text: error.response?.data?.message || "Failed to update reward points", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setRewardSubmitting(false)
    }
  }

  // Filter logic handled by server

  // Aggregate stats
  const totalClients = users.length
  const adminCount = users.filter((u) => u.role === "ADMIN").length
  const customerCount = users.filter((u) => u.role === "USER").length
  const totalRewardPoints = users.reduce((sum, u) => sum + (u.rewardPoints || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary text-primary-foreground rounded-lg">
              <Users size={24} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              User Profiles
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm max-w-md">
            Supervise client credentials, admin roles, reward points, and active permissions across the fashion house.
          </p>
        </div>

        {/* TOP LEVEL ACTION */}
        <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0">
          <UserPlus className="w-4 h-4" />
          Invite Associate
        </Button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-muted text-foreground rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Accounts</p>
              <h4 className="text-xl font-bold text-foreground font-mono">{totalClients}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Admins */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-muted text-foreground rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Administrators</p>
              <h4 className="text-xl font-bold text-foreground font-mono">{adminCount}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-muted text-foreground rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Curated Clientele</p>
              <h4 className="text-xl font-bold text-foreground font-mono">{customerCount}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Total Reward Points */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-muted text-amber-500 rounded-lg">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Reward Pts</p>
              <h4 className="text-xl font-bold text-foreground font-mono">{totalRewardPoints.toLocaleString()}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <Card>
        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search user profile names, email addresses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* FILTER DROPDOWN */}
            <div className="flex gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground font-medium"
              >
                <option value="ALL">All Member Roles</option>
                <option value="ADMIN">Administrators</option>
                <option value="USER">Standard Customers</option>
              </select>
            </div>
          </div>

          {/* MEMBERS DATABASE TABLE */}
          <div className="overflow-x-auto rounded-md border border-border w-full">
            <Table style={{ minWidth: '900px' }}>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Curated Client / Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Reward Points
                    </span>
                  </TableHead>
                  <TableHead>Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Syncing Users...</p>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group">
                      {/* CLIENT EMAIL */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-11 h-11">
                            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h5 className="font-semibold text-foreground text-sm">
                              {user.name}
                            </h5>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* PHONE */}
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {user.phone || "N/A"}
                        </div>
                      </TableCell>

                      {/* ROLE — read only. Promoting or demoting a member is not
                          something this screen offers any more. */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-semibold",
                            user.role === "ADMIN"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "text-muted-foreground"
                          )}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>

                      {/* REWARD POINTS */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 font-mono font-bold",
                              (user.rewardPoints || 0) > 0
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "text-muted-foreground"
                            )}
                          >
                            <Star className="w-3 h-3" />
                            {(user.rewardPoints || 0).toLocaleString()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user)
                              setRewardOperation("add")
                              setRewardAmount("")
                              setIsRewardModalOpen(true)
                            }}
                            className="text-muted-foreground hover:text-amber-600"
                            title="Manage Reward Points"
                          >
                            <Star size={13} />
                          </Button>
                        </div>
                      </TableCell>

                      {/* JOINED */}
                      <TableCell className="text-xs font-semibold text-muted-foreground font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-medium">
                Showing page {page} of {totalPages} ({totalRecords} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── REWARD POINTS MODAL ─── */}
      <Dialog open={isRewardModalOpen && !!selectedUser} onOpenChange={(open) => !open && setIsRewardModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          {selectedUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted text-amber-500 rounded-lg">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle>Manage Reward Points</DialogTitle>
                    <DialogDescription>{selectedUser.name} · {selectedUser.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Current Balance */}
              <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Balance</span>
                <span className="text-2xl font-bold text-amber-600 font-mono flex items-center gap-1.5">
                  <Star className="w-5 h-5" />
                  {(selectedUser.rewardPoints || 0).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
                </span>
              </div>

              <form onSubmit={handleRewardPoints} className="space-y-5">
                {/* Operation Type */}
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                    Operation Type
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "add", label: "Add", icon: Plus, color: "emerald" },
                      { value: "deduct", label: "Deduct", icon: Minus, color: "rose" },
                      { value: "set", label: "Set", icon: Hash, color: "indigo" },
                    ].map((op) => {
                      const Icon = op.icon
                      const isActive = rewardOperation === op.value
                      return (
                        <button
                          key={op.value}
                          type="button"
                          onClick={() => setRewardOperation(op.value as "add" | "deduct" | "set")}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 px-2 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer",
                            isActive
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input text-muted-foreground hover:border-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {op.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                    {rewardOperation === "add" && "➕ Adds points to current balance."}
                    {rewardOperation === "deduct" && "➖ Deducts points from balance (min 0)."}
                    {rewardOperation === "set" && "🔢 Replaces current balance with the entered value."}
                  </p>
                </div>

                {/* Amount Input */}
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Points Amount *
                  </Label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    <Input
                      type="number"
                      min="0"
                      required
                      value={rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="pl-9 font-mono font-bold"
                      placeholder="Enter points..."
                    />
                  </div>

                  {/* Preview */}
                  {rewardAmount && !isNaN(parseInt(rewardAmount)) && (
                    <div className="mt-2 text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      Preview: &nbsp;
                      <span className="font-bold text-foreground">
                        {rewardOperation === "add" &&
                          `${(selectedUser.rewardPoints || 0).toLocaleString()} + ${parseInt(rewardAmount).toLocaleString()} = `}
                        {rewardOperation === "deduct" &&
                          `${(selectedUser.rewardPoints || 0).toLocaleString()} − ${parseInt(rewardAmount).toLocaleString()} = `}
                        {rewardOperation === "set" && "New balance = "}
                      </span>
                      <span className="font-bold text-amber-600 font-mono">
                        {rewardOperation === "add" &&
                          ((selectedUser.rewardPoints || 0) + parseInt(rewardAmount)).toLocaleString()}
                        {rewardOperation === "deduct" &&
                          Math.max(0, (selectedUser.rewardPoints || 0) - parseInt(rewardAmount)).toLocaleString()}
                        {rewardOperation === "set" && parseInt(rewardAmount).toLocaleString()}
                        {" pts"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setIsRewardModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={rewardSubmitting}
                  >
                    {rewardSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Apply Points
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD USER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && setIsAddModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Full Name *</Label>
              <Input
                type="text"
                required
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="E.g. Jane Doe"
              />
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Email Address *</Label>
              <Input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Phone</Label>
                <Input
                  type="text"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+1 555-0199"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Role</Label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none cursor-pointer"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Initial Password *</Label>
              <Input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
