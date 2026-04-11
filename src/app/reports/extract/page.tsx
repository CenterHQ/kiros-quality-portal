'use client'

import { useEffect, useState, useCallback } from 'react'
import { useProfile } from '@/lib/ProfileContext'
import { createClient } from '@/lib/supabase/client'
import { TABLE_SCHEMA, RELATIONSHIPS, getTableDef, getTablesByCategory, getOutgoingRelationships } from '@/lib/report-schema'
import {
  createDefaultConfig,
  EXTRACT_FORMAT_LABELS,
  EXTRACT_FORMAT_ICONS,
  type ReportTemplateConfig,
  type ReportTemplate,
  type ExportFormat,
  type FilterCondition,
  type JoinConfig,
  type SortConfig,
} from '@/lib/report-types'
import DataSourceStep from './components/DataSourceStep'
import FieldSelectionStep from './components/FieldSelectionStep'
import FilterStep from './components/FilterStep'
import AggregationStep from './components/AggregationStep'
import SortingStep from './components/SortingStep'
import PreviewExportStep from './components/PreviewExportStep'
import SaveTemplateDialog from './components/SaveTemplateDialog'
import LoadTemplateSelect from './components/LoadTemplateSelect'

// ─── Step Header ─────────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReportExtractPage() {
  const profile = useProfile()
  const isAllowed = ['admin', 'manager', 'ns'].includes(profile.role)

  const [config, setConfig] = useState<ReportTemplateConfig>(createDefaultConfig())
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  // Preview state
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: unknown[][]; totalCount: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')

  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState('')

  // Load saved templates
  useEffect(() => {
    if (!isAllowed) return
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/reports/extract/templates')
        if (res.ok) {
          const data = await res.json()
          setTemplates(data.templates || [])
        }
      } catch { /* ignore */ }
      setLoadingTemplates(false)
    }
    loadTemplates()
  }, [isAllowed])

  // Config updaters
  const updateConfig = useCallback((partial: Partial<ReportTemplateConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
    setPreviewData(null) // Clear preview when config changes
  }, [])

  const setPrimaryTable = useCallback((table: string) => {
    setConfig({
      ...createDefaultConfig(),
      primaryTable: table,
    })
    setPreviewData(null)
  }, [])

  // Load template
  const loadTemplate = useCallback((template: ReportTemplate) => {
    setConfig(template.config)
    setPreviewData(null)
  }, [])

  // Preview
  const handlePreview = async () => {
    if (!config.primaryTable) return
    setPreviewLoading(true)
    setPreviewError('')
    try {
      const res = await fetch('/api/reports/extract/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Preview failed')
      setPreviewData({
        columns: data.columns,
        rows: data.rows,
        totalCount: data.totalCount,
      })
    } catch (err: any) {
      setPreviewError(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  // Export
  const handleExport = async () => {
    if (!config.primaryTable) return
    setExportLoading(true)
    setExportStatus('')
    try {
      const tableDef = getTableDef(config.primaryTable)
      const title = tableDef ? `${tableDef.label} Extract` : 'Data Extract'

      const res = await fetch('/api/reports/extract/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, format: exportFormat, title }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Export failed')
      }

      // Download the file
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `extract.${exportFormat}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setExportStatus(`Exported successfully as ${EXTRACT_FORMAT_LABELS[exportFormat]}`)
    } catch (err: any) {
      setExportStatus(`Export failed: ${err.message}`)
    } finally {
      setExportLoading(false)
    }
  }

  // Save template
  const handleSaveTemplate = async (name: string, description: string, isShared: boolean) => {
    setSaveStatus('')
    try {
      const res = await fetch('/api/reports/extract/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, config, is_shared: isShared }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setTemplates(prev => [data.template, ...prev])
      setShowSaveDialog(false)
      setSaveStatus('Template saved successfully')
    } catch (err: any) {
      setSaveStatus(`Save failed: ${err.message}`)
    }
  }

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/reports/extract/templates?id=${id}`, { method: 'DELETE' })
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch { /* ignore */ }
  }

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">Only administrators, managers, and nominated supervisors can access the data extract wizard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Extract Wizard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build custom data extracts from any combination of platform data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LoadTemplateSelect
            templates={templates}
            loading={loadingTemplates}
            onLoad={loadTemplate}
            onDelete={handleDeleteTemplate}
          />
          {config.primaryTable && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Save Template
            </button>
          )}
          {config.primaryTable && (
            <button
              onClick={() => { setConfig(createDefaultConfig()); setPreviewData(null) }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {saveStatus && (
        <div className={`px-4 py-2 rounded-lg text-sm ${saveStatus.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {saveStatus}
        </div>
      )}

      {/* Step 1: Data Source */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <StepHeader step={1} title="Select Data Source" subtitle="Choose the primary table and any related tables to join" />
        <DataSourceStep
          config={config}
          onSetPrimaryTable={setPrimaryTable}
          onUpdateJoins={(joins: JoinConfig[]) => updateConfig({ joins })}
        />
      </div>

      {/* Step 2: Field Selection (only show if primary table selected) */}
      {config.primaryTable && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <StepHeader step={2} title="Select Fields" subtitle="Choose which columns to include in the extract (leave empty for all)" />
          <FieldSelectionStep
            config={config}
            onUpdateFields={(selectedFields) => updateConfig({ selectedFields })}
          />
        </div>
      )}

      {/* Step 3: Filters */}
      {config.primaryTable && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <StepHeader step={3} title="Apply Filters" subtitle="Narrow down results with conditions on any field" />
          <FilterStep
            config={config}
            onUpdateFilters={(filters: FilterCondition[]) => updateConfig({ filters })}
          />
        </div>
      )}

      {/* Step 4: Sorting */}
      {config.primaryTable && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <StepHeader step={4} title="Sort Results" subtitle="Order your extract by one or more fields" />
          <SortingStep
            config={config}
            onUpdateSorting={(sorting: SortConfig[]) => updateConfig({ sorting })}
          />
        </div>
      )}

      {/* Step 5: Aggregation (Optional) */}
      {config.primaryTable && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <StepHeader step={5} title="Aggregation (Optional)" subtitle="Group and summarise data with aggregate functions" />
          <AggregationStep
            config={config}
            onUpdateAggregation={(aggregation) => updateConfig({ aggregation })}
          />
        </div>
      )}

      {/* Step 6: Preview & Export */}
      {config.primaryTable && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <StepHeader step={6} title="Preview & Export" subtitle="Preview your data then export in your preferred format" />
          <PreviewExportStep
            config={config}
            previewData={previewData}
            previewLoading={previewLoading}
            previewError={previewError}
            exportFormat={exportFormat}
            exportLoading={exportLoading}
            exportStatus={exportStatus}
            onPreview={handlePreview}
            onExport={handleExport}
            onSetExportFormat={setExportFormat}
          />
        </div>
      )}

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <SaveTemplateDialog
          onSave={handleSaveTemplate}
          onClose={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  )
}
