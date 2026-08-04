"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Edit, Trash2, Layers, Image, CheckCircle, HelpCircle, Loader2, Eye, X, AlertTriangle, Gift } from "lucide-react"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

type Product = {
  id: string
  title: string
  thumbnail: string
  basePrice: number
  category?: {
    id: string
    name: string
    slug?: string
  }
  brand?: {
    id: string
    name: string
  } | null
  sizeChart?: string | null
  variants?: Array<{
    id: string
    stock: number
  }>
}

type CategoryNode = { id: string; name: string; children?: CategoryNode[] }
type CategoryOption = { id: string; name: string; depth: number }

/**
 * The categories endpoint returns roots with their children nested, but a
 * product is filed against a leaf — so every level has to be selectable.
 */
function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenCategories(node.children || [], depth + 1),
  ])
}

/**
 * Indents a nested category inside a native <select>. Options render plain
 * text only, so the depth cue has to be characters: non-breaking spaces
 * (regular ones collapse in some browsers) and a U+21B3 arrow on every child.
 */
function categoryOptionLabel({ name, depth }: CategoryOption) {
  if (depth === 0) return name
  return `${"\u00A0".repeat((depth - 1) * 4)}\u21B3\u00A0${name}`
}

export default function ProductTable({ categorySlug }: { categorySlug?: string }) {
  const { formatBasePrice } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // DETAILS MODAL STATE
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  // DELETE MODAL STATE
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // SEARCH & FILTER STATE
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")

  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const itemsPerPage = 20

  // RESET PAGE ON FILTER CHANGE
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, brandFilter])

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<{id: string, name: string}[]>([])

  // FETCH FILTERS
  async function fetchFilters() {
    try {
      const [catRes, brandRes] = await Promise.all([
        api.get("/admin/categories"),
        api.get("/admin/brands")
      ])
      setCategories(flattenCategories(catRes.data))
      setBrands(brandRes.data)
    } catch (error) {
      console.log("Error fetching filters", error)
    }
  }

  // FETCH PRODUCTS
  async function fetchProducts() {
    try {
      setLoading(true)
      // Built with URLSearchParams so an "&" or "#" typed into search can't
      // truncate the rest of the query.
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        search: searchQuery,
        categoryId: categoryFilter,
        brandId: brandFilter,
        categorySlug: categorySlug || "",
      })
      const res = await api.get(`/admin/products?${params.toString()}`)
      setProducts(res.data.data || res.data)
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages)
        setTotalRecords(res.data.meta.total)
      }
    } catch (error) {
      console.log("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts()
    }, 500)
    return () => clearTimeout(handler)
  }, [currentPage, searchQuery, categoryFilter, brandFilter, categorySlug])

  // FETCH PRODUCT DETAILS FOR MODAL
  async function showDetails(id: string) {
    try {
      setModalLoading(true)
      setIsModalOpen(true)
      const res = await api.get(`/admin/products/${id}`)
      setSelectedProduct(res.data)
    } catch (error) {
      console.error("Error fetching product details:", error)
      Swal.fire({ text: "Failed to load product details.", confirmButtonColor: "#18181b", icon: "error" })
      setIsModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }

  // CONFIRM AND DELETE PRODUCT
  async function confirmDeleteProduct() {
    if (!deleteProductId) return
    try {
      setIsDeleting(true)
      await api.delete(`/admin/products/${deleteProductId}`)
      await fetchProducts()
      setDeleteProductId(null)
    } catch (error) {
      console.log("Delete failed:", error)
      Swal.fire({ text: "Failed to delete product. It may have active constraints.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    fetchFilters()
  }, [])

  // FILTERING HANDLED BY SERVER
  const hasActiveFilter = !!(searchQuery || categoryFilter || brandFilter)

  return (
    <div className="space-y-4">
      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center gap-3 pb-2">
        <div className="relative w-full max-w-[240px]">
           <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground cursor-pointer min-w-[140px]"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>
              {categoryOptionLabel(c)}
            </option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground cursor-pointer min-w-[120px]"
        >
          <option value="">All Brands</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-foreground mb-4" />
          <span className="text-muted-foreground font-medium text-sm">Loading curated catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center">
          <Layers className="text-muted-foreground/40 w-16 h-16 mb-4 animate-pulse" />
          <h3 className="text-xl font-semibold text-foreground">
            {hasActiveFilter ? "No products found" : "Inventory is empty"}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {hasActiveFilter
              ? "No products match your search or filters. Try adjusting or clearing them."
              : "Get started by adding your first premium design product using the button above."}
          </p>
        </div>
      ) : (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground text-xs uppercase tracking-widest">
                  <TableHead className="pl-4 font-semibold">Product Info</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Inventory status</TableHead>
                  <TableHead className="font-semibold">Base Price</TableHead>
                  <TableHead className="font-semibold text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
              {products.map((product) => {
                const variantCount = product.variants?.length || 0
                const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0

                return (
                  <TableRow
                    key={product.id}
                    className="group"
                  >
                    {/* INFO CELL */}
                    <TableCell className="py-4 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center transition duration-300">
                          <img
                            src={product.thumbnail}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground text-sm truncate max-w-[200px] md:max-w-xs">
                            {product.title}
                          </h3>

                          <div className="flex flex-wrap gap-1.5 items-center">
                            {/* CATEGORY TAG */}
                            {product.category && (
                              <Badge variant="secondary" className="text-[9px] uppercase tracking-wider">
                                {product.category.name}
                              </Badge>
                            )}

                            {/* BRAND TAG */}
                            {product.brand && (
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                                {product.brand.name}
                              </Badge>
                            )}

                            {/* SIZE CHART PRESENT pill */}
                            {product.sizeChart ? (
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider border-emerald-200 bg-emerald-50 text-emerald-600 gap-0.5">
                                <CheckCircle size={8} />
                                Chart
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground gap-0.5">
                                <HelpCircle size={8} />
                                No Chart
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* INVENTORY CELL */}
                    <TableCell className="py-4 hidden md:table-cell">
                      {categorySlug === 'gift-cards' || product.category?.slug === 'gift-cards' || product.category?.name === 'Gift Cards' ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-foreground font-semibold">
                            <Gift size={12} className="text-amber-500" />
                            <span>Digital Product</span>
                          </div>
                          <span className="text-[10px] font-semibold uppercase text-emerald-500">
                            Always in stock
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-foreground font-semibold">
                            <Layers size={12} className="text-muted-foreground" />
                            <span>{variantCount} Variants</span>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase ${totalStock > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {totalStock > 0 ? `${totalStock} Units in stock` : "Out of Stock"}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* PRICE CELL */}
                    <TableCell className="py-4 font-semibold text-foreground font-mono tracking-tight text-sm">
                      {formatBasePrice(product.basePrice)}
                    </TableCell>

                    {/* ACTIONS CELL */}
                    <TableCell className="py-4 text-right pr-4">
                      <div className="inline-flex gap-2 items-center">
                        {/* VIEW DETAILS ACTION */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => showDetails(product.id)}
                        >
                          <Eye size={14} />
                        </Button>

                        {/* EDIT ACTION */}
                        <Button asChild variant="outline" size="icon">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                          >
                            <Edit size={14} />
                          </Link>
                        </Button>

                        {/* DELETE ACTION */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProductId(product.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </CardContent>
      </Card>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 px-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Showing Page {currentPage} of {totalPages} ({totalRecords} total products)
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* DETAILED OVERLAY SPEC MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative space-y-6">

            {/* CLOSE TRIGGER */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setIsModalOpen(false)
                setSelectedProduct(null)
              }}
              className="absolute top-4 right-4 rounded-full"
            >
              <X size={14} />
            </Button>

            {modalLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-foreground mb-3" />
                <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Loading Spec Sheets...</span>
              </div>
            ) : selectedProduct ? (
              <div className="space-y-6">

                {/* HEADER SECTION */}
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {selectedProduct.category && (
                      <Badge className="text-[9px] uppercase tracking-widest">
                        {selectedProduct.category.name}
                      </Badge>
                    )}
                    {selectedProduct.brand && (
                      <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                        {selectedProduct.brand.name}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-foreground">{selectedProduct.title}</h2>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{selectedProduct.slug}</p>
                </div>

                {/* DETAILS CONTENT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* LEFT: GALLERY & IMAGES */}
                  <div className="space-y-4">
                    <div className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      <img
                        src={selectedProduct.thumbnail}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover animate-fadeIn"
                      />
                    </div>

                    {/* PHOTO GALLERY */}
                    {selectedProduct.images && selectedProduct.images.length > 0 && (
                      <div>
                        <h4 className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mb-2">Gallery Assets</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {selectedProduct.images.map((img: any, idx: number) => (
                            <div key={idx} className="aspect-square rounded-md overflow-hidden border border-border bg-muted relative">
                              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />
                              {img.color && (
                                <span className="absolute bottom-0.5 left-0.5 right-0.5 text-[7px] font-semibold uppercase bg-foreground/80 text-background py-0.5 px-1 rounded text-center truncate backdrop-blur-sm">
                                  {img.color}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: SPECS, STOCK VARIANTS & SIZE CHART */}
                  <div className="space-y-5">
                    {/* BASE PRICE */}
                    <div className="bg-muted/50 border border-border p-3.5 rounded-lg flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Base Value</span>
                      <span className="font-mono text-sm font-semibold text-foreground">{formatBasePrice(selectedProduct.basePrice)}</span>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="space-y-1.5">
                      <h4 className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Narrative Story</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border">
                        {selectedProduct.description || "No description provided."}
                      </p>
                    </div>

                    {/* STOCK VARIANTS */}
                    <div className="space-y-2">
                      <h4 className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Stock Options ({selectedProduct.variants?.length || 0})</h4>
                      {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                        <div className="max-h-36 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-card">
                          {selectedProduct.variants.map((v: any, idx: number) => (
                            <div key={idx} className="p-2 flex items-center justify-between text-[11px] font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-foreground text-background rounded text-[8px] font-semibold uppercase">{v.size}</span>
                                <span className="text-foreground font-semibold">{v.color}</span>
                                {v.length && (
                                  <span className="px-1 py-0.5 bg-muted border border-border text-muted-foreground rounded text-[9px] font-medium">{v.length}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-muted-foreground text-[9px] font-medium">{v.sku}</span>
                                <span className={`font-semibold ${v.stock > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {v.stock} units
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No variants added to this product.</p>
                      )}
                    </div>

                    {/* SIZE CHART PREVIEW */}
                    {selectedProduct.sizeChart && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Size Chart Guide</h4>
                        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-border bg-muted relative group">
                          <img src={selectedProduct.sizeChart} alt="Size Chart Guide" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteProductId && (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
            {/* Warning Header Banner */}
            <div className="bg-rose-50 border-b border-rose-100 p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-rose-200">
                <AlertTriangle size={28} className="stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-semibold text-rose-900 tracking-tight">Destructive Action</h3>
              <p className="text-xs text-rose-700 mt-1">This operation cannot be undone.</p>
            </div>

            {/* Warning Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you absolutely sure you want to permanently delete this product? The following associated data will also be <strong className="text-foreground font-semibold">permanently destroyed</strong>:
              </p>

              <ul className="text-xs text-muted-foreground space-y-2 bg-muted p-4 rounded-lg border border-border">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-semibold mt-0.5">•</span>
                  <span>All product <strong>Variants</strong> (Sizes, Colors, SKUs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-semibold mt-0.5">•</span>
                  <span>All uploaded <strong>Gallery Images</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-semibold mt-0.5">•</span>
                  <span>Active items inside <strong>User Carts & Wishlists</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-semibold mt-0.5">•</span>
                  <span>Customer <strong>Reviews</strong> and <strong>Inventory Logs</strong></span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-border bg-muted flex items-center gap-3 justify-end">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setDeleteProductId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={confirmDeleteProduct}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete Product"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
