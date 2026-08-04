import Link from "next/link"
import ProductTable from "@/components/admin/products/ProductTable"
import { Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function GiftCardsAdminPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-muted text-foreground rounded-xl flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Gift Cards
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage digital gift cards for your customers. Use the category filter to view only Gift Cards.
            </p>
          </div>
        </div>

        <Button asChild>
          <Link href="/admin/gift-cards/create">
            Add Gift Card
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <ProductTable categorySlug="gift-cards" />
        </CardContent>
      </Card>
    </div>
  )
}
