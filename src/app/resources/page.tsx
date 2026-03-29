'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, type Resource } from '@/lib/types'

const QA_SECTION_LABELS: Record<number, string> = {
  0: 'General Resources',
  1: 'QA1 - Educational Program & Practice',
  2: 'QA2 - Children\'s Health & Safety',
  3: 'QA3 - Physical Environment',
  4: 'QA4 - Staffing Arrangements',
  5: 'QA5 - Relationships with Children',
  6: 'QA6 - Collaborative Partnerships',
  7: 'QA7 - Governance & Leadership',
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('resources')
      .select('*')
      .order('qa_area')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setResources(data)
        setLoading(false)
      })
  }, [])

  const grouped = resources.reduce((acc, res) => {
    const area = res.qa_area ?? 0
    if (!acc[area]) acc[area] = []
    acc[area].push(res)
    return acc
  }, {} as Record<number, Resource[]>)

  // Sort groups: 0 (General) first, then 1-7
  const sortedAreas = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => {
      if (a === 0) return -1
      if (b === 0) return 1
      return a - b
    })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#470DA8]" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="text-gray-500 text-sm mt-1">
          Useful links and resources organized by quality area
        </p>
      </div>

      {sortedAreas.length > 0 ? (
        <div className="space-y-8">
          {sortedAreas.map(area => {
            const areaResources = grouped[area]
            const color = area === 0 ? '#6b7280' : QA_COLORS[area] || '#999'

            return (
              <div key={area}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {area === 0 ? 'G' : `QA${area}`}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {QA_SECTION_LABELS[area] || `QA${area}`}
                    </h2>
                    <p className="text-xs text-gray-500">{areaResources.length} resource{areaResources.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Resource Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {areaResources.map(res => (
                    <a
                      key={res.id}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#470DA8] transition">
                          {res.title}
                        </h3>
                        <svg
                          className="w-4 h-4 text-gray-300 group-hover:text-[#470DA8] transition flex-shrink-0 mt-0.5 ml-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      {res.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-3">{res.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: color }}
                        >
                          {res.category}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">No resources available</p>
          <p className="text-sm mt-1">Resources will appear here once added.</p>
        </div>
      )}
    </div>
  )
}
