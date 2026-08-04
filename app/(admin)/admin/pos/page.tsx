"use client"

import { useEffect, useState, useRef } from "react"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Users,
  CreditCard,
  DollarSign,
  Printer,
  CheckCircle,
  X,
  Package,
  Sparkles,
  Loader2,
  Tag
} from "lucide-react"
import api from "@/lib/axios"
import { useSettings } from "@/providers/SettingsProvider"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";

type Variant = {
  id: string
  size: string
  color: string
  length: string | null
  sku: string
  stock: number
  price: number | null
}

type Product = {
  id: string
  title: string
  thumbnail: string
  basePrice: number
  discountPrice: number | null
  category: {
    id: string
    name: string
  }
  variants: Variant[]
}

type CartItem = {
  variantId: string
  productId: string
  title: string
  sku: string
  size: string
  color: string
  length: string | null
  quantity: number
  price: number
  thumbnail: string
  maxStock: number
}

type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
}

export default function AdminPOSPage() {
  // Data State
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const { storeName } = useSettings()
  const { baseCurrency, formatBasePrice } = useCurrency()

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [customDiscount, setCustomDiscount] = useState<number>(0)

  // Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL")

  // Customer Form State
  const [customerType, setCustomerType] = useState<"walkin" | "existing" | "new">("walkin")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")

  // Checkout Configuration State
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [paymentStatus, setPaymentStatus] = useState<string>("PAID")
  const [orderStatus, setOrderStatus] = useState<string>("DELIVERED")
  const [transactionId, setTransactionId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptDetails, setReceiptDetails] = useState<any | null>(null)

  // Quick fill customer details based on type
  useEffect(() => {
    if (customerType === "walkin") {
      setFullName("Walk-in Customer")
      setEmail("")
      setPhone("01900000000")
      setAddress("Shop Pickup")
      setSelectedCustomerId("")
    } else if (customerType === "existing") {
      setFullName("")
      setEmail("")
      setPhone("")
      setAddress("Shop Pickup")
    } else {
      setFullName("")
      setEmail("")
      setPhone("")
      setAddress("")
      setSelectedCustomerId("")
    }
  }, [customerType])

  // Populate form if existing customer is selected
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId)
    const cust = customers.find(c => c.id === customerId)
    if (cust) {
      setFullName(cust.name)
      setEmail(cust.email)
      setPhone(cust.phone || "")
      setAddress("Shop Pickup")
    }
  }

  const [customerSearch, setCustomerSearch] = useState("")

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/products?search=${searchQuery}&categoryId=${selectedCategoryId}&limit=40`)
      setProducts(res.data.data || res.data)
    } catch (error) {
      console.error("Failed to load POS catalog:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await api.get(`/admin/users?search=${customerSearch}&role=USER&limit=20`)
      setCustomers(res.data.data || res.data)
    } catch (error) {
      console.error("Failed to load customers:", error)
    }
  }

  // Initial categories load
  useEffect(() => {
    api.get("/admin/categories").then(res => setCategories(res.data)).catch(console.error)
  }, [])

  // Debounce products
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts()
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery, selectedCategoryId])

  // Debounce customers
  useEffect(() => {
    if (customerType !== "existing") return
    const handler = setTimeout(() => {
      fetchCustomers()
    }, 400)
    return () => clearTimeout(handler)
  }, [customerSearch, customerType])

  // Add Item to Cart
  const handleAddVariant = (product: Product, variant: Variant) => {
    if (variant.stock <= 0) {
      Swal.fire({ text: "This variant is currently out of stock.", confirmButtonColor: "#18181b" })
      return
    }

    const price = variant.price || product.discountPrice || product.basePrice
    const existingIndex = cart.findIndex(item => item.variantId === variant.id)

    if (existingIndex > -1) {
      const updated = [...cart]
      if (updated[existingIndex].quantity >= variant.stock) {
        Swal.fire({ text: `Cannot add more. Only ${variant.stock} items available in stock.`, confirmButtonColor: "#18181b" })
        return
      }
      updated[existingIndex].quantity += 1
      setCart(updated)
    } else {
      const newItem: CartItem = {
        variantId: variant.id,
        productId: product.id,
        title: product.title,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        length: variant.length,
        quantity: 1,
        price,
        thumbnail: product.thumbnail,
        maxStock: variant.stock
      }
      setCart([...cart, newItem])
    }
  }

  // Update Cart Quantity
  const handleUpdateQuantity = (variantId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.variantId === variantId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return null
        if (newQty > item.maxStock) {
          Swal.fire({ text: `Only ${item.maxStock} items available in stock.`, confirmButtonColor: "#18181b" })
          return item
        }
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(Boolean) as CartItem[]

    setCart(updated)
  }

  // Remove Item
  const handleRemoveItem = (variantId: string) => {
    setCart(cart.filter(item => item.variantId !== variantId))
  }

  // Cart math
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const grandTotal = Math.max(0, subtotal - customDiscount)

  // Search & Filter (Handled by server now)

  // Submit Order Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Swal.fire({ text: "Cart is empty.", confirmButtonColor: "#18181b" })
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        userId: customerType === "existing" ? selectedCustomerId : null,
        fullName: customerType === "walkin" ? "Walk-in Customer" : fullName,
        email: customerType === "walkin" ? "" : email,
        phone,
        address,
        paymentMethod,
        paymentStatus,
        status: orderStatus,
        totalAmount: grandTotal,
        items: cart.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price
        })),
        paymentDetails: transactionId ? { transactionId } : null
      }

      const res = await api.post("/admin/orders", payload)

      if (res.data.success) {
        // Success details for printing
        setReceiptDetails({
          orderId: res.data.orderId,
          customerName: customerType === "walkin" ? "Walk-in Customer" : fullName,
          customerPhone: phone || "N/A",
          customerEmail: email || "N/A",
          customerAddress: address || "Shop Pickup",
          items: [...cart],
          subtotal,
          discount: customDiscount,
          totalAmount: grandTotal,
          paymentMethod,
          paymentStatus,
          orderStatus,
          date: new Date().toLocaleString()
        })

        setShowReceipt(true)

        // Reset state
        setCart([])
        setCustomDiscount(0)
        setTransactionId("")
        if (customerType === "new") {
          setFullName("")
          setEmail("")
          setPhone("")
          setAddress("")
        }

        // Re-fetch products to update stock displays
        fetchProducts()
      }
    } catch (error: any) {
      console.error("POS Checkout failed:", error)
      Swal.fire({ text: error.response?.data?.message || "POS Transaction failed. Please check stock levels.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  // Trigger browser print
  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* Stylesheet specifically injected for beautiful thermal receipt printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* 1. Reset Next.js/Tailwind layout containers to standard vertical blocks first */
          .min-h-screen, .flex, .flex-1, .flex-col {
            min-height: 0 !important;
            height: auto !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* 2. Hide administrative layout components and modal overlays completely.
             Using highly specific selector pairs to ensure display:none overrides any .flex / .flex-col resets above! */
          aside, 
          header, 
          #pos-main-layout, 
          .no-print,
          [class*="no-print"],
          .print\:hidden,
          aside.flex,
          header.flex,
          aside.flex-col,
          header.flex-col,
          .no-print.flex,
          .no-print.flex-col,
          .print\:hidden.flex,
          .print\:hidden.flex-col,
          #pos-main-layout.flex,
          #pos-main-layout.flex-col {
            display: none !important;
          }

          /* 3. Explicitly force receipt visibility, absolute anchoring, and white background overlay */
          #pos-thermal-print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            z-index: 9999999 !important;
            background: white !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
          }

          /* 4. Reset root layout styles for clean printing */
          body, html, main, #__next {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
        }
      `}} />

      {/* RECEIPT thermal styling print modal */}
      {showReceipt && receiptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto no-print print:hidden">
          <div className="bg-white text-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-100 flex flex-col max-h-[90vh]">
            <div className="bg-zinc-950 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-400 w-5 h-5 animate-bounce" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest">Sale Successful</h3>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Order ID: #{receiptDetails.orderId.slice(0, 12)}...</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReceipt(false)} 
                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Receipt Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* THERMAL PAPER EMBEDDED WRAPPER */}
              <div 
                id="pos-thermal-receipt" 
                className="bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl p-5 font-sans shadow-inner text-xs"
              >
                {/* Header */}
                <div className="text-center pb-4 border-b border-zinc-200">
                  <h4 className="text-base font-black tracking-tighter uppercase">{storeName}</h4>
                  <p className="text-[9px] text-zinc-450 uppercase tracking-widest font-semibold mt-0.5">Luxe Retail Suite POS</p>
                  <p className="text-[9px] text-zinc-400 mt-1">{receiptDetails.date}</p>
                </div>

                {/* Meta */}
                <div className="py-3 border-b border-zinc-205 space-y-1 text-[10px] font-medium text-zinc-650">
                  <div><span className="font-bold text-zinc-800">Order Ref:</span> {receiptDetails.orderId}</div>
                  <div><span className="font-bold text-zinc-800">Customer:</span> {receiptDetails.customerName}</div>
                  {receiptDetails.customerPhone && (
                    <div><span className="font-bold text-zinc-800">Phone:</span> {receiptDetails.customerPhone}</div>
                  )}
                  <div><span className="font-bold text-zinc-800">Destination:</span> {receiptDetails.customerAddress}</div>
                </div>

                {/* Items */}
                <div className="py-3 border-b border-zinc-200 space-y-2">
                  <div className="flex text-[9px] font-black uppercase text-zinc-450 tracking-wider">
                    <span className="flex-1">Item</span>
                    <span className="w-12 text-center">Qty</span>
                    <span className="w-16 text-right">Total</span>
                  </div>

                  {receiptDetails.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex leading-tight text-zinc-800 font-semibold">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="truncate font-bold uppercase">{item.title}</div>
                        <div className="text-[9px] text-zinc-400 font-medium">
                          {item.color} · {item.size} {item.length ? `· ${item.length}` : ""}
                        </div>
                      </div>
                      <div className="w-12 text-center font-mono">x{item.quantity}</div>
                      <div className="w-16 text-right font-mono">{formatBasePrice(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Pricing totals */}
                <div className="py-3 space-y-1.5 font-semibold text-zinc-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatBasePrice(receiptDetails.subtotal)}</span>
                  </div>
                  {receiptDetails.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>POS Discount:</span>
                      <span className="font-mono">-{formatBasePrice(receiptDetails.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-black text-zinc-950">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-indigo-650">{formatBasePrice(receiptDetails.totalAmount)}</span>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="text-center pt-4 border-t border-dashed border-zinc-300 text-[9px] text-zinc-400 font-medium space-y-0.5">
                  <p className="uppercase font-bold text-zinc-500">Thank you for shopping!</p>
                  <p>Powered by {storeName} Retail Engine</p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-zinc-150 bg-zinc-50 flex gap-3 shrink-0">
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-250 text-xs font-bold text-zinc-650 hover:bg-white transition cursor-pointer"
              >
                Close Window
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-zinc-950/10"
              >
                <Printer size={14} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS LAYOUT */}
      <div id="pos-main-layout" className="max-w-[1600px] mx-auto p-1 flex flex-col lg:flex-row gap-5 h-[calc(100vh-100px)] no-print print:hidden">
        {/* LEFT COLUMN: CATALOG CONTAINER */}
        <div className="flex-1 bg-white border border-zinc-150 rounded-3xl shadow-xs p-5 flex flex-col overflow-hidden">
          {/* Header Search and categories */}
          <div className="space-y-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-zinc-950">POS Terminal</h2>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Fast Checkout Engine</p>
                </div>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products by title or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-800 transition"
                />
              </div>
            </div>

            {/* Category pills list */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200">
              <button
                onClick={() => setSelectedCategoryId("ALL")}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition shrink-0 cursor-pointer ${
                  selectedCategoryId === "ALL"
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-50 border border-zinc-200 text-zinc-650 hover:bg-zinc-100"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog grid scrollable */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-zinc-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-3" />
                <span className="text-zinc-450 text-xs font-semibold">Loading product registry...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 border flex items-center justify-center mb-3">
                  <Package className="text-zinc-300 w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-zinc-800">No matching products</h4>
                <p className="text-zinc-400 mt-1 text-[11px] max-w-xs">
                  Refine your search term or select another category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-zinc-50 border border-zinc-150 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition duration-200 group"
                  >
                    <div>
                      {/* Thumbnail & Title info */}
                      <div className="flex gap-3">
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="w-14 h-18 object-cover rounded-lg bg-white border shrink-0 group-hover:scale-[1.02] transition"
                        />
                        <div className="min-w-0">
                          <span className="text-[8px] font-black uppercase text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {product.category.name}
                          </span>
                          <h4 className="text-xs font-bold text-zinc-900 mt-1.5 truncate uppercase tracking-wide">
                            {product.title}
                          </h4>
                          <div className="mt-1 font-bold text-zinc-700">
                            {product.discountPrice ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-zinc-900 text-xs">{formatBasePrice(product.discountPrice)}</span>
                                <span className="font-mono text-zinc-405 line-through text-[10px]">{formatBasePrice(product.basePrice)}</span>
                              </div>
                            ) : (
                              <span className="font-mono text-zinc-900 text-xs">{formatBasePrice(product.basePrice)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Variants options list */}
                      <div className="mt-3.5 space-y-1.5 border-t border-zinc-200/60 pt-3">
                        <span className="block text-[8px] font-black uppercase tracking-wider text-zinc-450">Available Sizes & Colors</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {product.variants.map((variant) => {
                            const isOut = variant.stock <= 0
                            return (
                              <button
                                key={variant.id}
                                disabled={isOut}
                                onClick={() => handleAddVariant(product, variant)}
                                className={`text-[9px] font-bold px-2 py-1 rounded-lg border text-left flex items-center justify-between gap-2.5 transition shrink-0 cursor-pointer ${
                                  isOut
                                    ? "bg-zinc-100 border-zinc-200 text-zinc-400 opacity-60 cursor-not-allowed"
                                    : "bg-white border-zinc-200 text-zinc-750 hover:bg-zinc-900 hover:text-white hover:border-zinc-900"
                                }`}
                                title={`SKU: ${variant.sku}`}
                              >
                                <span className="uppercase">
                                  {variant.size} - {variant.color} {variant.length ? `(${variant.length})` : ""}
                                </span>
                                <span className={`font-mono font-bold text-[8.5px] ${
                                  variant.stock <= 3 && variant.stock > 0
                                    ? "text-amber-500"
                                    : isOut
                                    ? "text-rose-450"
                                    : "text-emerald-500"
                                }`}>
                                  [{variant.stock}]
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CART & CHECKOUT TERMINAL */}
        <div className="w-full lg:w-96 bg-zinc-900 text-white border border-zinc-800 rounded-3xl shadow-2xl p-5 flex flex-col overflow-hidden shrink-0 h-full">
          {/* Header */}
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-black tracking-widest uppercase flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-emerald-400" /> Active Checkout Cart
            </h3>
            <span className="bg-emerald-500 text-white font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>

          {/* Cart item display area */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 min-h-[150px] scrollbar-thin scrollbar-thumb-zinc-800">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center h-full">
                <Sparkles size={24} className="text-zinc-700 animate-pulse mb-2" />
                <p className="text-zinc-500 text-xs font-bold">Cart is empty.</p>
                <p className="text-zinc-650 text-[10px] mt-0.5">Click product variants to checkout items.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 space-y-3">
                {cart.map((item) => (
                  <div key={item.variantId} className="pt-3 first:pt-0 flex gap-3 items-center">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-10 h-13 object-cover rounded bg-zinc-800 border border-zinc-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate uppercase tracking-wide">
                        {item.title}
                      </p>
                      <p className="text-[8.5px] text-zinc-400 mt-0.5 uppercase">
                        {item.color} · Size: {item.size} {item.length ? `· Len: ${item.length}` : ""}
                      </p>
                      <p className="text-[9px] font-mono text-emerald-400 mt-0.5">
                        {formatBasePrice(item.price)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 border border-zinc-800 rounded-lg p-0.5 bg-zinc-950">
                      <button
                        onClick={() => handleUpdateQuantity(item.variantId, -1)}
                        className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-[10px] font-mono font-bold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.variantId, 1)}
                        className="p-1 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleRemoveItem(item.variantId)}
                      className="p-1.5 hover:bg-red-950 hover:text-red-400 text-zinc-500 rounded-lg transition cursor-pointer shrink-0"
                      title="Remove Item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Lookup & Billing controls */}
          <div className="border-t border-zinc-800 pt-3.5 space-y-3.5 shrink-0 bg-zinc-900">
            {/* Customer Lookup toggle */}
            <div className="space-y-1.5">
              <label className="block text-[8px] font-extrabold uppercase tracking-widest text-zinc-500">Customer lookup</label>
              <div className="grid grid-cols-3 gap-1 border border-zinc-800 p-0.5 rounded-lg bg-zinc-950 text-[9px] font-black tracking-wider uppercase">
                <button
                  onClick={() => setCustomerType("walkin")}
                  className={`py-1 rounded-md transition cursor-pointer ${
                    customerType === "walkin" ? "bg-zinc-900 text-white shadow" : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Walk-in
                </button>
                <button
                  onClick={() => setCustomerType("existing")}
                  className={`py-1 rounded-md transition cursor-pointer ${
                    customerType === "existing" ? "bg-zinc-900 text-white shadow" : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setCustomerType("new")}
                  className={`py-1 rounded-md transition cursor-pointer ${
                    customerType === "new" ? "bg-zinc-900 text-white shadow" : "text-zinc-500 hover:text-zinc-350"
                  }`}
                >
                  New Cust
                </button>
              </div>
            </div>

            {/* Render form conditionally */}
            {customerType === "existing" && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search by name, phone or email..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-semibold"
                />
                <div className="relative mt-1.5">
                  <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white rounded-lg pl-8.5 pr-3 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer"
                  >
                    <option value="">SELECT REGISTERED CLIENT</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {customerType !== "walkin" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Email</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Phone</label>
                  <input
                    type="text"
                    placeholder="0171XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Shipping Address</label>
                  <input
                    type="text"
                    placeholder="Dhanmondi, Dhaka"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Billing Configurations */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Pay Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-white text-[9px] font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="cash">CASH</option>
                  <option value="bkash">BKASH</option>
                  <option value="card">CARD</option>
                  <option value="cod">COD</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Payment</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-white text-[9px] font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Pipeline</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-white text-[9px] font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Optional Tx ID */}
            {paymentMethod !== "cash" && paymentMethod !== "cod" && (
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-0.5">Transaction ID / Account Reference</label>
                <input
                  type="text"
                  placeholder="e.g. TR0928131"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg px-2.5 py-1 focus:outline-none font-mono"
                />
              </div>
            )}

            {/* Math Breakdown */}
            <div className="border-t border-zinc-800 pt-3 space-y-2 text-[10px] font-semibold text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-200">{formatBasePrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1"><Tag size={10} /> POS Custom Discount:</span>
                <div className="relative">
                  <span className="absolute left-1 top-0.5 text-[10px] text-zinc-400 font-mono">{baseCurrency.symbol}</span>
                  <input
                    type="number"
                    value={customDiscount || ""}
                    onChange={(e) => setCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                    className="bg-zinc-950 border border-zinc-850 text-white text-[10px] rounded-lg pl-4.5 pr-1.5 py-0.5 w-16 text-right focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2.5 text-xs font-black text-white">
                <span className="text-emerald-400 uppercase tracking-widest text-[9px]">Grand Total</span>
                <span className="font-mono text-emerald-400 text-sm">{formatBasePrice(grandTotal)}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3 mt-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white text-xs font-black tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Processing Checkout...
                </>
              ) : (
                <>
                  <ShoppingCart size={13} />
                  Submit POS Transaction
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY THERMAL RECEIPT (Visible only during printing) */}
      {showReceipt && receiptDetails && (
        <div id="pos-thermal-print-area" className="hidden print:block font-sans text-xs bg-white text-black p-4 w-[80mm] mx-auto border border-dashed border-zinc-350 rounded-lg">
          {/* Header */}
          <div className="text-center pb-4 border-b border-zinc-200">
            <h4 className="text-base font-black tracking-tighter uppercase">{storeName}</h4>
            <p className="text-[9px] text-zinc-450 uppercase tracking-widest font-semibold mt-0.5">Luxe Retail Suite POS</p>
            <p className="text-[9px] text-zinc-400 mt-1">{receiptDetails.date}</p>
          </div>

          {/* Meta */}
          <div className="py-3 border-b border-zinc-200 space-y-1 text-[10px] font-medium text-zinc-700">
            <div><span className="font-bold text-zinc-900">Order Ref:</span> {receiptDetails.orderId}</div>
            <div><span className="font-bold text-zinc-900">Customer:</span> {receiptDetails.customerName}</div>
            {receiptDetails.customerPhone && (
              <div><span className="font-bold text-zinc-900">Phone:</span> {receiptDetails.customerPhone}</div>
            )}
            <div><span className="font-bold text-zinc-900">Destination:</span> {receiptDetails.customerAddress}</div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-zinc-200 space-y-2">
            <div className="flex text-[9px] font-black uppercase text-zinc-500 tracking-wider">
              <span className="flex-1">Item</span>
              <span className="w-12 text-center">Qty</span>
              <span className="w-16 text-right">Total</span>
            </div>

            {receiptDetails.items.map((item: any, idx: number) => (
              <div key={idx} className="flex leading-tight text-zinc-850 font-bold">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="truncate font-bold uppercase">{item.title}</div>
                  <div className="text-[9px] text-zinc-450 font-semibold">
                    {item.color} · {item.size} {item.length ? `· ${item.length}` : ""}
                  </div>
                </div>
                <div className="w-12 text-center font-mono">x{item.quantity}</div>
                <div className="w-16 text-right font-mono">{formatBasePrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          {/* Pricing totals */}
          <div className="py-3 space-y-1.5 font-semibold text-zinc-700">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{formatBasePrice(receiptDetails.subtotal)}</span>
            </div>
            {receiptDetails.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>POS Discount:</span>
                <span className="font-mono">-{formatBasePrice(receiptDetails.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-black text-zinc-950">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-indigo-700">{formatBasePrice(receiptDetails.totalAmount)}</span>
            </div>
          </div>

          {/* Footer notes */}
          <div className="text-center pt-4 border-t border-dashed border-zinc-300 text-[9px] text-zinc-400 font-medium space-y-0.5">
            <p className="uppercase font-bold text-zinc-500">Thank you for shopping!</p>
            <p>Powered by {storeName} Retail Engine</p>
          </div>
        </div>
      )}
    </>
  )
}
