import { Card } from "@/components/ui/card"

type Props = {
  title: string
  value: string | number
}

export default function DashboardCard({ title, value }: Props) {
  return (
    <Card className="gap-2 p-6 transition-shadow hover:shadow-md">
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-semibold tracking-tight tabular-nums">{value}</h3>
    </Card>
  )
}
