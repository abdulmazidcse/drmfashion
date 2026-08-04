"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { MessageSquare, Trash2, Mail, CheckCircle2, Circle } from "lucide-react"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  handled: boolean
  createdAt: string
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unhandled">("all")

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const res = await api.get("/admin/messages")
      setMessages(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const toggleHandled = async (m: ContactMessage) => {
    // optimistic
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, handled: !x.handled } : x)))
    try {
      await api.patch("/admin/messages", { id: m.id, handled: !m.handled })
    } catch (error) {
      console.error(error)
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, handled: m.handled } : x)))
      Swal.fire({ text: "Failed to update message", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Are you sure you want to delete this message?"))) return
    try {
      await api.delete(`/admin/messages?id=${id}`)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to delete message", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  const filtered = filter === "unhandled" ? messages.filter((m) => !m.handled) : messages
  const unhandledCount = messages.filter((m) => !m.handled).length

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading messages...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
            Contact Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Messages submitted through the storefront Contact Us form.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All ({messages.length})
          </Button>
          <Button variant={filter === "unhandled" ? "default" : "outline"} size="sm" onClick={() => setFilter("unhandled")}>
            Unhandled ({unhandledCount})
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {messages.length === 0 ? "No messages yet." : "No messages in this view."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((m) => (
                <div key={m.id} className={`p-5 transition-colors hover:bg-muted/40 ${m.handled ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{m.name}</span>
                        <a href={`mailto:${m.email}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {m.email}
                        </a>
                        {!m.handled && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                      </div>
                      {m.subject && <p className="text-sm font-medium text-zinc-800 mb-1">{m.subject}</p>}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{m.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {new Date(m.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleHandled(m)} title={m.handled ? "Mark as unhandled" : "Mark as handled"}
                        className={m.handled ? "text-emerald-600" : "text-muted-foreground"}>
                        {m.handled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} title="Delete"
                        className="text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
