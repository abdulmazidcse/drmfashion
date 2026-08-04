import GiftCardForm from "@/components/admin/products/GiftCardForm"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CreateGiftCardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col space-y-1 pb-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 h-8 w-fit px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <Link href="/admin/gift-cards">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Gift Cards
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Issue New Gift Card
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a new premium digital gift card denomination for your store.
        </p>
      </div>

      <div>
        <GiftCardForm />
      </div>
    </div>
  )
}
