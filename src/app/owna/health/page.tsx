'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr, daysAgo } from '@/lib/owna'

export default function OwnaHealthPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [illnessLogs, setIllnessLogs] = useState<any[]>([])
  const [medicationLogs, setMedicationLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'incidents' | 'illness' | 'medication'>('incidents')
  const [dateRange, setDateRange] = useState({ from: daysAgo(30), to: todayStr() })

  const load = async () => {
    setLoading(true)
    try {
      const [incRes, illRes, medRes] = await Promise.all([
        ownaFetch(`/api/children/incident/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=200`),
        ownaFetch(`/api/children/illnesslog/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=200`),
        ownaFetch(`/api/children/medicationlog/${DEMO_CENTRE_ID}/${dateRange.from}/${dateRange.to}?take=200`),
      ])
      if (incRes?.data) setIncidents(incRes.data)
      if (illRes?.data) setIllnessLogs(illRes.data)
      if (medRes?.data) setMedicationLogs(medRes.data)
    } catch (err) { console.error('Failed to load health data:', err) }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateRange.from, dateRange.to])

  const totalEvents = incidents.length + illnessLogs.length + medicationLogs.length

  // Group incidents by type for quick stats
  const incidentsByType: Record<string, number> = {}
  incidents.forEach(inc => {
    const type = inc.type || inc.incidentType || 'Other'
    incidentsByType[type] = (incidentsByType[type] || 0) + 1
  })

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-gray-400">Loading OWNA health &amp; safety data...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Health &amp; Safety Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Incidents, illness, and medication administration from OWNA</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          <button onClick={() => setDateRange({ from: daysAgo(7), to: todayStr() })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">7 days</button>
          <button onClick={() => setDateRange({ from: daysAgo(30), to: todayStr() })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">30 days</button>
          <button onClick={() => setDateRange({ from: daysAgo(90), to: todayStr() })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">90 days</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Incidents</p>
          <p className="text-2xl font-bold text-red-600">{incidents.length}</p>
          {Object.keys(incidentsByType).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(incidentsByType).slice(0, 3).map(([type, count]) => (
                <span key={type} className="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px]">{type}: {count}</span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Illness Logs</p>
          <p className="text-2xl font-bold text-orange-600">{illnessLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Medication Administered</p>
          <p className="text-2xl font-bold text-blue-600">{medicationLogs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { id: 'incidents', label: `Incidents (${incidents.length})`, color: 'text-red-600' },
          { id: 'illness', label: `Illness (${illnessLogs.length})`, color: 'text-orange-600' },
          { id: 'medication', label: `Medication (${medicationLogs.length})`, color: 'text-blue-600' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white shadow-sm text-[#470DA8]' : 'text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {(() => {
          const data = tab === 'incidents' ? incidents : tab === 'illness' ? illnessLogs : medicationLogs
          if (data.length === 0) return (
            <div className="py-12 text-center text-gray-400">
              <p className="text-4xl mb-3">{tab === 'incidents' ? '🩹' : tab === 'illness' ? '🤒' : '💊'}</p>
              <p className="text-sm">No {tab} records for this period</p>
            </div>
          )

          const keys = Object.keys(data[0]).filter(k => !k.startsWith('_') && k !== 'id' && typeof data[0][k] !== 'object' && data[0][k] !== null)
          const displayKeys = keys.slice(0, 9)

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {displayKeys.map(k => (
                      <th key={k} className="text-left py-3 px-3 font-medium text-gray-600 text-xs whitespace-nowrap">
                        {k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.slice(0, 100).map((row: any, i: number) => (
                    <tr key={row.id || i} className="hover:bg-gray-50">
                      {displayKeys.map(k => {
                        const val = row[k]
                        const isDate = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)
                        const isBool = typeof val === 'boolean'
                        return (
                          <td key={k} className="py-2.5 px-3 text-gray-600 text-xs truncate max-w-[200px]">
                            {isBool ? (val ? '&#10003;' : '&#10007;') : isDate ? new Date(val).toLocaleDateString() : String(val ?? '-')}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
