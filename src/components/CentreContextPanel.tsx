'use client'

import { useState } from 'react'
import { useCentreContext } from '@/lib/hooks/useCentreContext'
import type { CentreContextType } from '@/lib/types'
import { CONTEXT_TYPE_LABELS, CONTEXT_TYPE_COLORS } from '@/lib/types'

interface CentreContextPanelProps {
  qaNumbers?: number[]
  elementCodes?: string[]
  contextTypes?: CentreContextType[]
  title?: string
  limit?: number
  enabled?: boolean
}

export default function CentreContextPanel({
  qaNumbers,
  elementCodes,
  contextTypes,
  title = 'Kiros Context',
  limit = 3,
  enabled = true,
}: CentreContextPanelProps) {
  const { items, loading } = useCentreContext({ qaNumbers, elementCodes, contextTypes, limit, enabled })
  const [collapsed, setCollapsed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Ambient intelligence: render nothing if no items
  if (!loading && items.length === 0) return null

  return (
    <div className="bg-card rounded-xl shadow-sm border-l-4 border-l-primary">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand context panel' : 'Collapse context panel'}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent rounded-t-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-primary">
            K
          </div>
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${collapsed ? '-rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
        <div className="px-4 pb-3 space-y-2">
          {loading ? (
            <div className="space-y-2 py-2">
              <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : (
            items.map((item) => {
              const colors = CONTEXT_TYPE_COLORS[item.context_type]
              const label = CONTEXT_TYPE_LABELS[item.context_type]
              const isExpanded = expandedId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border hover:border-border transition-colors"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left px-3 py-2"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {label}
                      </span>
                      <span className="text-sm text-foreground font-medium leading-tight">
                        {item.title}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.content}
                      </p>
                      {item.source_quote && (
                        <blockquote className="text-xs text-muted-foreground italic border-l-2 border-purple-300 pl-3 py-1 bg-purple-50/50 rounded-r">
                          &ldquo;{item.source_quote}&rdquo;
                        </blockquote>
                      )}
                      {item.related_element_codes?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.related_element_codes.slice(0, 4).map((code) => (
                            <span key={code} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                              {code}
                            </span>
                          ))}
                          {item.related_element_codes.length > 4 && (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                              +{item.related_element_codes.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
