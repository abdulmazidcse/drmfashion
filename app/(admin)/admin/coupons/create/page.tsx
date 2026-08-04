"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Ticket, Loader2, Save } from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export default function CreateCouponPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!code || !discount) {
      setError("Code and discount are required.")
      return
    }

    try {
      setSubmitting(true)
      await api.post("/admin/coupons", {
        code,
        discount: parseFloat(discount),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true
      })

      router.push("/admin/coupons")
      router.refresh()
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create promo code.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col space-y-2 pb-6 border-b border-border">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Promo Codes
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-muted text-foreground rounded-xl flex items-center justify-center border border-border">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Create Promo Code
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Issue a new promotional discount for your customers
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardContent className="space-y-8 pt-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-5 py-4 rounded-md text-sm font-medium flex items-center gap-3">
                <div className="w-8 h-8 bg-destructive/15 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-destructive text-sm">!</span>
                </div>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="code">Promo Code Alias</Label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="code"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="e.g. SUMMER25"
                    className="pl-10 font-mono font-semibold uppercase tracking-widest"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">This exact phrase will be used by customers at checkout.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount Yield (%)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground text-sm pointer-events-none">%</span>
                  <Input
                    id="discount"
                    required
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="25"
                    className="pl-10 font-mono font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">Percentage deducted from the final cart subtotal.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Timeline (Optional)</Label>
              <div className="max-w-md">
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Leave empty to create a permanent discount code.</p>
            </div>
          </CardContent>

          <CardFooter className="border-t justify-end pt-6">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Issuing Code...</>
              ) : (
                <><Save className="w-4 h-4" /> Publish Promo Code</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
