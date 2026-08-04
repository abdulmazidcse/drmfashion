"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CollapsibleCardProps {
  title: string
  description: string
  icon: any
  action?: React.ReactNode
  contentClassName?: string
  defaultCollapsed?: boolean
  children: React.ReactNode
}

export default function CollapsibleCard({
  title,
  description,
  icon: Icon,
  action,
  contentClassName,
  defaultCollapsed = false,
  children,
}: CollapsibleCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <Card>
      <CardHeader
        className="border-b cursor-pointer hover:bg-muted/10 transition-colors select-none"
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest("button") ||
            (e.target as HTMLElement).closest("a") ||
            (e.target as HTMLElement).closest("input") ||
            (e.target as HTMLElement).closest("label")
          )
            return
          setIsCollapsed(!isCollapsed)
        }}
      >
        <div className="flex items-between justify-between w-full">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 bg-muted text-foreground rounded-xl">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {action && <CardAction>{action}</CardAction>}
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0",
                isCollapsed ? "" : "transform rotate-180"
              )}
            />
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className={contentClassName}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
