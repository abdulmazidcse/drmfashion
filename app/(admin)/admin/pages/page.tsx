"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, FileText, Loader2, Search, ExternalLink } from "lucide-react"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

type Page = {
  id: string
  title: string
  slug: string
  published: boolean
  updatedAt: string
}

export default function AdminPagesList() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchPages()
  }, [])

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/admin/pages", { cache: "no-store" })
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setPages(data)
      } else {
        console.error("API returned non-array:", data)
        setPages([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmDelete("Are you sure you want to delete this page?"))) return
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setPages(pages.filter(p => p.id !== id))
    } catch (err: any) {
      Swal.fire({ text: err.message, confirmButtonColor: "#18181b" })
    }
  }

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dynamic Pages</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage custom pages like Privacy Policy, Terms of Use, etc.</p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="size-4" /> Add New Page
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search pages by title or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug / URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
                    <p>No pages found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPages.map(page => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium text-foreground">{page.title}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">/pages/{page.slug}</TableCell>
                  <TableCell>
                    {page.published ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-100">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(page.updatedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" title="View Page">
                        <Link href={`/pages/${page.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <Link href={`/admin/pages/${page.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        onClick={() => handleDelete(page.id)}
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
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
