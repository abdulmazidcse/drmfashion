"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Edit, ExternalLink, Eye, FolderTree, Loader2, Newspaper, Plus, Search, Star, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import api from "@/lib/axios"
import { formatJournalDate } from "@/lib/journal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type JournalPost = {
  id: string
  title: string
  slug: string
  coverImage: string | null
  authorName: string | null
  readTime: number
  featured: boolean
  published: boolean
  publishedAt: string | null
  views: number
  updatedAt: string
  category: { id: string; name: string; slug: string } | null
}

type StatusFilter = "all" | "published" | "draft"

export default function AdminJournalList() {
  const [posts, setPosts] = useState<JournalPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")

  useEffect(() => {
    let active = true

    api
      .get("/admin/journal")
      .then((res) => {
        if (active) setPosts(Array.isArray(res.data) ? res.data : [])
      })
      .catch((err) => {
        console.error(err)
        if (active) setPosts([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleDelete(id: string) {
    if (!(await confirmDelete("Are you sure you want to delete this journal post?"))) return
    try {
      await api.delete(`/admin/journal/${id}`)
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      Swal.fire({
        text: err?.response?.data?.message || "Failed to delete post",
        icon: "error",
        confirmButtonColor: "#18181b",
      })
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return posts.filter((p) => {
      const matchesTerm =
        !term ||
        p.title.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.category?.name || "").toLowerCase().includes(term)
      const matchesStatus =
        status === "all" || (status === "published" ? p.published : !p.published)
      return matchesTerm && matchesStatus
    })
  }, [posts, search, status])

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.published).length,
      drafts: posts.filter((p) => !p.published).length,
    }),
    [posts]
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Editorial stories, guides and lookbooks published at /journal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/journal/categories">
              <FolderTree className="size-4" /> Categories
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/journal/new">
              <Plus className="size-4" /> New Post
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Posts</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Published</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.published}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Drafts</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.drafts}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search posts by title, slug or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {(["all", "published", "draft"] as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                status === key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Newspaper className="mb-4 h-12 w-12 text-muted-foreground/40" />
                    <p>No journal posts found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {post.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {post.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                          <span className="font-medium text-foreground">{post.title}</span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">/journal/{post.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{post.category?.name || "—"}</TableCell>
                  <TableCell>
                    {post.published ? (
                      <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {post.publishedAt ? formatJournalDate(post.publishedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {post.views}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {post.published ? (
                        <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View post">
                          <Link href={`/journal/${post.slug}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        // Drafts aren't served on the storefront, so don't offer a link into a 404.
                        <span
                          className="flex size-8 items-center justify-center text-muted-foreground/30"
                          title="Publish this post to view it on the storefront"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      )}
                      <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Edit">
                        <Link href={`/admin/journal/${post.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        onClick={() => handleDelete(post.id)}
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
