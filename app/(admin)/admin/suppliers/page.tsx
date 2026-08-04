"use client"

import { useState, useEffect } from "react"
import {
  Truck,
  Search,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Save,
  Mail,
  Phone,
  MapPin
} from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
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
  TableCell
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle
} from "@/components/ui/dialog"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Form State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  })

  async function fetchSuppliers() {
    try {
      setLoading(true)
      const res = await api.get("/admin/suppliers")
      setSuppliers(res.data)
    } catch (error) {
      console.error("Failed to load suppliers", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.toLowerCase().includes(search.toLowerCase()))
  )

  function openCreateModal() {
    setEditingId(null)
    setFormData({ name: "", email: "", phone: "", address: "" })
    setIsModalOpen(true)
  }

  function openEditModal(supplier: any) {
    setEditingId(supplier.id)
    setFormData({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || ""
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name) {
      Swal.fire({ text: "Supplier name is required", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)
      if (editingId) {
        await api.put(`/admin/suppliers/${editingId}`, formData)
      } else {
        await api.post("/admin/suppliers", formData)
      }
      setIsModalOpen(false)
      await fetchSuppliers()
    } catch (error) {
      console.error("Failed to save supplier", error)
      Swal.fire({ text: "An error occurred while saving the supplier.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!(await confirmDelete(`Are you sure you want to delete supplier "${name}"? This action cannot be undone.`))) return
    try {
      await api.delete(`/admin/suppliers/${id}`)
      await fetchSuppliers()
    } catch (error) {
      console.error("Failed to delete supplier", error)
      Swal.fire({ text: "Failed to delete supplier.", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2 relative">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary text-primary-foreground rounded-xl">
              <Truck size={24} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Suppliers Directory
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Manage your vendor network, contact details, and procurement partners.
          </p>
        </div>

        <Button onClick={openCreateModal} className="shrink-0">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* SEARCH + LIST */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* LIST */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Details</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Loading Suppliers...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center">
                      <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">No Suppliers Found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <TableRow key={supplier.id}>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted text-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                            {supplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{supplier.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">ID: {supplier.id.slice(-6)}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {supplier.email || <span className="italic opacity-70">Not provided</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {supplier.phone || <span className="italic opacity-70">Not provided</span>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="max-w-[200px] truncate">{supplier.address || <span className="italic opacity-70">Not provided</span>}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditModal(supplier)}
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier.id, supplier.name)}
                            title="Delete Supplier"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Supplier" : "Add New Supplier"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="supplier-name">Company Name *</Label>
              <Input
                id="supplier-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="E.g. Nexus Textiles Ltd."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Email Address</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@nexus.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-phone">Phone Number</Label>
                <Input
                  id="supplier-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-address">Physical Address</Label>
              <Textarea
                id="supplier-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? "Save Changes" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
