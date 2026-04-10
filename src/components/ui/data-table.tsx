'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Column {
  key: string
  label: string
  hideOnMobile?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, any>[]
  onRowClick?: (row: any) => void
  emptyState?: React.ReactNode
  className?: string
  stickyHeader?: boolean
}

// ---------------------------------------------------------------------------
// Default empty state
// ---------------------------------------------------------------------------

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">No data</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop table view (md+)
// ---------------------------------------------------------------------------

function DesktopView({ columns, data, onRowClick, stickyHeader }: Omit<DataTableProps, 'emptyState' | 'className'>) {
  return (
    <div className="hidden md:block overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-left">
        <thead
          className={cn(
            'bg-muted',
            stickyHeader && 'sticky top-0 z-10',
          )}
        >
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                  col.hideOnMobile && 'hidden md:table-cell', // always shown on desktop but keeps class for consistency
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'transition-colors hover:bg-muted/50',
                onRowClick && 'cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-sm',
                    col.hideOnMobile && 'hidden md:table-cell',
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile card view (<md)
// ---------------------------------------------------------------------------

function MobileView({ columns, data, onRowClick }: Pick<DataTableProps, 'columns' | 'data' | 'onRowClick'>) {
  const visibleColumns = columns.filter((col) => !col.hideOnMobile)

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {data.map((row, rowIdx) => (
        <div
          key={rowIdx}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={cn(
            'rounded-lg border bg-card p-4 space-y-2',
            onRowClick && 'cursor-pointer hover:bg-muted/50 transition-colors',
          )}
        >
          {visibleColumns.map((col) => (
            <div key={col.key} className="flex items-baseline justify-between gap-4">
              <span className="shrink-0 text-xs text-muted-foreground">{col.label}</span>
              <span className="text-right text-sm font-medium">
                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

function DataTable({
  columns,
  data,
  onRowClick,
  emptyState,
  className,
  stickyHeader = true,
}: DataTableProps) {
  if (data.length === 0) {
    return (
      <div data-slot="data-table" className={cn(className)}>
        {emptyState ?? <DefaultEmptyState />}
      </div>
    )
  }

  return (
    <div data-slot="data-table" className={cn(className)}>
      <DesktopView columns={columns} data={data} onRowClick={onRowClick} stickyHeader={stickyHeader} />
      <MobileView columns={columns} data={data} onRowClick={onRowClick} />
    </div>
  )
}

export { DataTable }
export type { Column, DataTableProps }
