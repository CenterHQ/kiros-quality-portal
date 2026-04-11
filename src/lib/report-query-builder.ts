import type { SupabaseClient } from '@supabase/supabase-js'
import {
  TABLE_SCHEMA,
  RELATIONSHIPS,
  getTableDef,
  getFieldDef,
  isValidTable,
  isValidColumn,
} from './report-schema'
import type {
  ReportTemplateConfig,
  FilterCondition,
  AggregationConfig,
} from './report-types'

// ============================================
// REPORT QUERY BUILDER
// ============================================
// Builds Supabase PostgREST queries from a ReportTemplateConfig.
// All table/column names are validated against the schema whitelist.

interface QueryResult {
  data: Record<string, unknown>[] | null
  error: { message: string } | null
  count: number | null
}

/**
 * Execute a report extract query using the Supabase client.
 * Returns raw data (no aggregation). Aggregation is done in JS after fetch.
 */
export async function executeReportQuery(
  supabase: SupabaseClient,
  config: ReportTemplateConfig,
  options: { limit?: number; countOnly?: boolean } = {}
): Promise<QueryResult> {
  const { primaryTable, selectedFields, joins, filters, sorting } = config

  // Validate primary table
  if (!isValidTable(primaryTable)) {
    return { data: null, error: { message: `Invalid table: ${primaryTable}` }, count: null }
  }

  // Build select string
  const selectString = buildSelectString(config)

  // Start query
  let query = supabase
    .from(primaryTable)
    .select(selectString, { count: 'exact' })

  // Apply filters (only for the primary table — joined table filters handled post-fetch)
  for (const filter of filters) {
    if (filter.table === primaryTable) {
      query = applyFilter(query, filter)
    }
  }

  // Apply sorting
  for (const sort of sorting) {
    if (sort.table === primaryTable) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' })
    }
  }

  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: null, error: { message: error.message }, count: null }
  }

  // Post-fetch: apply filters on joined tables
  let filteredData = (data as unknown) as Record<string, unknown>[]
  const joinedFilters = filters.filter(f => f.table !== primaryTable)
  if (joinedFilters.length > 0 && filteredData) {
    filteredData = filteredData.filter(row => {
      return joinedFilters.every(filter => {
        const joinedData = row[filter.table] as Record<string, unknown> | null
        if (!joinedData) return filter.operator === 'is_null'
        return matchesFilter(joinedData[filter.field], filter)
      })
    })
  }

  return { data: filteredData, error: null, count: count ?? filteredData.length }
}

/**
 * Build the Supabase select string including joined tables.
 */
function buildSelectString(config: ReportTemplateConfig): string {
  const { primaryTable, selectedFields, joins } = config
  const tableDef = getTableDef(primaryTable)
  if (!tableDef) return '*'

  // Determine which primary fields to select
  const primaryFields = selectedFields.filter(f => f.table === primaryTable)
  const primarySelect = primaryFields.length > 0
    ? primaryFields.map(f => f.field).filter(f => isValidColumn(primaryTable, f)).join(',')
    : '*'

  // Build join selects
  const joinParts: string[] = []
  for (const join of joins) {
    const rel = RELATIONSHIPS.find(r => r.id === join.relationshipId)
    if (!rel) continue

    // Determine the target table and its fields
    const targetTable = rel.fromTable === primaryTable ? rel.toTable : rel.fromTable
    const targetFields = selectedFields.filter(f => f.table === targetTable)
    const targetSelect = targetFields.length > 0
      ? targetFields.map(f => f.field).filter(f => isValidColumn(targetTable, f)).join(',')
      : '*'

    // Use FK hint if available for disambiguation
    if (rel.fkHint) {
      joinParts.push(`${targetTable}!${rel.fkHint}(${targetSelect})`)
    } else {
      joinParts.push(`${targetTable}(${targetSelect})`)
    }
  }

  return [primarySelect, ...joinParts].join(',')
}

/**
 * Apply a single filter to a Supabase query builder.
 */
function applyFilter(query: any, filter: FilterCondition): any {
  const { field, operator, value } = filter

  if (!isValidColumn(filter.table, field)) return query

  switch (operator) {
    case 'eq':
      return query.eq(field, value)
    case 'neq':
      return query.neq(field, value)
    case 'gt':
      return query.gt(field, value)
    case 'gte':
      return query.gte(field, value)
    case 'lt':
      return query.lt(field, value)
    case 'lte':
      return query.lte(field, value)
    case 'between': {
      const [min, max] = value as [string | number, string | number]
      return query.gte(field, min).lte(field, max)
    }
    case 'contains':
      return query.ilike(field, `%${value}%`)
    case 'starts_with':
      return query.ilike(field, `${value}%`)
    case 'ends_with':
      return query.ilike(field, `%${value}`)
    case 'in':
      return query.in(field, value as string[])
    case 'not_in':
      return query.not(field, 'in', `(${(value as string[]).join(',')})`)
    case 'is_null':
      return query.is(field, null)
    case 'is_not_null':
      return query.not(field, 'is', null)
    case 'is_true':
      return query.eq(field, true)
    case 'is_false':
      return query.eq(field, false)
    default:
      return query
  }
}

/**
 * Check if a single value matches a filter condition (for post-fetch filtering on joined data).
 */
function matchesFilter(val: unknown, filter: FilterCondition): boolean {
  const { operator, value } = filter
  const str = val != null ? String(val) : ''

  switch (operator) {
    case 'eq': return val === value
    case 'neq': return val !== value
    case 'gt': return Number(val) > Number(value)
    case 'gte': return Number(val) >= Number(value)
    case 'lt': return Number(val) < Number(value)
    case 'lte': return Number(val) <= Number(value)
    case 'between': {
      const [min, max] = value as [string | number, string | number]
      return Number(val) >= Number(min) && Number(val) <= Number(max)
    }
    case 'contains': return str.toLowerCase().includes(String(value).toLowerCase())
    case 'starts_with': return str.toLowerCase().startsWith(String(value).toLowerCase())
    case 'ends_with': return str.toLowerCase().endsWith(String(value).toLowerCase())
    case 'in': return (value as string[]).includes(str)
    case 'not_in': return !(value as string[]).includes(str)
    case 'is_null': return val == null
    case 'is_not_null': return val != null
    case 'is_true': return val === true
    case 'is_false': return val === false
    default: return true
  }
}

/**
 * Flatten nested join data into a flat row for export.
 * e.g., { title: "Task", profiles: { full_name: "John" } }
 *   -> { "title": "Task", "profiles.full_name": "John" }
 */
export function flattenRows(
  rows: Record<string, unknown>[],
  config: ReportTemplateConfig
): { columns: string[]; labels: string[]; rows: unknown[][] } {
  const { primaryTable, joins } = config

  // Determine column order
  const columns: string[] = []
  const labels: string[] = []

  // Primary table fields
  const primaryDef = getTableDef(primaryTable)
  const primaryFields = config.selectedFields.filter(f => f.table === primaryTable)
  const fieldsToUse = primaryFields.length > 0
    ? primaryFields
    : (primaryDef?.fields.filter(f => !f.hidden).map(f => ({ table: primaryTable, field: f.column })) ?? [])

  for (const { field } of fieldsToUse) {
    const fDef = getFieldDef(primaryTable, field)
    columns.push(field)
    labels.push(fDef?.label ?? field)
  }

  // Joined table fields
  for (const join of joins) {
    const rel = RELATIONSHIPS.find(r => r.id === join.relationshipId)
    if (!rel) continue
    const targetTable = rel.fromTable === primaryTable ? rel.toTable : rel.fromTable
    const targetDef = getTableDef(targetTable)
    const joinFields = config.selectedFields.filter(f => f.table === targetTable)
    const jFieldsToUse = joinFields.length > 0
      ? joinFields
      : (targetDef?.fields.filter(f => !f.hidden).map(f => ({ table: targetTable, field: f.column })) ?? [])

    for (const { field } of jFieldsToUse) {
      const fDef = getFieldDef(targetTable, field)
      columns.push(`${targetTable}.${field}`)
      labels.push(`${targetDef?.label ?? targetTable} - ${fDef?.label ?? field}`)
    }
  }

  // Flatten rows
  const flatRows = rows.map(row => {
    return columns.map(col => {
      if (col.includes('.')) {
        const [table, field] = col.split('.')
        const nested = row[table] as Record<string, unknown> | null
        return nested?.[field] ?? null
      }
      return row[col] ?? null
    })
  })

  return { columns, labels, rows: flatRows }
}

/**
 * Perform in-memory aggregation on flat data.
 */
export function aggregateData(
  flatData: { columns: string[]; labels: string[]; rows: unknown[][] },
  config: AggregationConfig
): { columns: string[]; labels: string[]; rows: unknown[][] } {
  if (!config.enabled || config.groupByFields.length === 0) {
    return flatData
  }

  // Find group-by column indices
  const groupByIndices = config.groupByFields.map(gf => {
    const colKey = gf.table ? `${gf.table}.${gf.field}` : gf.field
    let idx = flatData.columns.indexOf(colKey)
    if (idx === -1) idx = flatData.columns.indexOf(gf.field)
    return idx
  }).filter(i => i !== -1)

  // Group rows
  const groups = new Map<string, unknown[][]>()
  for (const row of flatData.rows) {
    const key = groupByIndices.map(i => String(row[i] ?? 'null')).join('|||')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  // Build result columns
  const resultColumns: string[] = []
  const resultLabels: string[] = []

  for (const idx of groupByIndices) {
    resultColumns.push(flatData.columns[idx])
    resultLabels.push(flatData.labels[idx])
  }

  for (const agg of config.aggregateFields) {
    const colKey = agg.table ? `${agg.table}.${agg.field}` : agg.field
    let idx = flatData.columns.indexOf(colKey)
    if (idx === -1) idx = flatData.columns.indexOf(agg.field)
    const label = idx >= 0 ? flatData.labels[idx] : agg.field
    resultColumns.push(`${agg.fn}(${colKey})`)
    resultLabels.push(`${agg.fn.toUpperCase()}(${label})`)
  }

  // Compute aggregates
  const resultRows: unknown[][] = []
  groups.forEach((groupRows, _key) => {
    const row: unknown[] = []

    // Group-by values (from first row)
    for (const idx of groupByIndices) {
      row.push(groupRows[0][idx])
    }

    // Aggregate values
    for (const agg of config.aggregateFields) {
      const colKey = agg.table ? `${agg.table}.${agg.field}` : agg.field
      let colIdx = flatData.columns.indexOf(colKey)
      if (colIdx === -1) colIdx = flatData.columns.indexOf(agg.field)

      if (colIdx === -1) {
        row.push(null)
        continue
      }

      const values: unknown[] = groupRows.map((r: unknown[]) => r[colIdx]).filter((v: unknown) => v != null)

      switch (agg.fn) {
        case 'count':
          row.push(values.length)
          break
        case 'count_distinct':
          row.push(new Set(values.map(String)).size)
          break
        case 'sum':
          row.push(values.reduce((s: number, v: unknown) => s + Number(v), 0))
          break
        case 'avg': {
          const nums: number[] = values.map(Number).filter((n: number) => !isNaN(n))
          row.push(nums.length > 0 ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : null)
          break
        }
        case 'min': {
          const nums: number[] = values.map(Number).filter((n: number) => !isNaN(n))
          row.push(nums.length > 0 ? Math.min(...nums) : null)
          break
        }
        case 'max': {
          const nums: number[] = values.map(Number).filter((n: number) => !isNaN(n))
          row.push(nums.length > 0 ? Math.max(...nums) : null)
          break
        }
        default:
          row.push(null)
      }
    }

    resultRows.push(row)
  })

  return { columns: resultColumns, labels: resultLabels, rows: resultRows }
}

// ─── User UUID Resolution ────────────────────────────────────────────────────

/** Column names that are known to reference profiles.id */
const USER_UUID_COLUMNS = new Set([
  'user_id', 'assigned_to', 'created_by', 'submitted_by', 'reviewed_by',
  'uploaded_by', 'completed_by', 'resolved_by', 'approved_by', 'published_by',
  'assigned_by', 'covering_user_id', 'owner_id', 'last_reviewed_by',
  'reviewer_id', 'suggested_by', 'target_user_id', 'updated_by', 'connected_by',
])

/**
 * Detect which columns in the flat output contain user UUIDs,
 * batch-fetch their names from profiles, and add a "Name" column
 * next to each resolved UUID column.
 */
export async function resolveUserNames(
  supabase: SupabaseClient,
  flatData: { columns: string[]; labels: string[]; rows: unknown[][] }
): Promise<{ columns: string[]; labels: string[]; rows: unknown[][] }> {
  // Find column indices that contain user UUIDs
  const userColIndices: { index: number; colName: string; label: string }[] = []
  for (let i = 0; i < flatData.columns.length; i++) {
    const col = flatData.columns[i]
    // Check both direct column names and joined column names (e.g., "profiles.id")
    const baseName = col.includes('.') ? col.split('.').pop()! : col
    if (USER_UUID_COLUMNS.has(baseName)) {
      userColIndices.push({ index: i, colName: col, label: flatData.labels[i] })
    }
  }

  if (userColIndices.length === 0) return flatData

  // Collect all unique UUIDs
  const allUuids = new Set<string>()
  for (const row of flatData.rows) {
    for (const { index } of userColIndices) {
      const val = row[index]
      if (typeof val === 'string' && val.length === 36) {
        allUuids.add(val)
      }
    }
  }

  if (allUuids.size === 0) return flatData

  // Batch fetch profiles
  const uuidArray = Array.from(allUuids)
  const nameMap = new Map<string, string>()

  // Supabase IN filter has a limit, batch in chunks of 100
  for (let i = 0; i < uuidArray.length; i += 100) {
    const chunk = uuidArray.slice(i, i + 100)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', chunk)

    if (data) {
      for (const profile of data) {
        nameMap.set(profile.id, profile.full_name)
      }
    }
  }

  // Build new columns/labels/rows with name columns inserted after each UUID column
  const newColumns: string[] = []
  const newLabels: string[] = []
  const insertMap: { origIndex: number; isName: boolean }[] = []

  for (let i = 0; i < flatData.columns.length; i++) {
    newColumns.push(flatData.columns[i])
    newLabels.push(flatData.labels[i])
    insertMap.push({ origIndex: i, isName: false })

    const userCol = userColIndices.find(u => u.index === i)
    if (userCol) {
      // Insert a name column right after
      const nameLabel = userCol.label.replace('(User ID)', '').replace('User ID', '').replace(' ID', '').trim()
      newColumns.push(`${userCol.colName}_name`)
      newLabels.push(nameLabel ? `${nameLabel} Name` : 'Name')
      insertMap.push({ origIndex: i, isName: true })
    }
  }

  const newRows = flatData.rows.map(row => {
    return insertMap.map(({ origIndex, isName }) => {
      if (!isName) return row[origIndex]
      const uuid = row[origIndex]
      if (typeof uuid === 'string') {
        return nameMap.get(uuid) ?? uuid
      }
      return null
    })
  })

  return { columns: newColumns, labels: newLabels, rows: newRows }
}
