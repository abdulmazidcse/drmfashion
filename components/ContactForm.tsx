"use client"

import { useState } from "react"
import { Send, AlertCircle, CheckCircle2, User, Mail, Tag, Package, Loader2 } from "lucide-react"

/** Reasons double as the message subject shown in Admin → Messages. */
const REASONS = [
  "Order status or delivery",
  "Returns & exchanges",
  "Sizing & fit advice",
  "Product question",
  "Payment or invoice",
  "Feedback or suggestion",
  "Something else",
]

const MESSAGE_LIMIT = 2000

export default function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [reason, setReason] = useState(REASONS[0])
  const [orderNumber, setOrderNumber] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [feedback, setFeedback] = useState("")

  const loading = status === "loading"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    setFeedback("")
    try {
      // The order number is prepended so support sees it first in Admin → Messages.
      const body = orderNumber.trim()
        ? `Order number: ${orderNumber.trim()}\n\n${message.trim()}`
        : message.trim()

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject: reason, message: body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      setStatus("success")
      setFeedback(data.message)
      setName(""); setEmail(""); setOrderNumber(""); setMessage(""); setReason(REASONS[0])
    } catch (err) {
      setStatus("error")
      setFeedback(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  const fieldClass =
    "w-full pl-10 pr-4 py-3 text-sm border border-zinc-200 bg-white focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition rounded-lg disabled:opacity-60 placeholder:text-zinc-400"
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2"

  // ─── Success state ──────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="text-center py-10 px-6">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900">Message sent</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">{feedback}</p>
        <button
          onClick={() => { setStatus("idle"); setFeedback("") }}
          className="mt-6 px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 rounded-lg hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition cursor-pointer"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-name" className={labelClass}>Full Name <span className="text-zinc-400">*</span></label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input id="cf-name" type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" disabled={loading} className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="cf-email" className={labelClass}>Email <span className="text-zinc-400">*</span></label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input id="cf-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading} className={fieldClass} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="cf-reason" className={labelClass}>What is it about? <span className="text-zinc-400">*</span></label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select id="cf-reason" value={reason} onChange={e => setReason(e.target.value)} disabled={loading} className={`${fieldClass} appearance-none cursor-pointer pr-10`}>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <svg className="absolute right-4 top-4 w-3 h-3 text-zinc-400 pointer-events-none" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div>
          <label htmlFor="cf-order" className={labelClass}>Order Number <span className="text-zinc-400 font-medium normal-case tracking-normal">(optional)</span></label>
          <div className="relative">
            <Package className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input id="cf-order" type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="e.g. #A1B2C3D4" disabled={loading} className={fieldClass} />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="cf-message" className={labelClass}>Message <span className="text-zinc-400">*</span></label>
          <span className="text-[10px] text-zinc-400 tabular-nums">{message.length}/{MESSAGE_LIMIT}</span>
        </div>
        <textarea
          id="cf-message" required rows={7} maxLength={MESSAGE_LIMIT} value={message}
          onChange={e => setMessage(e.target.value)} disabled={loading}
          placeholder="Tell us what happened, and include your height and usual size if you're asking about fit — the more detail, the faster we can help."
          className="w-full px-4 py-3 text-sm border border-zinc-200 bg-white focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 transition rounded-lg resize-none disabled:opacity-60 placeholder:text-zinc-400"
        />
      </div>

      {feedback && status === "error" && (
        <p className="text-xs font-medium flex items-center gap-1.5 text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{feedback}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
        <button
          type="submit" disabled={loading}
          className="w-full sm:w-auto bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-3.5 px-8 rounded-lg transition text-[11px] uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            : <><Send className="w-4 h-4" /> Send Message</>}
        </button>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          We only use your details to answer this enquiry — never for marketing.
        </p>
      </div>
    </form>
  )
}
