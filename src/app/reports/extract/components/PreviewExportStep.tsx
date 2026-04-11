'use client'

import {
  EXTRACT_FORMAT_LABELS,
  EXTRACT_FORMAT_ICONS,
  type ReportTemplateConfig,
  type ExportFormat,
} from '@/lib/report-types'

interface Props {
  config: ReportTemplateConfig
  previewData: { columns: string[]; rows: unknown[][]; totalCount: number } | null
  previewLoading: boolean
  previewError: string
  exportFormat: ExportFormat
  exportLoading: boolean
  exportStatus: string
  onPreview: () => void
  onExport: () => void
  onSetExportFormat: (format: ExportFormat) => void
}

const ALL_FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf', 'docx', 'html', 'md', 'json']

export default function PreviewExportStep({
  config,
  previewData,
  previewLoading,
  previewError,
  exportFormat,
  exportLoading,
  exportStatus,
  onPreview,
  onExport,
  onSetExportFormat,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Preview Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onPreview}
          disabled={previewLoading || !config.primaryTable}
          className="px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {previewLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading Preview...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preview Data
            </>
          )}
        </button>
        {previewData && (
          <span className="text-sm text-gray-500">
            Showing {previewData.rows.length} of {previewData.totalCount} total rows
          </span>
        )}
      </div>

      {/* Preview Error */}
      {previewError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {previewError}
        </div>
      )}

      {/* Preview Table */}
      {previewData && previewData.rows.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 w-10">#</th>
                  {previewData.columns.map((col, i) => (
                    <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-400">{ri + 1}</td>
                    {row.map((val, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                        {val === null || val === undefined ? (
                          <span className="text-gray-300 italic">null</span>
                        ) : typeof val === 'object' ? (
                          <span className="text-xs text-gray-400 font-mono">{JSON.stringify(val).substring(0, 60)}</span>
                        ) : typeof val === 'boolean' ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {String(val)}
                          </span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewData && previewData.rows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          No data matches your current filters. Try adjusting your filter conditions.
        </div>
      )}

      {/* Export Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
        <div className="flex flex-wrap gap-2">
          {ALL_FORMATS.map(format => (
            <button
              key={format}
              onClick={() => onSetExportFormat(format)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                exportFormat === format
                  ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50/50'
              }`}
            >
              <span>{EXTRACT_FORMAT_ICONS[format]}</span>
              {EXTRACT_FORMAT_LABELS[format]}
            </button>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onExport}
          disabled={exportLoading || !config.primaryTable}
          className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {exportLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export as {EXTRACT_FORMAT_LABELS[exportFormat]}
            </>
          )}
        </button>
        {exportStatus && (
          <span className={`text-sm ${exportStatus.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
            {exportStatus}
          </span>
        )}
      </div>
    </div>
  )
}
