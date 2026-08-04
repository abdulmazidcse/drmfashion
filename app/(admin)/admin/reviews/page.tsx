"use client"

import { useState, useEffect } from "react"
import {
  Star,
  MessageSquare,
  Trash2,
  CheckCircle,
  Flag,
  Sparkles,
  ArrowUpRight,
  Search,
} from "lucide-react"
import api from "@/lib/axios"
import { confirmDelete } from "@/lib/confirmDelete"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type ProductReview = {
  id: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  date: string
  productName: string
  productImage: string
  status: "PENDING" | "APPROVED" | "FLAGGED"
}

export default function ReviewsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<ProductReview[]>([])

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await api.get("/admin/reviews")
        setReviews(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadReviews()
  }, [])



  // Filter Logic
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      (r.comment && r.comment.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Moderation Handlers
  function handleApprove(id: string) {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
    )
  }

  function handleFlag(id: string) {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "FLAGGED" } : r))
    )
  }

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Are you sure you want to permanently remove this review?"))) return
    setReviews((prev) => prev.filter((r) => r.id !== id))
  }

  // Aggregate calculations
  const totalReviewsCount = reviews.length
  const averageRating = totalReviewsCount === 0 ? "0.0" : (
    reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount
  ).toFixed(1)

  const countRating = (r: number) => reviews.filter(rev => rev.rating === r).length
  const percRating = (r: number) => totalReviewsCount === 0 ? 0 : Math.round((countRating(r) / totalReviewsCount) * 100)

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
              <MessageSquare size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Product Reviews
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Review customer feedback, rate products, and moderate product testimonial listings.
          </p>
        </div>
      </div>

      {/* MATRIX AND HIGHLIGHT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* TOTAL SUMMARY CARD */}
        <Card className="flex flex-col items-center text-center justify-center">
          <CardContent className="flex flex-col items-center text-center justify-center p-8 w-full">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Curated Sentiment
            </span>

            {/* Average circle indicator */}
            <div className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center bg-primary text-primary-foreground ring-8 ring-muted/50 mb-6">
              <span className="text-4xl font-black font-mono tracking-tight">
                {averageRating}
              </span>
              <span className="text-[10px] font-bold text-primary-foreground/60 mt-1 uppercase tracking-widest">
                Out of 5
              </span>
            </div>

            <div className="flex items-center gap-1 text-yellow-500 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "w-5 h-5",
                    s <= Math.round(Number(averageRating))
                      ? "fill-yellow-500 stroke-yellow-500"
                      : "stroke-muted-foreground/30 fill-muted"
                  )}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Based on {totalReviewsCount} Customer Submissions
            </p>
          </CardContent>
        </Card>

        {/* DETAILS STAR INDEX RATINGS */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col justify-between p-8 h-full">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
                <Sparkles className="text-foreground w-5 h-5" />
                Rating Breakdown Matrix
              </h3>

              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-4 text-xs font-semibold text-foreground">
                    <span className="w-12 text-right">{star} Stars</span>
                    <div className="flex-1 bg-muted border border-border h-3 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${percRating(star)}%` }} />
                    </div>
                    <span className="w-8 font-mono text-right text-muted-foreground">{percRating(star)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right text-xs font-medium text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border mt-4">
              * Verified Purchase filters are active for all testimonial lists.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search comments by client names, product title keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-foreground font-medium"
            >
              <option value="ALL">All Feedbacks</option>
              <option value="PENDING">Pending Moderation</option>
              <option value="APPROVED">Approved Reviews</option>
              <option value="FLAGGED">Flagged Warnings</option>
            </select>
          </div>

          {/* REVIEWS GRID FEED */}
          <div className="mt-8 grid grid-cols-1 gap-6">
            {filteredReviews.map((review) => {
              const isPending = review.status === "PENDING"
              const isFlagged = review.status === "FLAGGED"

              return (
                <div
                  key={review.id}
                  className={cn(
                    "group border rounded-lg p-6 transition flex flex-col md:flex-row md:items-start justify-between gap-6",
                    isFlagged
                      ? "bg-rose-50/40 border-rose-100"
                      : isPending
                      ? "bg-amber-50/40 border-amber-100"
                      : "bg-card border-border hover:bg-muted/50"
                  )}
                >
                  {/* DETAILS CONTAINER */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-primary-foreground font-extrabold text-xs">
                          {review.userAvatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h5 className="font-bold text-foreground text-sm">
                          {review.userName}
                        </h5>
                        <span className="text-[10px] text-muted-foreground font-bold font-mono">
                          Submitted: {review.date}
                        </span>
                      </div>
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 text-yellow-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-4 h-4",
                            s <= review.rating
                              ? "fill-yellow-500 stroke-yellow-500"
                              : "stroke-muted-foreground/30 fill-muted"
                          )}
                        />
                      ))}
                    </div>

                    {/* Comment */}
                    <p className="text-foreground text-sm leading-relaxed font-medium">
                      &ldquo;{review.comment}&rdquo;
                    </p>

                    {/* Associated Product Link */}
                    <div className="flex items-center gap-3 bg-muted border border-border rounded-lg p-3 max-w-md">
                      <img
                        src={review.productImage}
                        alt={review.productName}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {review.productName}
                        </p>
                        <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          Testimonial Subject
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CONTROL ACTION BUTTONS */}
                  <div className="flex md:flex-col items-center gap-2 self-center md:self-start shrink-0">
                    {/* Status Indicator Badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-extrabold tracking-wider uppercase",
                        review.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : isFlagged
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      )}
                    >
                      {review.status}
                    </Badge>

                    <div className="flex gap-1.5 mt-2">
                      {/* Approve button */}
                      {isPending && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleApprove(review.id)}
                          className="border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                          title="Approve Testimony"
                        >
                          <CheckCircle size={15} />
                        </Button>
                      )}

                      {/* Flag button */}
                      {!isFlagged && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleFlag(review.id)}
                          className="border-amber-100 bg-amber-50/50 text-amber-600 hover:bg-amber-500 hover:text-white"
                          title="Flag Testimony"
                        >
                          <Flag size={15} />
                        </Button>
                      )}

                      {/* Delete button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(review.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove Testimony"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
