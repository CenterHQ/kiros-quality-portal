'use client'

import { getTableDef, RELATIONSHIPS } from '@/lib/report-schema'
import type { ReportTemplateConfig, SortConfig } from '@/lib/report-types'

interface Props {
  config: ReportTemplateConfig
  onUpdateSorting: (sorting: SortConfig[]) => void
}

export default function SortingStep({ config, onUpdateSorting }: Props) {
  const { primaryTable, joins, sorting } = config

  const availableTables: { name: string; label: string }[] = []
  const primaryDef = getTableDef(primaryTable)
  if (primaryDef) availableTables.push({ name: primaryTable, label: primaryDef.label })
  for (const join of joins) {
    const rel = RELATIONSHIPS.find(r => r.id === join.relationshipId)
    if (!rel) continue
    const targetTable = rel.fromTable === primaryTable ? rel.toTable : rel.fromTable
    const def = getTableDef(targetTable)
    if (def && !availableTables.find(t => t.name === targetTable)) {
      availableTables.push({ name: targetTable, label: def.label })
    }
  }

  const addSort = () => {
    onUpdateSorting([...sorting, { table: primaryTable, field: '', direction: 'asc' }])
  }

  const updateSort = (index: number, partial: Partial<SortConfig>) => {
    onUpdateSorting(sorting.map((s, i) => {
      if (i !== index) return s
      const updated = { ...s, ...partial }
      if (partial.table) updated.field = ''
      return updated
    }))
  }

  const removeSort = (index: number) => {
    onUpdateSorting(sorting.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {sorting.map((sort, index) => {
        const tableDef = getTableDef(sort.table)
        return (
          <div key={index} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={sort.table}
              onChange={e => updateSort(index, { table: e.target.value })}
              className="w-full sm:w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              {availableTables.map(t => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </select>

            <select
              value={sort.field}
              onChange={e => updateSort(index, { field: e.target.value })}
              className="w-full sm:w-48 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- Select field --</option>
              {tableDef?.fields.map(f => (
                <option key={f.column} value={f.column}>{f.label}</option>
              ))}
            </select>

            <select
              value={sort.direction}
              onChange={e => updateSort(index, { direction: e.target.value as 'asc' | 'desc' })}
              className="w-full sm:w-36 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>

            <button
              onClick={() => removeSort(index)}
              className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}

      <button
        onClick={addSort}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Sort
      </button>

      {sorting.length === 0 && (
        <p className="text-sm text-gray-400 italic">No sorting applied - default database order</p>
      )}
    </div>
  )
}
