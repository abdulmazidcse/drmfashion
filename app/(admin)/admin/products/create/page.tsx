import ProductForm from "@/components/admin/products/ProductForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CreateProductPage() {
  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-col space-y-1 pb-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 w-fit text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/products">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Products
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create New Product
        </h1>
        <p className="text-sm text-muted-foreground">
          Add a new premium product to your catalog with rich details and variations.
        </p>
      </div>

      <div>
        <ProductForm />
      </div>
    </div>
  )
}