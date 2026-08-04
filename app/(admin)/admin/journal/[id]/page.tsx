import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import JournalPostForm from "@/components/admin/JournalPostForm"

export const dynamic = "force-dynamic"

export default async function EditJournalPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const post = await prisma.journalPost.findUnique({ where: { id } })
  if (!post) notFound()

  return (
    <JournalPostForm
      mode="edit"
      initialValues={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content || "",
        coverImage: post.coverImage || "",
        authorName: post.authorName || "",
        tags: post.tags || [],
        featured: post.featured,
        published: post.published,
        categoryId: post.categoryId || "",
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        metaKeywords: post.metaKeywords || "",
      }}
    />
  )
}
