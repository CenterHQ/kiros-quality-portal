'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, STATUS_COLORS, type QAElement } from '@/lib/types'

export default function ElementsPage() {
  const [elements, setElements] = useState<QAElement[]>([])
  const [search, setSearch] = useState('')
  const [filterQA, setFilterQA] = useState<number | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const qa = searchParams.get('qa')
    if (qa) setFilterQA(parseInt(qa))
  }, [searchParams])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('qa_elements').select('*, profiles(full_name)').order('qa_number').order('element_code')
      .then(({ data }) => { if (data) setElements(data) })
  }, [])

  const filtered = elements.filter(el => {
    if (filterQA && el.qa_number !== filterQA) return false
    if (search && !el.element_code.toLowerCase().includes(search.toLowerCase()) && !el.element_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const qaGroups = filtered.reduce((acc, el) => {
    if (!acc[el.qa_number]) acc[el.qa_number] = { name: el.qa_name, elements: [] }
    acc[el.qa_number].elements.push(el)
    return acc
  }, {} as Record<number, { name: string; elements: QAElement[] }>)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QA Elements</h1>
          <p className="text-gray-500 text-sm mt-1">Track progress across all 40 NQS elements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] focus:border-transparent outline-none"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setFilterQA(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${!filterQA ? 'bg-[#6b2fa0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >All</button>
          {[1,2,3,4,5,6,7].map(n => (
            <button
              key={n}
              onClick={() => setFilterQA(filterQA === n ? null : n)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition`}
              style={filterQA === n ? { backgroundColor: QA_COLORS[n], color: 'white' } : { backgroundColor: '#f3f4f6', color: '#666' }}
            >QA{n}</button>
          ))}
        </div>
      </div>

      {/* Elements grouped by QA */}
      <div className="space-y-6">
        {Object.entries(qaGroups).map(([qaNum, qa]) => {
          const num = parseInt(qaNum)
          return (
            <div key={qaNum} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: QA_COLORS[num] }}>
                  QA{qaNum}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{qa.name}</h2>
                  <p className="text-xs text-gray-500">{qa.elements.length} elements</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {qa.elements.map(el => (
                  <a key={el.id} href={`/elements/${el.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition">
                    <span className="text-sm font-mono font-bold text-gray-900 w-12">{el.element_code}</span>
                    <span className="flex-1 text-sm text-gray-700">{el.element_name}</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                      backgroundColor: STATUS_COLORS[el.current_rating]?.bg,
                      color: STATUS_COLORS[el.current_rating]?.text
                    }}>{el.current_rating.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
                      backgroundColor: STATUS_COLORS[el.status]?.bg,
                      color: STATUS_COLORS[el.status]?.text
                    }}>{el.status.replace(/_/g, ' ')}</span>
                    {el.profiles && <span className="text-xs text-gray-400">{(el.profiles as any).full_name}</span>}
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
