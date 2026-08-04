"use client"

import React, { useState, useEffect } from "react"
import api from "@/lib/axios"
import { MessageSquare, Send, CheckCircle, HelpCircle } from "lucide-react"
import Swal from "@/lib/swal";

export default function ProductQA({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [question, setQuestion] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [productId])

  const loadQuestions = async () => {
    try {
      const res = await api.get(`/products/${productId}/questions`)
      setQuestions(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !question) return

    setSubmitting(true)
    try {
      await api.post(`/products/${productId}/questions`, { name, email, question })
      setSuccess(true)
      setName("")
      setEmail("")
      setQuestion("")
      // Auto dismiss success
      setTimeout(() => setSuccess(false), 5000)
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to submit question.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Q&A List */}
      <div className="space-y-6">
        {/* Rendered inside the dark product panel, so headings sit on brand-600 */}
        <h3 className="text-xl font-extrabold uppercase tracking-[0.14em] text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-faint" />
          Customer Questions
        </h3>

        {loading ? (
          <p className="text-sm text-faint">Loading questions...</p>
        ) : questions.length === 0 ? (
          <div className="bg-cream border border-line rounded-xl p-8 text-center">
            <MessageSquare className="w-8 h-8 text-faint mx-auto mb-3" />
            <p className="text-sm text-soft font-medium">No questions asked yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="border border-line rounded-sg p-5 bg-white shadow-sm space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-cream rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-extrabold text-soft uppercase">{q.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{q.name} <span className="text-faint text-xs font-normal ml-2">{new Date(q.createdAt).toLocaleDateString()}</span></p>
                    <p className="text-sm text-soft mt-1 font-medium">&quot;{q.question}&quot;</p>
                  </div>
                </div>
                
                {q.answer && (
                  <div className="ml-11 bg-cream border-l-2 border-brand-600 p-4 rounded-r-xl">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint mb-1">Store Answer</p>
                    <p className="text-sm text-foreground">{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ask Question Form */}
      <div className="bg-cream border border-line rounded-xl p-6 md:p-8">
        <h4 className="text-base font-extrabold uppercase tracking-wider text-foreground mb-2">Ask a Question</h4>
        <p className="text-xs text-soft font-medium mb-6">Have doubts about size, fit, or fabric? Ask us below and we will answer shortly.</p>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-3" />
            <p className="font-bold">Question Submitted!</p>
            <p className="text-sm mt-1">We will review and answer it shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-soft uppercase tracking-[0.14em] mb-1.5">Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-aqua-400 outline-none" 
                  placeholder="John Doe" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-soft uppercase tracking-[0.14em] mb-1.5">Email (Private)</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-aqua-400 outline-none" 
                  placeholder="john@example.com" 
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-soft uppercase tracking-[0.14em] mb-1.5">Your Question</label>
              <textarea 
                required
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="w-full border border-line rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-aqua-400 outline-none min-h-[100px]" 
                placeholder="How does this fit compared to standard sizes?"
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-full transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : <><Send className="w-4 h-4" /> Post Question</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
