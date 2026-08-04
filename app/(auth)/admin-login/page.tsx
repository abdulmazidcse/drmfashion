"use client"

import { useState } from "react"
import Image from "next/image"
import { isAxiosError } from "axios"
import api from "@/lib/axios"
import { useSettings } from "@/providers/SettingsProvider"
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react"

export default function AdminLoginPage() {
  const { settings } = useSettings()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in both fields.")
      return
    }

    try {
      setLoading(true)
      console.log("Attempting login with:", email)
      const res = await api.post("/auth/login", { email, password })
      console.log("Login response:", res.data)

      // Force a hard navigation to apply the middleware and reload state
      window.location.href = "/admin"
    } catch (err: unknown) {
      console.error("Login error:", err)
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      setError(message)
      setLoading(false)
    }
  }

  return (
    <main className="admin relative min-h-screen overflow-hidden bg-[#F4F6FB] px-4 py-6 text-[#20263A] sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#4A5FE8]/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-[#7485F2]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#131A2E_1px,transparent_1px),linear-gradient(90deg,#131A2E_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#E1E5F0] bg-white shadow-[0_30px_80px_-35px_rgba(19,26,46,0.28)] sm:min-h-[680px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-[#131A2E] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-28 top-16 h-72 w-72 rounded-full border border-white/[0.07]" />
            <div className="absolute -right-16 top-28 h-52 w-52 rounded-full border border-white/[0.07]" />
            <div className="absolute bottom-[-7rem] left-[-5rem] h-72 w-72 rounded-full bg-[#4A5FE8]/30 blur-3xl" />
          </div>

          <div className="relative flex items-center gap-3">
            <div className="relative h-9 w-36">
              {/* Dark panel — flatten every logo to white so a dark uploaded
                  logo stays visible. `unoptimized` because Next 16 rejects
                  local-IP sources, which is how MinIO serves the logo in dev. */}
              <Image
                src={settings["brand_logo_url"] || "/logo.svg"}
                alt="Store logo"
                fill
                className="brightness-0 invert object-contain object-left"
                priority
                unoptimized
              />
            </div>
          </div>

          <div className="relative max-w-sm">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C8CDE0]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#8C9AFF]" aria-hidden="true" />
              Secure access
            </span>
            <h1 className="text-[2.55rem] font-semibold leading-[1.12] tracking-[-0.04em]">
              Everything your store needs, in one dashboard.
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-[#AEB4C6]">
              Sign in to review performance, manage inventory, process orders, and support your customers.
            </p>

            <div className="mt-9 space-y-3.5">
              {["Protected administrator access", "Live commerce insights", "Centralized store operations"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-xs font-medium text-[#D9DDEC]">
                  <CheckCircle2 className="h-4 w-4 text-[#7F8FFF]" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-[10px] font-medium uppercase tracking-[0.16em] text-[#6F7690]">
            Private &amp; monitored workspace
          </p>
        </aside>

        <div className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-sm">
            <div className="mb-9 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-40 items-center rounded-xl bg-[#131A2E] px-4 shadow-lg shadow-[#131A2E]/15">
                  <div className="relative h-7 w-full">
                    <Image
                      src={settings["brand_logo_url"] || "/logo.svg"}
                      alt="Store logo"
                      fill
                      className="brightness-0 invert object-contain object-left"
                      priority
                      unoptimized
                    />
                  </div>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7B8299]">Admin dashboard</p>
              </div>
            </div>

            <div className="mb-8">
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#4A5FE8]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#20263A]">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-[#747C93]">
                Enter your administrator credentials to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border border-[#F2C8CE] bg-[#FFF4F5] px-4 py-3 text-sm font-medium text-[#B43A4D]"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="admin-email" className="block text-xs font-semibold text-[#3F465C]">
                  Admin email
                </label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA1B5] transition-colors group-focus-within:text-[#4A5FE8]" aria-hidden="true" />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@fashion.com"
                    className="h-12 w-full rounded-xl border border-[#DDE1EB] bg-[#FAFBFD] pl-11 pr-4 text-sm text-[#20263A] outline-none transition-all placeholder:text-[#ADB3C2] hover:border-[#C8CDDA] focus:border-[#4A5FE8] focus:bg-white focus:ring-4 focus:ring-[#4A5FE8]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-password" className="block text-xs font-semibold text-[#3F465C]">
                  Password
                </label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA1B5] transition-colors group-focus-within:text-[#4A5FE8]" aria-hidden="true" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#DDE1EB] bg-[#FAFBFD] pl-11 pr-12 text-sm text-[#20263A] outline-none transition-all placeholder:text-[#ADB3C2] hover:border-[#C8CDDA] focus:border-[#4A5FE8] focus:bg-white focus:ring-4 focus:ring-[#4A5FE8]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8E95A9] transition-colors hover:bg-[#EEF0FF] hover:text-[#4A5FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A5FE8]/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4A5FE8] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_-10px_rgba(74,95,232,0.75)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3F52D1] hover:shadow-[0_16px_28px_-10px_rgba(74,95,232,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4A5FE8]/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign in securely
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9299AC]">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Authorized personnel only
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
