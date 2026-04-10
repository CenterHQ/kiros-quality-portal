'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      {/* Full breadcrumbs on md+ */}
      <ol className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />}
              {isLast || !item.href ? (
                <span className={cn(isLast && 'font-semibold text-foreground')}>{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {/* Compact on mobile: show ellipsis + last 2 items */}
      <ol className="flex md:hidden items-center gap-1 text-sm text-muted-foreground">
        {items.length > 2 && (
          <li className="flex items-center gap-1">
            <span>...</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          </li>
        )}
        {items.slice(-2).map((item, index) => {
          const isLast = index === items.slice(-2).length - 1
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />}
              {isLast || !item.href ? (
                <span className={cn(isLast && 'font-semibold text-foreground')}>{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
