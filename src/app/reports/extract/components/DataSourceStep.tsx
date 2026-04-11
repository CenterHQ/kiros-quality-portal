'use client'

import { useState } from 'react'
import { getTablesByCategory, getOutgoingRelationships, getTableDef, RELATIONSHIPS } from '@/lib/report-schema'
import type { ReportTemplateConfig, JoinConfig } from '@/lib/report-types'

interface Props {
  config: ReportTemplateConfig
  onSetPrimaryTable: (table: string) => void
  onUpdateJoins: (joins: JoinConfig[]) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  'QA & Compliance': '🎯',
  'Tasks & Activity': '📋',
  'Documents': '📁',
  'Checklists': '✅',
  'Policies': '📜',
  'Rostering & Staff': '👥',
  'Training': '🎓',
  'Learning Management': '📚',
  'Chat & AI': '🤖',
  'Centre & Config': '⚙️',
  'Registers': '📝',
}

export default function DataSourceStep({ config, onSetPrimaryTable, onUpdateJoins }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const tablesByCategory = getTablesByCategory()
  const availableJoins = config.primaryTable ? getOutgoingRelationships(config.primaryTable) : []

  const toggleJoin = (relationshipId: string) => {
    const exists = config.joins.find(j => j.relationshipId === relationshipId)
    if (exists) {
      onUpdateJoins(config.joins.filter(j => j.relationshipId !== relationshipId))
    } else {
      onUpdateJoins([...config.joins, { relationshipId }])
    }
  }

  return (
    <div className="space-y-4">
      {/* Primary Table Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Table</label>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(tablesByCategory).map(([category, tables]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="flex items-center gap-2 font-medium text-sm text-gray-700">
                  <span>{CATEGORY_ICONS[category] || '📊'}</span>
                  {category}
                  <span className="text-xs text-gray-400">({tables.length})</span>
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {expandedCategory === category && (
                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tables.map(table => {
                    const isSelected = config.primaryTable === table.name
                    return (
                      <button
                        key={table.name}
                        onClick={() => onSetPrimaryTable(table.name)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="font-medium">{table.label}</div>
                        {table.description && (
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{table.description}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Table Info */}
      {config.primaryTable && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-medium text-sm">
              Selected: {getTableDef(config.primaryTable)?.label}
            </span>
            <span className="text-xs text-purple-400">
              ({getTableDef(config.primaryTable)?.fields.length} fields)
            </span>
          </div>
        </div>
      )}

      {/* Available Joins */}
      {availableJoins.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Join Related Tables <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableJoins.map(rel => {
              const isJoined = config.joins.some(j => j.relationshipId === rel.id)
              const targetDef = getTableDef(rel.toTable)
              return (
                <button
                  key={rel.id}
                  onClick={() => toggleJoin(rel.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    isJoined
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    {rel.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {targetDef?.label} ({targetDef?.fields.length} fields)
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
