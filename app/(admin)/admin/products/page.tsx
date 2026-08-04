import Link from "next/link"
import { Plus } from "lucide-react"

import ProductTable from "@/components/admin/products/ProductTable"
import ProductActions from "@/components/admin/products/ProductActions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Products
          </h1>

          <p className="text-sm text-muted-foreground">
            Manage your inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProductActions />
          <Button asChild>
            <Link href="/admin/products/create">
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <ProductTable />
        </CardContent>
      </Card>
    </div>
  )
}