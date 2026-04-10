'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QA_COLORS, type QAElement } from '@/lib/types'
import CentreContextPanel from '@/components/CentreContextPanel'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { QABadge } from '@/components/ui/qa-badge'

export default function ElementsPage() {
  const [elements, setElements] = useState<QAElement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterQA, setFilterQA] = useState<number | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const qa = searchParams.get('qa')
    if (qa) setFilterQA(parseInt(qa))
  }, [searchParams])

  const loadData = async () => {
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('qa_elements').select('*, profiles(full_name)').order('qa_number').order('element_code')
      if (data) setElements(data)
    } catch (err) {
      console.error('Failed to load elements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

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

  if (loading) return <div className="max-w-7xl mx-auto py-12 text-center text-muted-foreground">Loading elements...</div>

  if (error) return (
    <div className="py-16 text-center animate-fade-in">
      <p className="text-lg font-semibold text-foreground mb-2">Unable to load data</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button onClick={() => loadData()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Retry</button>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="QA Elements"
        description="Track progress across all 40 NQS elements"
        className="mb-6"
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap animate-fade-in">
        <input
          type="text"
          placeholder="Search elements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
        <div className="flex gap-1">
          <button
            onClick={() => setFilterQA(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${!filterQA ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
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

      <div className="mb-4">
        <CentreContextPanel
          contextTypes={['qip_goal']}
          qaNumbers={filterQA ? [filterQA] : undefined}
          title="Related QIP Goals"
          limit={3}
          enabled={!!filterQA}
        />
      </div>

      {/* Elements grouped by QA */}
      <div className="space-y-6">
        {Object.entries(qaGroups).map(([qaNum, qa]) => {
          const num = parseInt(qaNum)
          return (
            <div key={qaNum} className="animate-fade-in bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <QABadge qaNumber={num} showLabel size="lg" />
                <div>
                  <h2 className="font-semibold text-foreground">{qa.name}</h2>
                  <p className="text-xs text-muted-foreground">{qa.elements.length} elements</p>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {qa.elements.map(el => (
                  <Link key={el.id} href={`/elements/${el.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-accent transition">
                    <span className="text-sm font-mono font-bold text-foreground w-12">{el.element_code}</span>
                    <span className="flex-1 text-sm text-foreground/80">{el.element_name}</span>
                    <StatusBadge status={el.current_rating} size="sm" />
                    <StatusBadge status={el.status} size="sm" />
                    {el.profiles && <span className="text-xs text-muted-foreground">{(el.profiles as any).full_name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
