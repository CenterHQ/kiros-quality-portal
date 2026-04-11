// ============================================
// REPORTING EXTRACT WIZARD - TYPES
// ============================================

// ─── Field & Filter Types ────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum' | 'json' | 'uuid' | 'array'

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between'
  | 'contains' | 'starts_with' | 'ends_with'
  | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'is_true' | 'is_false'

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'greater than',
  gte: 'greater than or equal',
  lt: 'less than',
  lte: 'less than or equal',
  between: 'between',
  contains: 'contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  in: 'is one of',
  not_in: 'is not one of',
  is_null: 'is empty',
  is_not_null: 'is not empty',
  is_true: 'is true',
  is_false: 'is false',
}

export const OPERATORS_BY_TYPE: Record<FieldType, FilterOperator[]> = {
  text:     ['eq', 'neq', 'contains', 'starts_with', 'ends_with', 'in', 'not_in', 'is_null', 'is_not_null'],
  number:   ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'],
  boolean:  ['is_true', 'is_false', 'is_null', 'is_not_null'],
  date:     ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'],
  datetime: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'],
  enum:     ['eq', 'neq', 'in', 'not_in', 'is_null', 'is_not_null'],
  json:     ['is_null', 'is_not_null'],
  uuid:     ['eq', 'neq', 'is_null', 'is_not_null'],
  array:    ['is_null', 'is_not_null'],
}

// ─── Schema Definitions ──────────────────────────────────────────────────────

export interface FieldDef {
  column: string
  label: string
  type: FieldType
  enumValues?: string[]
  hidden?: boolean
}

export interface RelationshipDef {
  id: string
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  label: string
  type: 'many-to-one' | 'one-to-many'
  fkHint?: string // Supabase FK hint for disambiguation
}

export interface TableDef {
  name: string
  label: string
  category: string
  description?: string
  fields: FieldDef[]
}

// ─── Wizard Config Types ─────────────────────────────────────────────────────

export interface FilterCondition {
  id: string
  table: string
  field: string
  operator: FilterOperator
  value: string | number | boolean | string[] | [string | number, string | number]
}

export interface JoinConfig {
  relationshipId: string
}

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct'

export const AGGREGATE_LABELS: Record<AggregateFunction, string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Minimum',
  max: 'Maximum',
  count_distinct: 'Count Distinct',
}

export interface AggregationConfig {
  enabled: boolean
  groupByFields: { table: string; field: string }[]
  aggregateFields: { table: string; field: string; fn: AggregateFunction }[]
}

export interface SortConfig {
  table: string
  field: string
  direction: 'asc' | 'desc'
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'docx' | 'html' | 'md' | 'json'

export const EXTRACT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
  docx: 'Word',
  html: 'HTML',
  md: 'Markdown',
  json: 'JSON',
}

export const EXTRACT_FORMAT_ICONS: Record<ExportFormat, string> = {
  csv: '📊',
  xlsx: '📗',
  pdf: '📄',
  docx: '📝',
  html: '🌐',
  md: '📋',
  json: '{ }',
}

export interface ReportTemplateConfig {
  primaryTable: string
  selectedFields: { table: string; field: string }[]
  joins: JoinConfig[]
  filters: FilterCondition[]
  sorting: SortConfig[]
  aggregation: AggregationConfig
  limit?: number
}

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  config: ReportTemplateConfig
  created_by: string
  is_shared: boolean
  created_at: string
  updated_at: string
  profiles?: { full_name: string }
}

// ─── Default Config ──────────────────────────────────────────────────────────

export function createDefaultConfig(): ReportTemplateConfig {
  return {
    primaryTable: '',
    selectedFields: [],
    joins: [],
    filters: [],
    sorting: [],
    aggregation: {
      enabled: false,
      groupByFields: [],
      aggregateFields: [],
    },
  }
}
