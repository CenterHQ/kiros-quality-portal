'use client'

import { getTableDef, RELATIONSHIPS } from '@/lib/report-schema'
import {
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  type ReportTemplateConfig,
  type FilterCondition,
  type FilterOperator,
  type FieldType,
} from '@/lib/report-types'

interface Props {
  config: ReportTemplateConfig
  onUpdateFilters: (filters: FilterCondition[]) => void
}

export default function FilterStep({ config, onUpdateFilters }: Props) {
  const { primaryTable, joins, filters } = config

  // Get all available tables
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

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: crypto.randomUUID(),
      table: primaryTable,
      field: '',
      operator: 'eq',
      value: '',
    }
    onUpdateFilters([...filters, newFilter])
  }

  const updateFilter = (id: string, partial: Partial<FilterCondition>) => {
    onUpdateFilters(filters.map(f => {
      if (f.id !== id) return f
      const updated = { ...f, ...partial }
      // Reset value when operator changes to a no-value operator
      if (partial.operator && ['is_null', 'is_not_null', 'is_true', 'is_false'].includes(partial.operator)) {
        updated.value = ''
      }
      // Reset field and operator when table changes
      if (partial.table) {
        updated.field = ''
        updated.operator = 'eq'
        updated.value = ''
      }
      // Reset operator to valid one when field changes
      if (partial.field && partial.field !== f.field) {
        const tableDef = getTableDef(updated.table)
        const fieldDef = tableDef?.fields.find(fd => fd.column === partial.field)
        if (fieldDef) {
          const validOps = OPERATORS_BY_TYPE[fieldDef.type] || []
          if (!validOps.includes(updated.operator)) {
            updated.operator = validOps[0] || 'eq'
          }
        }
        updated.value = ''
      }
      return updated
    }))
  }

  const removeFilter = (id: string) => {
    onUpdateFilters(filters.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-3">
      {filters.map(filter => {
        const tableDef = getTableDef(filter.table)
        const fieldDef = tableDef?.fields.find(f => f.column === filter.field)
        const fieldType: FieldType = fieldDef?.type || 'text'
        const validOperators = OPERATORS_BY_TYPE[fieldType] || []
        const noValueOps: FilterOperator[] = ['is_null', 'is_not_null', 'is_true', 'is_false']
        const showValue = !noValueOps.includes(filter.operator)

        return (
          <div key={filter.id} className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
            {/* Table select */}
            <select
              value={filter.table}
              onChange={e => updateFilter(filter.id, { table: e.target.value })}
              className="w-full sm:w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              {availableTables.map(t => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </select>

            {/* Field select */}
            <select
              value={filter.field}
              onChange={e => updateFilter(filter.id, { field: e.target.value })}
              className="w-full sm:w-44 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">-- Select field --</option>
              {tableDef?.fields.map(f => (
                <option key={f.column} value={f.column}>{f.label}</option>
              ))}
            </select>

            {/* Operator select */}
            <select
              value={filter.operator}
              onChange={e => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
              className="w-full sm:w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              {validOperators.map(op => (
                <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
              ))}
            </select>

            {/* Value input */}
            {showValue && (
              <FilterValueInput
                filter={filter}
                fieldDef={fieldDef}
                fieldType={fieldType}
                onChange={val => updateFilter(filter.id, { value: val })}
              />
            )}

            {/* Remove */}
            <button
              onClick={() => removeFilter(filter.id)}
              className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove filter"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}

      <button
        onClick={addFilter}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Filter
      </button>

      {filters.length === 0 && (
        <p className="text-sm text-gray-400 italic">No filters applied - all rows will be included</p>
      )}
    </div>
  )
}

// ─── Value Input Component ───────────────────────────────────────────────────

function FilterValueInput({
  filter,
  fieldDef,
  fieldType,
  onChange,
}: {
  filter: FilterCondition
  fieldDef: any
  fieldType: FieldType
  onChange: (val: any) => void
}) {
  if (filter.operator === 'between') {
    const rangeVal = Array.isArray(filter.value) ? filter.value : ['', '']
    return (
      <div className="flex items-center gap-1 flex-1">
        <input
          type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
          value={rangeVal[0] ?? ''}
          onChange={e => onChange([e.target.value, rangeVal[1]])}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          placeholder="From"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
          value={rangeVal[1] ?? ''}
          onChange={e => onChange([rangeVal[0], e.target.value])}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
          placeholder="To"
        />
      </div>
    )
  }

  if ((filter.operator === 'in' || filter.operator === 'not_in') && fieldDef?.enumValues) {
    const selected = Array.isArray(filter.value) ? filter.value : []
    return (
      <div className="flex-1 flex flex-wrap gap-1">
        {fieldDef.enumValues.map((val: string) => (
          <button
            key={val}
            onClick={() => {
              if (selected.includes(val)) {
                onChange(selected.filter((v) => String(v) !== val))
              } else {
                onChange([...selected, val])
              }
            }}
            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
              selected.includes(val)
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200'
            }`}
          >
            {val}
          </button>
        ))}
      </div>
    )
  }

  if (fieldType === 'enum' && fieldDef?.enumValues) {
    return (
      <select
        value={filter.value as string}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
      >
        <option value="">-- Select --</option>
        {fieldDef.enumValues.map((val: string) => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
    )
  }

  if (fieldType === 'boolean') {
    return (
      <select
        value={filter.value as string}
        onChange={e => onChange(e.target.value === 'true')}
        className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    )
  }

  if (fieldType === 'date') {
    return (
      <input
        type="date"
        value={filter.value as string}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
      />
    )
  }

  if (fieldType === 'datetime') {
    return (
      <input
        type="datetime-local"
        value={filter.value as string}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
      />
    )
  }

  if (fieldType === 'number') {
    return (
      <input
        type="number"
        value={filter.value as string}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        placeholder="Value"
      />
    )
  }

  return (
    <input
      type="text"
      value={filter.value as string}
      onChange={e => onChange(e.target.value)}
      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
      placeholder="Value"
    />
  )
}
