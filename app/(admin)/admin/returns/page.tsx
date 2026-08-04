"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCw, CheckCircle2, XCircle, DollarSign, Clock } from "lucide-react"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  REFUNDED: DollarSign,
}

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [selected, setSelected] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const [updating, setUpdating] = useState(false)

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const query = filterStatus !== "ALL" ? `?status=${filterStatus}` : ""
      const res = await fetch(`/api/admin/returns${query}`)
      if (res.ok) setReturns(await res.json())
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchReturns() }, [filterStatus])

  const handleUpdate = async (id: string, status: string) => {
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote })
      })
      if (!res.ok) throw new Error("Failed to update")
      setSelected(null)
      setAdminNote("")
      await fetchReturns()
    } catch (err: any) {
      Swal.fire({ text: err.message, confirmButtonColor: "#18181b" })
    } finally {
      setUpdating(false)
    }
  }

  const counts = {
    ALL: returns.length,
    PENDING: returns.filter(r => r.status === "PENDING").length,
    APPROVED: returns.filter(r => r.status === "APPROVED").length,
    REJECTED: returns.filter(r => r.status === "REJECTED").length,
    REFUNDED: returns.filter(r => r.status === "REFUNDED").length,
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Return Requests</h1>
          <p className="text-sm text-muted-foreground">Review and manage customer return requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReturns}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "APPROVED", "REJECTED", "REFUNDED"] as const).map(s => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className="rounded-full"
          >
            {s} ({counts[s as keyof typeof counts]})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : returns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm uppercase tracking-widest font-semibold">No return requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(r => {
            const Icon = STATUS_ICONS[r.status] || Clock
            return (
              <Card key={r.id} className="overflow-hidden py-0 transition-shadow hover:shadow-sm">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("gap-1 border text-[10px] font-bold uppercase tracking-widest", STATUS_COLORS[r.status])}>
                        <Icon className="w-3 h-3" /> {r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">#{r.orderId.slice(-8).toUpperCase()}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{r.user?.name} <span className="font-normal text-muted-foreground">({r.user?.email})</span></p>
                    <p className="text-xs text-muted-foreground"><span className="font-semibold">Reason:</span> {r.reason}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                  </div>

                  {r.status === "PENDING" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelected(r); setAdminNote("") }}
                      >
                        Manage
                      </Button>
                    </div>
                  )}
                </CardContent>

                {r.adminNote && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded px-3 py-2"><span className="font-bold">Admin Note:</span> {r.adminNote}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Return</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground"><span className="font-bold">Customer:</span> {selected.user?.name}</p>
                <p className="text-xs text-muted-foreground"><span className="font-bold">Reason:</span> {selected.reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNote">Admin Note (optional)</Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for approval/rejection, instructions, etc..."
                  className="resize-none"
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                <Button size="lg" onClick={() => handleUpdate(selected.id, "APPROVED")} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve Return
                </Button>
                <Button variant="destructive" size="lg" onClick={() => handleUpdate(selected.id, "REJECTED")} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Return
                </Button>
                <Button variant="secondary" size="lg" onClick={() => handleUpdate(selected.id, "REFUNDED")} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Mark as Refunded
                </Button>
                <Button variant="outline" size="lg" onClick={() => setSelected(null)} className="w-full">
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
