import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  className?: string
}

function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("animate-fade-in space-y-2", className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          data-slot="page-header-breadcrumbs"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1
            data-slot="page-header-title"
            className="text-2xl font-bold tracking-tight"
          >
            {title}
          </h1>
          {description && (
            <p
              data-slot="page-header-description"
              className="text-sm text-muted-foreground"
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div
            data-slot="page-header-actions"
            className="flex shrink-0 items-center gap-2"
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps, BreadcrumbItem }
