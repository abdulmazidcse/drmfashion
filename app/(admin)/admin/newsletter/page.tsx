"use client"

import { useState } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function NewsletterPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState("all") // all, customers, subscribers
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState({ type: "", msg: "" })

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) {
      setStatus({ type: "error", msg: "Subject and Message are required." })
      return
    }

    setSending(true)
    setStatus({ type: "", msg: "" })

    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, target }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send newsletter.")

      setStatus({ type: "success", msg: `Newsletter sent successfully to ${data.count} recipients.` })
      setSubject("")
      setMessage("")
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Newsletter Campaigns</h1>
        <p className="text-sm text-muted-foreground">Send mass emails to your customers and subscribers.</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <form onSubmit={handleSend} className="space-y-6">
            {status.msg && (
              <div
                className={cn(
                  "p-4 rounded-xl text-sm font-medium",
                  status.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {status.msg}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Target Audience</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer border px-4 py-3 rounded-xl hover:bg-muted/50 transition has-[:checked]:border-foreground has-[:checked]:bg-muted/50">
                  <input type="radio" name="target" value="all" checked={target === "all"} onChange={(e) => setTarget(e.target.value)} className="accent-foreground" />
                  <span className="text-sm font-medium text-foreground">All Contacts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border px-4 py-3 rounded-xl hover:bg-muted/50 transition has-[:checked]:border-foreground has-[:checked]:bg-muted/50">
                  <input type="radio" name="target" value="customers" checked={target === "customers"} onChange={(e) => setTarget(e.target.value)} className="accent-foreground" />
                  <span className="text-sm font-medium text-foreground">Customers Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border px-4 py-3 rounded-xl hover:bg-muted/50 transition has-[:checked]:border-foreground has-[:checked]:bg-muted/50">
                  <input type="radio" name="target" value="subscribers" checked={target === "subscribers"} onChange={(e) => setTarget(e.target.value)} className="accent-foreground" />
                  <span className="text-sm font-medium text-foreground">Newsletter Subscribers Only</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-semibold">Subject Line</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Huge Summer Sale - Up to 50% Off!"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-semibold">Email Message (HTML supported)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="<h1>Hello!</h1><p>We have a great offer for you...</p>"
                className="h-64 resize-none font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">You can use basic HTML tags to format your message.</p>
            </div>

            <Button type="submit" disabled={sending} size="lg" className="w-full">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {sending ? "Sending Campaign..." : "Send Newsletter Campaign"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
