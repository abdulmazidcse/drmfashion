"use client"

import { useParams } from "next/navigation"
import ProductEditForm from "@/components/admin/products/ProductEditForm"

export default function EditProductPage() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-2">
      <ProductEditForm productId={id} />
    </div>
  )
}
