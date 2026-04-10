"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "animate-fade-in mx-auto max-w-sm rounded-xl bg-muted/50 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div
          data-slot="empty-state-icon"
          className="mx-auto mb-4 flex size-12 items-center justify-center text-muted-foreground [&_svg]:size-12"
        >
          {icon}
        </div>
      )}
      <h3
        data-slot="empty-state-title"
        className="text-lg font-semibold"
      >
        {title}
      </h3>
      {description && (
        <p
          data-slot="empty-state-description"
          className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps, EmptyStateAction }
