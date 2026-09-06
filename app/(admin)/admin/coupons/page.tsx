"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Ticket, Plus, Trash2, Loader2 } from "lucide-react"
import api from "@/lib/axios"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
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

type Coupon = {
  id: string
  code: string
  discount: number
  active: boolean
  subscribersOnly: boolean
  firstOrderOnly: boolean
  expiresAt: string | null
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchCoupons() {
    try {
      const res = await api.get("/admin/coupons")
      setCoupons(res.data)
    } catch (error) {
      console.error("Failed to fetch coupons", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  async function toggleStatus(id: string, currentStatus: boolean) {
    try {
      await api.patch(`/admin/coupons/${id}`, { active: !currentStatus })
      fetchCoupons()
    } catch (error) {
      console.error("Failed to toggle status", error)
    }
  }

  // Both rules were added after some codes already existed, so they have to be
  // switchable from the list rather than only at creation time.
  async function toggleRule(id: string, rule: "subscribersOnly" | "firstOrderOnly", current: boolean) {
    try {
      await api.patch(`/admin/coupons/${id}`, { [rule]: !current })
      fetchCoupons()
    } catch (error) {
      console.error("Failed to toggle rule", error)
    }
  }

  async function deleteCoupon(id: string) {
    if (!(await confirmDelete("Are you sure you want to delete this promo code?"))) return
    try {
      await api.delete(`/admin/coupons/${id}`)
      fetchCoupons()
    } catch (error) {
      console.error("Failed to delete coupon", error)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-muted text-foreground rounded-xl flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Promo Codes</h1>
            <p className="text-sm text-muted-foreground">Manage discount codes and promotional campaigns.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/coupons/create">
            <Plus className="w-4 h-4" />
            Create Promo Code
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-foreground mb-4" />
              <span className="text-muted-foreground font-medium text-sm">Loading promo codes...</span>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <Ticket className="text-muted-foreground/40 w-16 h-16 mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No promo codes active</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Create your first promo code to start running discounts and campaigns.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-muted border border-border rounded-lg text-sm font-mono font-semibold text-foreground">
                          {coupon.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-emerald-600">{coupon.discount}% OFF</span>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleStatus(coupon.id, coupon.active)}
                          className="rounded-full"
                          title={coupon.active ? "Set Inactive" : "Set Active"}
                        >
                          <Badge
                            variant={coupon.active ? "default" : "secondary"}
                            className="cursor-pointer"
                          >
                            {coupon.active ? "Active" : "Inactive"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => toggleRule(coupon.id, "subscribersOnly", coupon.subscribersOnly)}
                            title="Only works for newsletter subscribers"
                          >
                            <Badge
                              variant={coupon.subscribersOnly ? "default" : "outline"}
                              className="cursor-pointer text-[10px]"
                            >
                              Subscribers
                            </Badge>
                          </button>
                          <button
                            onClick={() => toggleRule(coupon.id, "firstOrderOnly", coupon.firstOrderOnly)}
                            title="Only works if this email has never ordered"
                          >
                            <Badge
                              variant={coupon.firstOrderOnly ? "default" : "outline"}
                              className="cursor-pointer text-[10px]"
                            >
                              First order
                            </Badge>
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCoupon(coupon.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete Promo Code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
