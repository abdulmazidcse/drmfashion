"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { Mail, Trash2, Download } from "lucide-react"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Subscriber = {
  id: string
  email: string
  firstName: string | null
  shopFor: string | null
  subscribedAt: string
}

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadSubscribers()
  }, [])

  const loadSubscribers = async () => {
    try {
      const res = await api.get("/admin/subscribers")
      setSubscribers(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Are you sure you want to remove this subscriber?"))) return
    try {
      await api.delete(`/admin/subscribers?id=${id}`)
      setSubscribers((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to delete subscriber", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  const exportCsv = () => {
    const header = ["Email", "First Name", "Shop For", "Subscribed At"]
    const rows = filtered.map((s) => [
      s.email,
      s.firstName ?? "",
      s.shopFor ?? "",
      new Date(s.subscribedAt).toISOString().slice(0, 10),
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filtered = subscribers.filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      s.email.toLowerCase().includes(q) ||
      (s.firstName ?? "").toLowerCase().includes(q)
    )
  })

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading subscribers...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-muted-foreground" />
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            People who signed up via the storefront newsletter form.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full sm:w-72 px-3 py-2 text-sm rounded-md border border-input bg-background outline-none focus:ring-2 focus:ring-ring/40"
        />
        <Badge variant="secondary" className="text-xs">
          {filtered.length} of {subscribers.length}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {subscribers.length === 0 ? "No subscribers yet." : "No subscribers match your search."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Shop For</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell>{s.firstName || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {s.shopFor ? (
                        <Badge variant="secondary" className="text-xs">{s.shopFor}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.subscribedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                        className="text-muted-foreground hover:text-red-600"
                        title="Delete subscriber"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
