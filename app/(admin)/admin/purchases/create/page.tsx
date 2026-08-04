"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle
} from "lucide-react"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"

export default function CreatePurchaseOrderPage() {
  const router = useRouter()
  const { baseCurrency, formatBasePrice } = useCurrency()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])

  // Form State
  const [supplierId, setSupplierId] = useState("")
  const [orderItems, setOrderItems] = useState<any[]>([]) // { variantId, quantity, unitCost, variantInfo }

  // Supplier Modal State
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", address: "" })
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  const [searchVariant, setSearchVariant] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const supRes = await api.get("/admin/suppliers")
        setSuppliers(supRes.data)
      } catch (error) {
        console.error("Failed to fetch suppliers", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchVariant.trim().length < 2) {
        setVariants([])
        return
      }
      try {
        const res = await api.get(`/admin/products?search=${searchVariant}&limit=20`)
        const productsList = res.data.data || res.data
        const flatVariants: any[] = []
        productsList.forEach((p: any) => {
          if (p.variants) {
            p.variants.forEach((v: any) => {
              flatVariants.push({
                ...v,
                productTitle: p.title,
                productImage: p.thumbnail,
                sku: v.sku || `SKU-${p.id.slice(-4)}-${v.color.slice(0,2)}-${v.size}`
              })
            })
          }
        })
        setVariants(flatVariants)
      } catch(e) {
        console.error("Failed to fetch variants", e)
      }
    }, 400)
    return () => clearTimeout(handler)
  }, [searchVariant])

  // Filter for variant search
  const filteredVariants = variants.filter(v =>
    v.productTitle.toLowerCase().includes(searchVariant.toLowerCase()) ||
    v.sku.toLowerCase().includes(searchVariant.toLowerCase()) ||
    v.color.toLowerCase().includes(searchVariant.toLowerCase())
  ).slice(0, 5) // limit to 5 results to keep UI clean

  function addVariantToOrder(variant: any) {
    // Check if already added
    if (orderItems.some(i => i.variantId === variant.id)) {
      Swal.fire({ text: "This variant is already in the order.", confirmButtonColor: "#18181b" })
      return
    }

    setOrderItems([...orderItems, {
      variantId: variant.id,
      quantity: 1,
      unitCost: variant.price || 0,
      variantInfo: variant
    }])
    setSearchVariant("")
  }

  function updateOrderItem(variantId: string, field: string, value: number) {
    setOrderItems(prev => prev.map(item =>
      item.variantId === variantId ? { ...item, [field]: value } : item
    ))
  }

  function removeOrderItem(variantId: string) {
    setOrderItems(prev => prev.filter(i => i.variantId !== variantId))
  }

  async function handleSubmit() {
    if (!supplierId) {
      Swal.fire({ text: "Please select a supplier.", confirmButtonColor: "#18181b" })
      return
    }

    if (orderItems.length === 0) {
      Swal.fire({ text: "Please add at least one item to the purchase order.", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        supplierId: supplierId,
        status: 'ORDERED',
        items: orderItems.map(i => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitCost: i.unitCost
        })),
        notes: "Created via Admin Portal"
      }

      await api.post("/admin/purchases", payload)

      router.push("/admin/purchases")
      router.refresh()
    } catch (error) {
      console.error("Failed to create PO", error)
      Swal.fire({ text: "An error occurred while generating the Purchase Order.", confirmButtonColor: "#18181b", icon: "error" })
      setSubmitting(false)
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!newSupplier.name) return
    try {
      setCreatingSupplier(true)
      const res = await api.post("/admin/suppliers", newSupplier)
      setSuppliers(prev => [...prev, res.data])
      setSupplierId(res.data.id)
      setIsSupplierModalOpen(false)
      setNewSupplier({ name: "", email: "", phone: "", address: "" })
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to create supplier", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setCreatingSupplier(false)
    }
  }

  const totalCost = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-foreground mb-4" />
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Loading procurement tools...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-2 space-y-3">

          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Existing Supplier</Label>
                  <div className="flex gap-2">
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">-- Choose a supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => setIsSupplierModalOpen(true)}
                      className="shrink-0"
                      title="Add New Supplier"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ITEM SELECTION */}
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground border-b border-border pb-3">
                <Plus className="w-4 h-4 text-emerald-500" />
                2. Add Variants to Order
              </div>

              {/* SEARCH */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search variants to add..."
                  value={searchVariant}
                  onChange={(e) => setSearchVariant(e.target.value)}
                  className="pl-9"
                />

                {/* SEARCH RESULTS DROPDOWN */}
                {searchVariant && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                    {filteredVariants.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground font-medium uppercase">No variants found</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredVariants.map(v => (
                          <div
                            key={v.id}
                            onClick={() => addVariantToOrder(v)}
                            className="p-3 hover:bg-muted/50 flex items-center gap-3 group transition cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0">
                              {v.productImage && <img src={v.productImage} className="w-full h-full object-cover" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{v.productTitle}</p>
                              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase mt-0.5">
                                <span>{v.sku}</span> • <span>{v.color} / {v.size}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ORDER ITEMS LIST */}
              {orderItems.length > 0 && (
                <div className="mt-6 border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="text-xs font-semibold text-foreground">{item.variantInfo.productTitle}</div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">{item.variantInfo.color} / {item.variantInfo.size}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(item.variantId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm z-10">{baseCurrency.symbol}</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => updateOrderItem(item.variantId, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-24 h-8 pl-6"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOrderItem(item.variantId)}
                              className="text-muted-foreground hover:text-destructive"
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

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest border-b border-primary-foreground/20 pb-3">Order Summary</h3>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/60 font-medium">Total Variants</span>
                  <span className="font-semibold">{orderItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-primary-foreground/60 font-medium">Total Units</span>
                  <span className="font-semibold">{totalUnits}</span>
                </div>

                <div className="pt-4 border-t border-primary-foreground/20 flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/60">Est. Cost</span>
                  <span className="text-xl font-semibold text-primary-foreground">{formatBasePrice(totalCost)}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || orderItems.length === 0}
                className="w-full mt-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Finalize Order</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ADD SUPPLIER MODAL */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSupplier} className="space-y-5">
            <div>
              <Label className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Company Name *</Label>
              <Input
                type="text"
                required
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="E.g. Nexus Textiles Ltd."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                <Input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  placeholder="contact@nexus.com"
                />
              </div>
              <div>
                <Label className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                <Input
                  type="text"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Physical Address</Label>
              <Textarea
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                rows={3}
                className="resize-none"
                placeholder="123 Industrial Parkway..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setIsSupplierModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={creatingSupplier}
              >
                {creatingSupplier ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Add Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
