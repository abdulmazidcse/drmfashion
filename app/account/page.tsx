"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  User, ShoppingBag, MapPin, Compass, ArrowRight, CheckCircle,
  ChevronDown, LogOut, Mail, Search, AlertCircle, CheckCircle2,
  Lock, Eye, EyeOff, UserPlus, Phone, RefreshCw, FileText, XCircle,
  KeyRound, ArrowLeft, ShieldCheck, Gift, Heart, Truck, Ruler,
  Sparkles, Wallet, ChevronRight, Headphones,
} from "lucide-react"
import Header from "@/components/HeaderClient"
import Footer from "@/components/Footer"
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google"
import Swal from "@/lib/swal";
import { useCurrency } from "@/providers/CurrencyProvider"
import { useSettings } from "@/providers/SettingsProvider"
import { getWishlist } from "@/lib/wishlist"

type OrderItem = {
  id: string; quantity: number; price: number
  productTitle: string; thumbnail: string; color: string; size: string; length: string | null
  isCustom?: boolean
  customFee?: number
  customMeasurements?: {
    templateName: string
    values: { key: string; label: string; value: number; unit: string }[]
  } | null
}

type Order = {
  id: string; totalAmount: number; status: string
  paymentStatus: string; shippingAddress: string; shippingPhone: string
  currencyCode?: string; currencySymbol?: string; exchangeRate?: number
  createdAt: string; items: OrderItem[]
}

function formatOrderPrice(ord: { currencySymbol?: string; exchangeRate?: number } | null | undefined, usdPrice: number) {
  const symbol = ord?.currencySymbol || "$"
  const rate = ord?.exchangeRate || 1.0
  const converted = usdPrice * rate
  return `${symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type CustomerProfile = { id: string; name: string; email: string; phone: string }

// ─── Auth Mode ───────────────────────────────────────────────────────────────
type AuthMode = "login" | "register" | "forgot"
type ForgotStep = "email" | "otp" | "reset"

/** Why an account is worth creating — shown beside the sign-in card. */
const MEMBER_BENEFITS = [
  { icon: Gift, title: "Earn reward points", desc: "Collect points on every completed order and spend them on the next one." },
  { icon: Truck, title: "Track every delivery", desc: "Live status of each parcel, plus invoices you can download any time." },
  { icon: Ruler, title: "Your fit profile", desc: "Save the sizes and lengths that fit, so reordering takes seconds." },
  { icon: Heart, title: "Wishlist that follows you", desc: "Keep what you love in one place and get a nudge when it's back in stock." },
]

function AccountPageContent({ clientId }: { clientId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Order totals are stored in the store's base currency, so every figure on this
  // page stays in that currency — mixing it with the visitor's currency would make
  // the totals look like they disagree with the orders listed underneath.
  const { formatBasePrice, baseCurrency } = useCurrency()
  /** Whole-currency amount — reward thresholds read better without decimals. */
  const formatRounded = (basePrice: number) =>
    `${baseCurrency?.symbol || "$"}${Math.round(basePrice).toLocaleString("en-US")}`
  const { settings, storeName } = useSettings()

  const [mounted, setMounted] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Login form
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")

  // Register form
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPhone, setRegPhone] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState("")
  const [regSuccess, setRegSuccess] = useState("")

  // Forgot-password flow
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotOtp, setForgotOtp] = useState("")
  const [forgotNewPassword, setForgotNewPassword] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [forgotInfo, setForgotInfo] = useState("")

  const resetForgotState = () => {
    setForgotStep("email"); setForgotEmail(""); setForgotOtp("")
    setForgotNewPassword(""); setShowForgotPassword(false)
    setForgotError(""); setForgotInfo("")
  }

  // Dashboard state
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [dashLoading, setDashLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "track">("orders")
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("")

  // Loyalty / cross-sell
  const [rewardPoints, setRewardPoints] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)

  // Order cancel & return state
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null)
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null)
  const [returnReason, setReturnReason] = useState("")
  const [submittingReturn, setSubmittingReturn] = useState(false)

  // Track state
  const [trackOrderId, setTrackOrderId] = useState("")
  const [trackingOrder, setTrackingOrder] = useState<any>(null)
  const [trackingStages, setTrackingStages] = useState<any[]>([])
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackingError, setTrackingError] = useState("")

  // ── Check login status on mount ─────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const savedSession = localStorage.getItem("ag_customer_session")
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        setProfile(parsed)
        setIsLoggedIn(true)
        fetchOrders(parsed.email)
        
        const redirect = searchParams.get("redirect")
        if (redirect) {
          router.push(redirect)
        }
      } catch {}
    }
    const urlOrderId = searchParams.get("track")
    if (urlOrderId) {
      setTrackOrderId(urlOrderId)
      setActiveTab("track")
      handleTrackOrder(urlOrderId)
    } else {
      // Deep links such as /account?tab=profile
      const urlTab = searchParams.get("tab")
      if (urlTab === "track" || urlTab === "profile" || urlTab === "orders") {
        setActiveTab(urlTab)
      }
    }
  }, [searchParams])

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      localStorage.setItem("ag_customer_session", JSON.stringify(data.user))
      localStorage.setItem("customer-email", data.user.email)
      setProfile(data.user)
      setEditName(data.user.name)
      setEditPhone(data.user.phone || "")
      setIsLoggedIn(true)
      await fetchOrders(data.user.email)

      const redirect = searchParams.get("redirect")
      if (redirect) {
        router.push(redirect)
      }
    } catch (err: any) {
      setLoginError(err.message || "Login failed. Please try again.")
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Google Login ────────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoginError("")
    setRegError("")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/auth/customer/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      localStorage.setItem("ag_customer_session", JSON.stringify(data.user))
      localStorage.setItem("customer-email", data.user.email)
      setProfile(data.user)
      setEditName(data.user.name)
      setEditPhone(data.user.phone || "")
      setIsLoggedIn(true)
      await fetchOrders(data.user.email)

      const redirect = searchParams.get("redirect")
      if (redirect) {
        router.push(redirect)
      }
    } catch (err: any) {
      setLoginError(err.message || "Google login failed. Please try again.")
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Register ────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError("")
    setRegSuccess("")
    setRegLoading(true)
    try {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone, password: regPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setRegSuccess("Account created! Please login now.")
      setTimeout(() => { setAuthMode("login"); setLoginEmail(regEmail); setRegSuccess("") }, 2000)
    } catch (err: any) {
      setRegError(err.message || "Registration failed.")
    } finally {
      setRegLoading(false)
    }
  }

  // ── Forgot password: request OTP ──────────────────────────────────────────────
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(""); setForgotInfo("")
    setForgotLoading(true)
    try {
      const res = await fetch("/api/auth/customer/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setForgotInfo(data.message || "If an account exists, a code has been sent.")
      setForgotStep("otp")
    } catch (err: any) {
      setForgotError(err.message || "Failed to send reset code.")
    } finally {
      setForgotLoading(false)
    }
  }

  // ── Forgot password: verify OTP ───────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(""); setForgotInfo("")
    setForgotLoading(true)
    try {
      const res = await fetch("/api/auth/customer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setForgotStep("reset")
    } catch (err: any) {
      setForgotError(err.message || "Invalid code.")
    } finally {
      setForgotLoading(false)
    }
  }

  // ── Forgot password: set new password ─────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(""); setForgotInfo("")
    setForgotLoading(true)
    try {
      const res = await fetch("/api/auth/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, password: forgotNewPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      // Success → back to login with email prefilled
      setLoginEmail(forgotEmail)
      resetForgotState()
      setAuthMode("login")
      setLoginError("")
      Swal.fire({ text: "Password reset successfully. Please sign in with your new password.", confirmButtonColor: "#18181b", icon: "success" })
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password.")
    } finally {
      setForgotLoading(false)
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await fetch("/api/auth/customer/logout", { method: "POST" })
    localStorage.removeItem("ag_customer_session")
    localStorage.removeItem("customer-email")
    setIsLoggedIn(false)
    setProfile(null)
    setOrders([])
  }

  // ── Fetch orders ─────────────────────────────────────────────────────────────
  const fetchOrders = async (email: string) => {
    setDashLoading(true)
    try {
      const res = await fetch(`/api/customer/account?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.found) {
        setOrders(data.orders || [])
        setEditName(data.user.name)
        setEditPhone(data.user.phone || "")
      }
    } catch { }
    // Loyalty balance is a separate endpoint — never block the order list on it.
    try {
      const res = await fetch(`/api/customer/reward-points?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setRewardPoints(Number(data.rewardPoints) || 0)
    } catch { }
    setWishlistCount(getWishlist().length)
    setDashLoading(false)
  }

  // ── Update profile ──────────────────────────────────────────────────────────
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)
    setProfileSuccessMsg("")
    try {
      const res = await fetch("/api/customer/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile?.email, name: editName, phone: editPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const updated = { ...profile!, name: editName, phone: editPhone }
      setProfile(updated)
      localStorage.setItem("ag_customer_session", JSON.stringify(updated))
      setProfileSuccessMsg("Profile updated successfully!")
      setTimeout(() => setProfileSuccessMsg(""), 3000)
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to update profile.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setUpdatingProfile(false)
    }
  }

  // ── Cancel order ────────────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId: string) => {
    if (!(await Swal.fire({ title: "Are you sure?", text: "Are you sure you want to cancel this order?", icon: "warning", showCancelButton: true, confirmButtonColor: "#18181b", cancelButtonColor: "#ef4444", confirmButtonText: "Yes" })).isConfirmed) return
    setCancellingOrder(orderId)
    try {
      const res = await fetch(`/api/customer/orders/${orderId}/cancel`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      Swal.fire({ text: "Order cancelled successfully.", confirmButtonColor: "#18181b", icon: "success" })
      if (profile) await fetchOrders(profile.email)
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to cancel order.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setCancellingOrder(null)
    }
  }

  // ── Submit return ─────────────────────────────────────────────────────────────
  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) { Swal.fire({ text: "Please enter a reason for the return.", confirmButtonColor: "#18181b" }); return }
    setSubmittingReturn(true)
    try {
      const res = await fetch("/api/customer/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: returnOrderId, userId: profile?.id, reason: returnReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      Swal.fire({ text: "Return request submitted successfully. We'll review it shortly.", confirmButtonColor: "#18181b", icon: "success" })
      setReturnOrderId(null)
      setReturnReason("")
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to submit return request.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmittingReturn(false)
    }
  }

  // ── Track order ─────────────────────────────────────────────────────────────
  const handleTrackOrder = async (id?: string) => {
    const orderId = id || trackOrderId
    if (!orderId) { setTrackingError("Please enter an Order ID."); return }
    setTrackingLoading(true)
    setTrackingError("")
    setTrackingOrder(null)
    try {
      const res = await fetch(`/api/customer/track?orderId=${encodeURIComponent(orderId)}`)
      const data = await res.json()
      if (!res.ok || !data.found) throw new Error(data.message || "Order not found.")
      setTrackingOrder(data.order)
      setTrackingStages(data.stages)
    } catch (err: any) {
      setTrackingError(err.message)
    } finally {
      setTrackingLoading(false)
    }
  }

  // ── Derived dashboard figures ───────────────────────────────────────────────
  const activeOrders = orders.filter(o => ["PENDING", "PROCESSING", "SHIPPED"].includes(o.status)).length
  // Order totals are stored in the base currency; the currency provider handles display.
  const lifetimeSpend = orders.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const pointValue = Number(settings["reward_point_value"] || 1)
  const earnRate = Number(settings["reward_point_earn_rate"] || 10)
  // editPhone comes from the freshly fetched profile; the stored session can be stale.
  const profileComplete = Boolean((editPhone || profile?.phone || "").trim())

  if (!mounted) return <div className="min-h-screen bg-cream flex items-center justify-center"><div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" /></div>

  return (
    <div className="flex flex-col min-h-screen bg-cream/60 text-foreground font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">

        {/* ── AUTH PORTAL ─────────────────────────────────────────────────────── */}
        {!isLoggedIn ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

            {/* Membership value proposition */}
            <section className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-brand-ink text-white rounded-sg-lg p-8 md:p-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soft mb-4">
                  {storeName} Members
                </p>
                <h2 className="text-2xl md:text-[32px] font-extrabold uppercase tracking-tight leading-[1.1]">
                  Built for you.<br />Better with an account.
                </h2>
                <p className="text-sm text-faint mt-5 leading-relaxed max-w-md">
                  Everything you buy, track and save stays in one place — and every order earns you
                  something back.
                </p>

                <ul className="mt-9 space-y-6">
                  {MEMBER_BENEFITS.map((benefit) => {
                    const Icon = benefit.icon
                    return (
                      <li key={benefit.title} className="flex gap-4">
                        <div className="w-9 h-9 shrink-0 border border-brand-ink-line rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wide">{benefit.title}</h3>
                          <p className="text-[13px] text-faint mt-1 leading-relaxed">{benefit.desc}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-9 pt-7 border-t border-brand-ink-line flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <p className="text-[13px] text-faint leading-relaxed">
                    Earn <span className="text-white font-bold">1 point for every {formatRounded(earnRate)}</span> you
                    spend — redeem them straight off your next order.
                  </p>
                </div>
              </div>

              <div className="mt-4 border border-line rounded-sg p-5 flex items-start gap-3 bg-white">
                <Compass className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <p className="text-[13px] text-soft leading-relaxed">
                  Only want to check a delivery? You don&apos;t need an account —{" "}
                  <Link href="/track-order" className="font-bold text-foreground underline underline-offset-2 hover:text-soft">
                    track your order here
                  </Link>.
                </p>
              </div>
            </section>

            {/* Auth card */}
            <section className="lg:col-span-6 order-1 lg:order-2">
            <div className="sg-card sg-raise p-6 sm:p-8 md:p-10 max-w-[520px] lg:ml-auto">
              <div className="mb-8">
                <h1 className="text-[28px] font-extrabold text-foreground">
                  {authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account" : "Reset Password"}
                </h1>
                <p className="text-soft text-sm mt-2">
                  {authMode === "login"
                    ? "Welcome back — pick up where you left off."
                    : authMode === "register"
                    ? "Takes under a minute, and your first order starts earning points."
                    : "We'll email you a one-time code to reset your password."}
                </p>
              </div>

              {/* Tab Toggle (hidden during password reset) */}
              {authMode !== "forgot" && (
                <div className="flex sg-card rounded-full p-1.5 mb-7">
                  <button onClick={() => { setAuthMode("login"); setLoginError(""); setRegError(""); setRegSuccess("") }} className={`flex-1 py-3 text-[12.5px] font-bold uppercase tracking-[0.12em] transition-colors ${authMode === "login" ? "bg-brand-600 text-white" : "bg-white text-soft hover:text-brand-700"}`}>Sign In</button>
                  <button onClick={() => { setAuthMode("register"); setLoginError(""); setRegError(""); setRegSuccess("") }} className={`flex-1 py-3 text-[12.5px] font-bold uppercase tracking-[0.12em] transition-colors ${authMode === "register" ? "bg-brand-600 text-white" : "bg-white text-soft hover:text-brand-700"}`}>Register</button>
                </div>
              )}

              {/* Login Form */}
              {authMode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  {clientId && (
                    <>
                      <div className="flex justify-center mb-2">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => setLoginError("Google login was unsuccessful.")}
                          useOneTap
                        />
                      </div>
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-line"></div>
                        <span className="flex-shrink-0 mx-4 text-faint text-[10px] uppercase font-bold tracking-[0.14em]">or sign in with email</span>
                        <div className="flex-grow border-t border-line"></div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type={showLoginPassword ? "text" : "password"} required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                      <button type="button" onClick={() => setShowLoginPassword(p => !p)} className="absolute right-3.5 top-3.5 text-faint hover:text-soft">
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <button type="button" onClick={() => { resetForgotState(); setForgotEmail(loginEmail); setAuthMode("forgot"); setLoginError("") }} className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint hover:text-brand-700 transition">
                        Forgot password?
                      </button>
                    </div>
                  </div>
                  {loginError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{loginError}</p>}
                  <button type="submit" disabled={loginLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full transition text-xs uppercase tracking-[0.14em] disabled:opacity-50 flex items-center justify-center gap-2">
                    {loginLoading ? "Signing in..." : <><ArrowRight className="w-4 h-4" /> Sign In</>}
                  </button>
                </form>
              )}

              {/* Forgot Password Form (3 steps: email → OTP → new password) */}
              {authMode === "forgot" && (
                <div className="space-y-5">
                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2">
                    {(["email", "otp", "reset"] as ForgotStep[]).map((s, i) => {
                      const order = { email: 0, otp: 1, reset: 2 }
                      const active = order[forgotStep] >= i
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition ${active ? "bg-brand-600 text-white" : "bg-cream text-faint"}`}>{i + 1}</div>
                          {i < 2 && <div className={`w-8 h-0.5 ${order[forgotStep] > i ? "bg-brand-600" : "bg-cream"}`} />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Step 1: email */}
                  {forgotStep === "email" && (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                          <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                        </div>
                      </div>
                      {forgotError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{forgotError}</p>}
                      <button type="submit" disabled={forgotLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full transition text-xs uppercase tracking-[0.14em] disabled:opacity-50 flex items-center justify-center gap-2">
                        {forgotLoading ? "Sending code..." : <><KeyRound className="w-4 h-4" /> Send Reset Code</>}
                      </button>
                    </form>
                  )}

                  {/* Step 2: OTP */}
                  {forgotStep === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      {forgotInfo && <p className="text-emerald-600 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{forgotInfo}</p>}
                      <p className="text-xs text-soft text-center">Enter the 6-digit code sent to <span className="font-bold text-foreground">{forgotEmail}</span></p>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Verification Code</label>
                        <div className="relative">
                          <ShieldCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                          <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg tracking-[0.5em] font-bold" />
                        </div>
                      </div>
                      {forgotError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{forgotError}</p>}
                      <button type="submit" disabled={forgotLoading || forgotOtp.length !== 6} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full transition text-xs uppercase tracking-[0.14em] disabled:opacity-50 flex items-center justify-center gap-2">
                        {forgotLoading ? "Verifying..." : <><ArrowRight className="w-4 h-4" /> Verify Code</>}
                      </button>
                      <button type="button" onClick={handleForgotRequest} disabled={forgotLoading} className="w-full text-[11px] font-bold uppercase tracking-[0.14em] text-faint hover:text-brand-700 transition disabled:opacity-50">
                        Resend code
                      </button>
                    </form>
                  )}

                  {/* Step 3: new password */}
                  {forgotStep === "reset" && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                          <input type={showForgotPassword ? "text" : "password"} required minLength={6} value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full pl-10 pr-10 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                          <button type="button" onClick={() => setShowForgotPassword(p => !p)} className="absolute right-3.5 top-3.5 text-faint hover:text-soft">
                            {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {forgotError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{forgotError}</p>}
                      <button type="submit" disabled={forgotLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full transition text-xs uppercase tracking-[0.14em] disabled:opacity-50 flex items-center justify-center gap-2">
                        {forgotLoading ? "Resetting..." : <><CheckCircle className="w-4 h-4" /> Reset Password</>}
                      </button>
                    </form>
                  )}

                  {/* Back to sign in */}
                  <button type="button" onClick={() => { resetForgotState(); setAuthMode("login") }} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint hover:text-brand-700 transition pt-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              )}

              {/* Register Form */}
              {authMode === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  {clientId && (
                    <>
                      <div className="flex justify-center mb-2">
                        <GoogleLogin
                          text="signup_with"
                          onSuccess={handleGoogleSuccess}
                          onError={() => setRegError("Google signup was unsuccessful.")}
                        />
                      </div>
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-line"></div>
                        <span className="flex-shrink-0 mx-4 text-faint text-[10px] uppercase font-bold tracking-[0.14em]">or register with email</span>
                        <div className="flex-grow border-t border-line"></div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="Your Name" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Phone (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+880 17XX XXXXXX" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                      <input type={showRegPassword ? "text" : "password"} required minLength={6} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Min 6 characters" className="w-full pl-10 pr-10 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg" />
                      <button type="button" onClick={() => setShowRegPassword(p => !p)} className="absolute right-3.5 top-3.5 text-faint hover:text-soft">
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {regError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{regError}</p>}
                  {regSuccess && <p className="text-emerald-600 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{regSuccess}</p>}
                  <button type="submit" disabled={regLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-full transition text-xs uppercase tracking-[0.14em] disabled:opacity-50 flex items-center justify-center gap-2">
                    {regLoading ? "Creating account..." : <><UserPlus className="w-4 h-4" /> Create Account</>}
                  </button>
                </form>
              )}

              {/* Reassurance */}
              <div className="mt-8 pt-6 border-t border-line space-y-3">
                <p className="flex items-start gap-2.5 text-[11px] text-soft leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 text-faint shrink-0 mt-0.5" />
                  Your password is encrypted and your details are never shared or sold.
                </p>
                <p className="flex items-start gap-2.5 text-[11px] text-soft leading-relaxed">
                  <Headphones className="w-3.5 h-3.5 text-faint shrink-0 mt-0.5" />
                  Trouble signing in?{" "}
                  <Link href="/pages/contact-support" className="font-bold text-soft underline underline-offset-2 hover:text-brand-700">
                    Our team can help
                  </Link>
                </p>
              </div>
            </div>
            </section>
          </div>
        ) : (
          /* ── DASHBOARD ──────────────────────────────────────────────────────── */
          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Welcome banner */}
            <div className="bg-brand-ink text-white rounded-sg-lg p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 shrink-0 bg-white text-foreground font-extrabold rounded-full flex items-center justify-center text-xl">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="sg-kicker text-brand-300 mb-1.5">My account</p>
                    <h1 className="text-[22px] md:text-[26px] font-extrabold truncate">{profile?.name}</h1>
                    <p className="text-white/60 text-[13px] mt-1 truncate">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/shop" className="inline-flex items-center gap-1.5 px-5 py-3 bg-white text-foreground rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-line transition">
                    Continue Shopping <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={handleLogout} className="inline-flex items-center gap-1.5 px-4 py-3 border border-brand-ink-line rounded-lg text-[10px] font-bold uppercase tracking-wider text-faint hover:text-white hover:border-brand-400 transition cursor-pointer">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total orders", value: String(orders.length), icon: ShoppingBag, hint: orders.length ? "All time" : "Nothing yet" },
                { label: "In progress", value: String(activeOrders), icon: Truck, hint: activeOrders ? "On the way to you" : "Nothing in transit" },
                { label: "Reward points", value: rewardPoints.toLocaleString("en-US"), icon: Gift, hint: rewardPoints > 0 ? `Worth ${formatBasePrice(rewardPoints * pointValue)}` : `Earn 1 per ${formatRounded(earnRate)}` },
                { label: "Lifetime spend", value: formatBasePrice(lifetimeSpend), icon: Wallet, hint: "Excludes cancelled orders" },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="sg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{stat.label}</p>
                      <Icon className="w-4 h-4 text-faint" />
                    </div>
                    <p className="text-[26px] font-extrabold tracking-tight text-foreground truncate">{stat.value}</p>
                    <p className="text-[11px] text-faint mt-1.5 truncate">{stat.hint}</p>
                  </div>
                )
              })}
            </div>

            {/* Profile completion nudge */}
            {!profileComplete && (
              <div className="border border-amber-200 bg-amber-50 rounded-sg p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-bold text-amber-900">Add your phone number</p>
                    <p className="text-[13px] text-amber-800/80 mt-1">Couriers call before delivery — without it your parcel can be delayed.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab("profile")} className="px-5 py-2.5 bg-brand-600 text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full hover:bg-brand-700 transition cursor-pointer">
                  Add Now
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Sidebar */}
              <div className="lg:col-span-3 space-y-4">
                <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
                  {([
                    { id: "orders", label: "My Orders", icon: ShoppingBag },
                    { id: "profile", label: "Profile", icon: User },
                    { id: "track", label: "Track Order", icon: Compass },
                  ] as const).map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 text-[14px] font-bold rounded-full transition shrink-0 cursor-pointer ${activeTab === tab.id ? "bg-brand-600 text-white" : "bg-white text-soft hover:text-brand-700 border border-line"}`}>
                      <tab.icon className="w-4 h-4" />{tab.label}
                    </button>
                  ))}
                </nav>

                {/* Rewards */}
                <div className="hidden lg:block sg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Reward points</p>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">{rewardPoints.toLocaleString("en-US")}</p>
                  <p className="text-[11px] text-soft mt-1.5 leading-relaxed">
                    {rewardPoints > 0
                      ? <>Worth <span className="font-bold text-foreground">{formatBasePrice(rewardPoints * pointValue)}</span> off your next order.</>
                      : <>Place an order to start collecting — 1 point per {formatRounded(earnRate)} spent.</>}
                  </p>
                  <Link href="/shop" className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 text-white text-[11px] font-bold uppercase tracking-[0.14em] rounded-full hover:bg-brand-700 transition">
                    <Sparkles className="w-3.5 h-3.5" /> Earn More
                  </Link>
                </div>

                {/* Quick links */}
                <div className="hidden lg:block bg-white border border-line rounded-sg divide-y divide-line overflow-hidden">
                  {[
                    { href: "/wishlist", label: "Wishlist", icon: Heart, meta: wishlistCount ? String(wishlistCount) : "" },
                    { href: "/pages/returns-exchanges", label: "Returns", icon: RefreshCw, meta: "" },
                    { href: "/pages/size-charts", label: "Size charts", icon: Ruler, meta: "" },
                    { href: "/pages/contact-support", label: "Get help", icon: Headphones, meta: "" },
                  ].map((link) => {
                    const Icon = link.icon
                    return (
                      <Link key={link.href} href={link.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream transition group">
                        <Icon className="w-4 h-4 text-faint group-hover:text-brand-700 transition-colors" />
                        <span className="text-xs font-bold text-soft group-hover:text-brand-700 flex-1">{link.label}</span>
                        {link.meta && <span className="text-[10px] font-extrabold text-faint">{link.meta}</span>}
                        <ChevronRight className="w-3.5 h-3.5 text-faint group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-9 bg-white border border-line rounded-sg p-6 md:p-8">

                {/* ── ORDERS TAB ──────────────────────────────────────────────── */}
                {activeTab === "orders" && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-line pb-5">
                      <div>
                        <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground">
                          Order History
                          {orders.length > 0 && <span className="text-faint ml-2">{orders.length}</span>}
                        </h2>
                        <p className="text-soft text-sm mt-1">Open an order for items, invoice and tracking.</p>
                      </div>
                      <button
                        onClick={() => profile && fetchOrders(profile.email)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-line rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] text-soft hover:text-brand-700 hover:border-brand-300 transition cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${dashLoading ? "animate-spin" : ""}`} /> Refresh
                      </button>
                    </div>

                    {dashLoading ? (
                      <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" /></div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-16 px-6 border border-dashed border-line rounded-2xl">
                        <ShoppingBag className="w-10 h-10 text-faint mx-auto mb-4" />
                        <p className="text-sm font-extrabold text-foreground uppercase tracking-wide">No orders yet</p>
                        <p className="text-sm text-soft mt-2 max-w-xs mx-auto">
                          Your first order earns reward points you can spend on the next one.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-6">
                          <Link href="/shop" className="bg-brand-600 text-white text-[11px] font-bold uppercase tracking-[0.14em] px-6 py-3 rounded-full hover:bg-brand-700 transition">Start Shopping</Link>
                          <Link href="/wishlist" className="border border-line text-[11px] font-bold uppercase tracking-[0.14em] px-6 py-3 rounded-lg hover:border-brand-300 transition">My Wishlist</Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map(order => {
                          const isExpanded = !!expandedOrders[order.id]
                          const date = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                          return (
                            <div key={order.id} className={`border rounded-2xl overflow-hidden transition-colors ${isExpanded ? "border-line" : "border-line"}`}>
                              <div onClick={() => setExpandedOrders(p => ({ ...p, [order.id]: !p[order.id] }))} className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer hover:bg-cream/70 transition">
                                <div className="flex items-center gap-4 min-w-0">
                                  {/* Item thumbnails preview */}
                                  <div className="hidden sm:flex -space-x-3 shrink-0">
                                    {order.items.slice(0, 3).map(item => (
                                      <div key={item.id} className="w-11 h-14 rounded-lg bg-cream border-2 border-white ring-1 ring-line overflow-hidden flex items-center justify-center">
                                        {item.thumbnail
                                          ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none" }} />
                                          : <ShoppingBag className="w-4 h-4 text-faint" />}
                                      </div>
                                    ))}
                                    {order.items.length > 3 && (
                                      <div className="w-11 h-14 rounded-lg bg-cream border-2 border-white ring-1 ring-line flex items-center justify-center text-[10px] font-extrabold text-soft">
                                        +{order.items.length - 3}
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] font-mono font-bold text-foreground">#{order.id.slice(-8).toUpperCase()}</span>
                                      <span className="text-[11px] text-faint">{date}</span>
                                    </div>
                                    <p className="text-sm font-extrabold text-foreground mt-1">{formatOrderPrice(order, order.totalAmount)}</p>
                                    <p className="text-[11px] text-faint mt-0.5">
                                      {order.items.length} item{order.items.length === 1 ? "" : "s"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded border ${order.status === "DELIVERED" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : order.status === "SHIPPED" ? "bg-blue-50 text-blue-600 border-blue-100" : order.status === "CANCELLED" ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                                    {order.status}
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-faint transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-5 space-y-5 border-t border-line">
                                  {/* Items */}
                                  <div className="space-y-3">
                                    {order.items.map(item => (
                                      <div key={item.id} className="flex gap-4 items-center">
                                        <div className="w-12 h-16 rounded-lg bg-cream border border-line overflow-hidden shrink-0">
                                          <img src={item.thumbnail} alt={item.productTitle} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-xs font-bold uppercase truncate text-foreground">{item.productTitle}</h4>
                                          <p className="text-[10px] text-faint mt-0.5">{item.color} · {item.size} {item.length ? `· ${item.length}` : ""} · Qty {item.quantity}</p>
                                          {item.isCustom && item.customMeasurements && (
                                            <p className="text-[10px] text-soft mt-1 border-l-2 border-brand-400 pl-2 leading-relaxed">
                                              <span className="font-bold uppercase tracking-wider text-foreground">Made to measure</span>
                                              {" · "}
                                              {item.customMeasurements.values.map(v => `${v.label} ${v.value}${v.unit}`).join(" · ")}
                                            </p>
                                          )}
                                        </div>
                                        <p className="text-xs font-extrabold text-foreground">{formatOrderPrice(order, item.price * item.quantity)}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Order Actions */}
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                                    <Link href={`/orders/${order.id}/invoice`} target="_blank" className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] border border-line rounded-full hover:bg-brand-600 hover:text-white hover:border-brand-600 transition">
                                      <FileText className="w-3 h-3" /> Invoice
                                    </Link>
                                    <button onClick={() => { setActiveTab("track"); setTrackOrderId(order.id); handleTrackOrder(order.id) }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] border border-line rounded-full hover:bg-brand-600 hover:text-white hover:border-brand-600 transition">
                                      <Compass className="w-3 h-3" /> Track
                                    </button>
                                    {order.status === "PENDING" && (
                                      <button onClick={() => handleCancelOrder(order.id)} disabled={cancellingOrder === order.id} className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] border border-red-200 text-red-500 rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition disabled:opacity-50">
                                        <XCircle className="w-3 h-3" /> {cancellingOrder === order.id ? "Cancelling..." : "Cancel"}
                                      </button>
                                    )}
                                    {order.status === "DELIVERED" && (
                                      <button onClick={() => setReturnOrderId(order.id)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] border border-blue-200 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 transition">
                                        <RefreshCw className="w-3 h-3" /> Return
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="border-b border-line pb-5">
                      <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground">Profile Details</h2>
                      <p className="text-soft text-sm mt-1">These details are used on your invoices and by the courier.</p>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label htmlFor="ac-name" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-soft mb-2">Full Name</label>
                          <input id="ac-name" type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-3 text-sm border border-line bg-white focus:border-aqua-400 focus:outline-none focus:ring-0 transition rounded-sg" />
                        </div>
                        <div>
                          <label htmlFor="ac-phone" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-soft mb-2">Phone</label>
                          <input id="ac-phone" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+880 17XX XXXXXX" className="w-full px-4 py-3 text-sm border border-line bg-white focus:border-aqua-400 focus:outline-none focus:ring-0 transition rounded-sg placeholder:text-faint" />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="ac-email" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-2">
                            Email <span className="font-medium normal-case tracking-normal">(cannot be changed)</span>
                          </label>
                          <input id="ac-email" type="email" disabled value={profile?.email || ""} className="w-full px-4 py-3 text-sm border border-line bg-cream text-faint cursor-not-allowed rounded-lg" />
                        </div>
                      </div>
                      {profileSuccessMsg && (
                        <p className="text-emerald-600 text-xs flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{profileSuccessMsg}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <button type="submit" disabled={updatingProfile} className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-8 rounded-full transition text-[11px] uppercase tracking-[0.14em] disabled:opacity-50 cursor-pointer">
                          {updatingProfile ? "Saving..." : "Save Changes"}
                        </button>
                        <Link href="/pages/contact-support" className="text-[12px] font-bold uppercase tracking-[0.14em] text-faint hover:text-brand-700 transition">
                          Need to change your email?
                        </Link>
                      </div>
                    </form>

                    {/* Account summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      {[
                        { label: "Reward points", value: rewardPoints.toLocaleString("en-US"), icon: Gift },
                        { label: "Orders placed", value: String(orders.length), icon: ShoppingBag },
                        { label: "Saved to wishlist", value: String(wishlistCount), icon: Heart },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <div key={item.label} className="border border-line rounded-xl p-4 flex items-center gap-3">
                            <Icon className="w-4 h-4 text-faint shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{item.label}</p>
                              <p className="text-sm font-extrabold text-foreground mt-0.5">{item.value}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── TRACK TAB ───────────────────────────────────────────────── */}
                {activeTab === "track" && (
                  <div className="space-y-6">
                    <div className="border-b border-line pb-5">
                      <h2 className="text-base font-extrabold uppercase tracking-wide text-foreground">Track Order</h2>
                      <p className="text-soft text-sm mt-1">
                        Enter the order number from your confirmation email — the short code such as
                        <span className="font-mono font-bold text-soft"> #A1B2C3D4</span> works too.
                      </p>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleTrackOrder() }} className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
                        <input type="text" value={trackOrderId} onChange={e => setTrackOrderId(e.target.value)} placeholder="Order number, e.g. #A1B2C3D4" className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-white focus:border-aqua-400 focus:outline-none focus:ring-0 transition rounded-sg placeholder:text-faint" />
                      </div>
                      <button type="submit" disabled={trackingLoading} className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-[12px] font-bold uppercase tracking-[0.14em] rounded-full disabled:opacity-50 transition cursor-pointer shrink-0">
                        {trackingLoading ? "Tracking..." : "Track"}
                      </button>
                    </form>
                    {trackingError && <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{trackingError}</p>}
                    {trackingOrder && (
                      <div className="space-y-5">
                        <div className="bg-cream p-5 rounded-xl border border-line flex flex-wrap justify-between items-center gap-4">
                          <div><p className="text-[9px] text-faint uppercase font-bold">Order Number</p><p className="text-xs font-mono font-bold mt-1">#{trackingOrder.number || trackingOrder.id.slice(-8).toUpperCase()}</p></div>
                          <div><p className="text-[9px] text-faint uppercase font-bold">Status</p><span className="inline-block text-[10px] font-extrabold bg-brand-600 text-white px-2.5 py-1 rounded mt-1">{trackingOrder.status}</span></div>
                          <div><p className="text-[9px] text-faint uppercase font-bold">Total</p><p className="text-xs font-extrabold mt-1">{formatOrderPrice(trackingOrder, trackingOrder.totalAmount || 0)}</p></div>
                        </div>
                        <div className="relative pl-8 border-l border-line space-y-6 ml-2">
                          {trackingStages.map((stage: any, i: number) => (
                            <div key={stage.key} className="relative">
                              {i < trackingStages.length - 1 && <div className={`absolute left-[-33.5px] top-6 w-0.5 h-12 ${stage.completed ? "bg-brand-600" : "bg-cream"}`} />}
                              <div className={`absolute left-[-40px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${stage.active ? "bg-brand-600 border-brand-600 ring-4 ring-line" : stage.completed ? "bg-brand-600 border-brand-600" : "bg-white border-line"}`}>
                                {stage.completed && <CheckCircle className="w-3 h-3 text-white fill-white stroke-brand-600" />}
                              </div>
                              <h4 className={`text-xs font-extrabold uppercase ${stage.active ? "text-foreground" : stage.completed ? "text-soft" : "text-faint"}`}>{stage.label}</h4>
                              <p className="text-[10px] text-faint mt-0.5">{stage.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Return Request Modal ─────────────────────────────────────────────── */}
      {returnOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-extrabold uppercase tracking-wider text-foreground mb-4">Request Return</h2>
            <p className="text-xs text-soft mb-4">Order #{returnOrderId.slice(-8).toUpperCase()}</p>
            <label className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-soft block mb-2">Reason for Return</label>
            <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-cream focus:outline-none focus:ring-2 focus:ring-aqua-400 transition mb-5 resize-none" rows={4} placeholder="Please describe why you want to return this order..." />
            <div className="flex gap-3">
              <button onClick={handleSubmitReturn} disabled={submittingReturn} className="flex-1 py-3 text-[12.5px] font-bold uppercase tracking-[0.12em] bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 transition">
                {submittingReturn ? "Submitting..." : "Submit Request"}
              </button>
              <button onClick={() => { setReturnOrderId(null); setReturnReason("") }} className="flex-1 py-3 text-[12.5px] font-bold uppercase tracking-[0.12em] border border-line rounded-lg hover:bg-cream transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default function AccountPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" /></div>}>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <AccountPageContent clientId={clientId} />
        </GoogleOAuthProvider>
      ) : (
        <AccountPageContent clientId="" />
      )}
    </Suspense>
  )
}
