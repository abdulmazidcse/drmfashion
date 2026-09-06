import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Props = {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function ForbiddenPage({ searchParams }: Props) {
  const { from } = await searchParams
  const attempted = Array.isArray(from) ? from[0] : from

  return (
    <div className="max-w-xl mx-auto py-16 p-2">
      <Card className="p-8 flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-full">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            You don&apos;t have access to this section
          </h1>
          <p className="text-sm text-muted-foreground">
            Your role does not include permission for this area. Ask an administrator if you need it.
          </p>
          {attempted && (
            <p className="text-xs font-mono text-muted-foreground/80 pt-1 break-all">{attempted}</p>
          )}
        </div>
        <Button asChild className="mt-2">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </Button>
      </Card>
    </div>
  )
}
