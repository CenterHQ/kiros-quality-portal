"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardTrend {
  value: string
  positive: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: StatCardTrend
  description?: string
  className?: string
  onClick?: () => void
}

function StatCard({
  title,
  value,
  icon,
  trend,
  description,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card
      data-slot="stat-card"
      className={cn(
        "animate-fade-in transition-shadow",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start justify-between">
        <div className="space-y-1">
          <p
            data-slot="stat-card-title"
            className="text-sm text-muted-foreground"
          >
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p
              data-slot="stat-card-value"
              className="text-3xl font-bold tracking-tight"
            >
              {value}
            </p>
            {trend && (
              <span
                data-slot="stat-card-trend"
                className={cn(
                  "text-xs font-medium",
                  trend.positive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {description && (
            <p
              data-slot="stat-card-description"
              className="text-xs text-muted-foreground"
            >
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div
            data-slot="stat-card-icon"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StatCard }
export type { StatCardProps, StatCardTrend }
