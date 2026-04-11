'use client'

import { getTableDef, RELATIONSHIPS } from '@/lib/report-schema'
import type { ReportTemplateConfig } from '@/lib/report-types'

const TYPE_BADGES: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-green-100 text-green-700',
  boolean: 'bg-yellow-100 text-yellow-700',
  date: 'bg-orange-100 text-orange-700',
  datetime: 'bg-orange-100 text-orange-600',
  enum: 'bg-purple-100 text-purple-700',
  json: 'bg-gray-100 text-gray-600',
  uuid: 'bg-gray-100 text-gray-500',
  array: 'bg-gray-100 text-gray-600',
}

interface Props {
  config: ReportTemplateConfig
  onUpdateFields: (fields: { table: string; field: string }[]) => void
}

export default function FieldSelectionStep({ config, onUpdateFields }: Props) {
  const { primaryTable, joins, selectedFields } = config

  // Get all tables involved
  const tables: { name: string; label: string }[] = []
  const primaryDef = getTableDef(primaryTable)
  if (primaryDef) tables.push({ name: primaryTable, label: primaryDef.label })

  for (const join of joins) {
    const rel = RELATIONSHIPS.find(r => r.id === join.relationshipId)
    if (!rel) continue
    const targetTable = rel.fromTable === primaryTable ? rel.toTable : rel.fromTable
    const def = getTableDef(targetTable)
    if (def && !tables.find(t => t.name === targetTable)) {
      tables.push({ name: targetTable, label: def.label })
    }
  }

  const isFieldSelected = (table: string, field: string) => {
    // If no fields are selected, all are implicitly selected
    if (selectedFields.length === 0) return true
    return selectedFields.some(f => f.table === table && f.field === field)
  }

  const toggleField = (table: string, field: string) => {
    const tableDef = getTableDef(table)
    if (!tableDef) return

    if (selectedFields.length === 0) {
      // First deselect: select all EXCEPT this one across ALL tables
      const allFields: { table: string; field: string }[] = []
      for (const t of tables) {
        const tDef = getTableDef(t.name)
        if (tDef) {
          for (const f of tDef.fields) {
            if (!(t.name === table && f.column === field)) {
              allFields.push({ table: t.name, field: f.column })
            }
          }
        }
      }
      onUpdateFields(allFields)
    } else {
      const exists = selectedFields.some(f => f.table === table && f.field === field)
      if (exists) {
        onUpdateFields(selectedFields.filter(f => !(f.table === table && f.field === field)))
      } else {
        onUpdateFields([...selectedFields, { table, field }])
      }
    }
  }

  const selectAllForTable = (table: string) => {
    const tableDef = getTableDef(table)
    if (!tableDef) return
    const tableFields = tableDef.fields.map(f => ({ table, field: f.column }))
    const otherFields = selectedFields.filter(f => f.table !== table)
    onUpdateFields([...otherFields, ...tableFields])
  }

  const deselectAllForTable = (table: string) => {
    // If nothing is selected yet, we need to "select all" first, then deselect this table
    if (selectedFields.length === 0) {
      const allFields: { table: string; field: string }[] = []
      for (const t of tables) {
        if (t.name === table) continue
        const tDef = getTableDef(t.name)
        if (tDef) {
          for (const f of tDef.fields) {
            allFields.push({ table: t.name, field: f.column })
          }
        }
      }
      onUpdateFields(allFields)
    } else {
      onUpdateFields(selectedFields.filter(f => f.table !== table))
    }
  }

  const selectAll = () => {
    onUpdateFields([]) // Empty means all selected
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {selectedFields.length === 0 ? 'All fields selected' : `${selectedFields.length} fields selected`}
        </span>
        {selectedFields.length > 0 && (
          <button onClick={selectAll} className="text-xs text-purple-600 hover:text-purple-800">
            Select All
          </button>
        )}
      </div>

      {tables.map(({ name, label }) => {
        const tableDef = getTableDef(name)
        if (!tableDef) return null
        const tableFieldCount = selectedFields.length === 0
          ? tableDef.fields.length
          : selectedFields.filter(f => f.table === name).length

        return (
          <div key={name} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
              <span className="font-medium text-sm text-gray-700">
                {label}
                <span className="text-xs text-gray-400 ml-2">({tableFieldCount} / {tableDef.fields.length})</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => selectAllForTable(name)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  All
                </button>
                <button
                  onClick={() => deselectAllForTable(name)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  None
                </button>
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {tableDef.fields.map(field => {
                const selected = isFieldSelected(name, field.column)
                return (
                  <label
                    key={field.column}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                      selected ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleField(name, field.column)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`truncate ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
                      {field.label}
                    </span>
                    <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_BADGES[field.type] || 'bg-gray-100 text-gray-500'}`}>
                      {field.type}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
