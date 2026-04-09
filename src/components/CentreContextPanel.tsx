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
    <div className="bg-white rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: '#470DA8' }}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-t-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#470DA8' }}>
            K
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#470DA8' }} />
              <span className="text-xs text-gray-400">Loading context...</span>
            </div>
          ) : (
            items.map((item) => {
              const colors = CONTEXT_TYPE_COLORS[item.context_type]
              const label = CONTEXT_TYPE_LABELS[item.context_type]
              const isExpanded = expandedId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap mt-0.5"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {label}
                      </span>
                      <span className="text-sm text-gray-700 font-medium leading-tight">
                        {item.title}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {item.content}
                      </p>
                      {item.source_quote && (
                        <blockquote className="text-[11px] text-gray-400 italic border-l-2 border-gray-200 pl-2">
                          &ldquo;{item.source_quote}&rdquo;
                        </blockquote>
                      )}
                      {item.related_element_codes?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.related_element_codes.map((code) => (
                            <span key={code} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
