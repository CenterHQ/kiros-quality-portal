'use client'

import { getTableDef, RELATIONSHIPS } from '@/lib/report-schema'
import {
  AGGREGATE_LABELS,
  type ReportTemplateConfig,
  type AggregationConfig,
  type AggregateFunction,
} from '@/lib/report-types'

interface Props {
  config: ReportTemplateConfig
  onUpdateAggregation: (aggregation: AggregationConfig) => void
}

export default function AggregationStep({ config, onUpdateAggregation }: Props) {
  const { primaryTable, joins, aggregation } = config

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

  const toggleEnabled = () => {
    onUpdateAggregation({
      ...aggregation,
      enabled: !aggregation.enabled,
    })
  }

  const addGroupBy = () => {
    onUpdateAggregation({
      ...aggregation,
      groupByFields: [...aggregation.groupByFields, { table: primaryTable, field: '' }],
    })
  }

  const updateGroupBy = (index: number, partial: { table?: string; field?: string }) => {
    const updated = [...aggregation.groupByFields]
    updated[index] = { ...updated[index], ...partial }
    if (partial.table) updated[index].field = ''
    onUpdateAggregation({ ...aggregation, groupByFields: updated })
  }

  const removeGroupBy = (index: number) => {
    onUpdateAggregation({
      ...aggregation,
      groupByFields: aggregation.groupByFields.filter((_, i) => i !== index),
    })
  }

  const addAggregate = () => {
    onUpdateAggregation({
      ...aggregation,
      aggregateFields: [...aggregation.aggregateFields, { table: primaryTable, field: '', fn: 'count' }],
    })
  }

  const updateAggregate = (index: number, partial: { table?: string; field?: string; fn?: AggregateFunction }) => {
    const updated = [...aggregation.aggregateFields]
    updated[index] = { ...updated[index], ...partial }
    if (partial.table) updated[index].field = ''
    onUpdateAggregation({ ...aggregation, aggregateFields: updated })
  }

  const removeAggregate = (index: number) => {
    onUpdateAggregation({
      ...aggregation,
      aggregateFields: aggregation.aggregateFields.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={toggleEnabled}
          className={`relative w-10 h-5 rounded-full transition-colors ${aggregation.enabled ? 'bg-purple-600' : 'bg-gray-300'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${aggregation.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">Enable aggregation</span>
      </label>

      {aggregation.enabled && (
        <>
          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Group By</label>
            <div className="space-y-2">
              {aggregation.groupByFields.map((gb, index) => {
                const tableDef = getTableDef(gb.table)
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={gb.table}
                      onChange={e => updateGroupBy(index, { table: e.target.value })}
                      className="w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
                    >
                      {availableTables.map(t => (
                        <option key={t.name} value={t.name}>{t.label}</option>
                      ))}
                    </select>
                    <select
                      value={gb.field}
                      onChange={e => updateGroupBy(index, { field: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Select field --</option>
                      {tableDef?.fields.map(f => (
                        <option key={f.column} value={f.column}>{f.label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeGroupBy(index)} className="p-2 text-red-400 hover:text-red-600 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              <button onClick={addGroupBy} className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Group By Field
              </button>
            </div>
          </div>

          {/* Aggregate Functions */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Aggregate Functions</label>
            <div className="space-y-2">
              {aggregation.aggregateFields.map((agg, index) => {
                const tableDef = getTableDef(agg.table)
                return (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={agg.fn}
                      onChange={e => updateAggregate(index, { fn: e.target.value as AggregateFunction })}
                      className="w-36 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
                    >
                      {(Object.keys(AGGREGATE_LABELS) as AggregateFunction[]).map(fn => (
                        <option key={fn} value={fn}>{AGGREGATE_LABELS[fn]}</option>
                      ))}
                    </select>
                    <select
                      value={agg.table}
                      onChange={e => updateAggregate(index, { table: e.target.value })}
                      className="w-40 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
                    >
                      {availableTables.map(t => (
                        <option key={t.name} value={t.name}>{t.label}</option>
                      ))}
                    </select>
                    <select
                      value={agg.field}
                      onChange={e => updateAggregate(index, { field: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Select field --</option>
                      {tableDef?.fields.map(f => (
                        <option key={f.column} value={f.column}>{f.label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeAggregate(index)} className="p-2 text-red-400 hover:text-red-600 rounded-lg">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              <button onClick={addAggregate} className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Aggregate
              </button>
            </div>
          </div>
        </>
      )}

      {!aggregation.enabled && (
        <p className="text-sm text-gray-400 italic">
          Aggregation is optional. Enable it to group and summarise data (e.g., count tasks by status).
        </p>
      )}
    </div>
  )
}
