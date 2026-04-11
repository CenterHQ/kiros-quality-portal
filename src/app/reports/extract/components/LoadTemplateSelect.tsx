'use client'

import { useState, useRef, useEffect } from 'react'
import type { ReportTemplate } from '@/lib/report-types'

interface Props {
  templates: ReportTemplate[]
  loading: boolean
  onLoad: (template: ReportTemplate) => void
  onDelete: (id: string) => void
}

export default function LoadTemplateSelect({ templates, loading, onLoad, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (templates.length === 0 && !loading) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
        Load Template
        {templates.length > 0 && (
          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
            {templates.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saved Templates</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No saved templates</div>
            ) : (
              templates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <button
                    onClick={() => { onLoad(template); setOpen(false) }}
                    className="flex-1 text-left"
                  >
                    <div className="text-sm font-medium text-gray-800">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-gray-400 line-clamp-1">{template.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {template.is_shared && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Shared</span>
                      )}
                      {template.profiles?.full_name && (
                        <span className="text-[10px] text-gray-400">by {template.profiles.full_name}</span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(template.id) }}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete template"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
