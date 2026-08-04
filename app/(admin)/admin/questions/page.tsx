"use client"

import { useEffect, useState } from "react"
import api from "@/lib/axios"
import { HelpCircle, Trash2 } from "lucide-react"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const res = await api.get("/admin/questions")
      setQuestions(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Are you sure you want to delete this question?"))) return
    try {
      await api.delete(`/admin/questions/${id}`)
      setQuestions(questions.filter(q => q.id !== id))
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to delete question", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  const handleAnswer = async (id: string) => {
    try {
      await api.put(`/admin/questions/${id}`, { answer: answerText })
      setAnsweringId(null)
      setAnswerText("")
      loadQuestions()
    } catch (error) {
      console.error(error)
      Swal.fire({ text: "Failed to answer question", confirmButtonColor: "#18181b", icon: "error" })
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading questions...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
            Product Q&A
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Answer customer questions to boost sales and clarity.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No questions found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {questions.map((q) => (
                <div key={q.id} className="p-6 transition-colors hover:bg-muted/50">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            q.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }
                        >
                          {q.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          Product: <a href={`/product/${q.product.slug}`} target="_blank" rel="noreferrer" className="text-foreground hover:underline font-semibold">{q.product.title}</a>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {new Date(q.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="bg-muted/50 border border-border p-4 rounded-lg mt-3">
                        <p className="text-sm font-semibold text-foreground leading-relaxed mb-2">
                          &quot;{q.question}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Asked by: <span className="text-foreground font-medium">{q.name}</span> ({q.email})
                        </p>
                      </div>

                      {q.status === "ANSWERED" ? (
                        <div className="bg-muted/50 border border-border p-4 rounded-lg mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Store Answer:</p>
                          <p className="text-sm text-foreground">{q.answer}</p>
                        </div>
                      ) : (
                        answeringId === q.id ? (
                          <div className="mt-4 space-y-3">
                            <Textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Write your answer here..."
                              className="min-h-[100px]"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAnswer(q.id)}
                              >
                                Submit Answer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => { setAnsweringId(q.id); setAnswerText(""); }}
                            className="mt-3 h-auto p-0 gap-1"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            Answer Question
                          </Button>
                        )
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(q.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete Question"
                      >
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
