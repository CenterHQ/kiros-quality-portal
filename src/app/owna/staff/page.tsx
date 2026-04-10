'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr } from '@/lib/owna'

export default function OwnaStaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [onDuty, setOnDuty] = useState<any[]>([])
  const [rp, setRp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null)
  const [staffDetail, setStaffDetail] = useState<any>(null)

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      const [staffRes, dutyRes, rpRes] = await Promise.all([
        ownaFetch(`/api/staff/${DEMO_CENTRE_ID}/list?take=500`),
        ownaFetch(`/api/staff/onduty/${DEMO_CENTRE_ID}/${selectedDate}?take=100`),
        ownaFetch(`/api/staff/rp/${DEMO_CENTRE_ID}?take=10`),
      ])
      if (staffRes?.data) setStaff(staffRes.data.filter((s: any) => !s.inactive))
      if (dutyRes?.data) setOnDuty(dutyRes.data)
      if (rpRes?.data) setRp(rpRes.data)
      else setRp(rpRes)
    } catch (err) {
      console.error('Failed to load staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedDate])

  const loadStaffDetail = async (staffId: string) => {
    if (expandedStaff === staffId) { setExpandedStaff(null); return }
    setExpandedStaff(staffId)
    try {
      const res = await ownaFetch(`/api/staff/${DEMO_CENTRE_ID}/${staffId}`)
      setStaffDetail(res?.data || res)
    } catch { setStaffDetail(null) }
  }

  // Fields: firstname, surname, staffType, emailAddress, contactNumber, inactive, hourlyRate, empType
  // On duty: staffId, staffName, status, loggedIn, rpRank, attendanceDate
  const onDutyIds = new Set(onDuty.map((d: any) => d.staffId))
  const rpName = Array.isArray(rp) ? rp.find((r: any) => r.rpRank === 1)?.staffName : rp?.staffName

  const formatTime = (t: string | null) => {
    if (!t) return '-'
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return '-' }
  }

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-muted-foreground">Loading OWNA staff data...</div>

  if (error) return (
    <div className="py-16 text-center animate-fade-in">
      <p className="text-lg font-semibold text-foreground mb-2">Unable to load data</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button onClick={() => load()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Retry</button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Staff profiles and on-duty status from OWNA</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
          <button onClick={() => setSelectedDate(todayStr())} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90">Today</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Active Staff</p>
          <p className="text-2xl font-bold text-primary">{staff.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">On Duty</p>
          <p className="text-2xl font-bold text-green-600">{onDuty.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Responsible Person</p>
          <p className="text-sm font-bold text-foreground mt-1">{rpName || 'Not set'}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Staff Types</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(new Set(staff.map((s: any) => s.staffType).filter(Boolean))).map((t: any) => (
              <span key={t} className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">{t} ({staff.filter((s: any) => s.staffType === t).length})</span>
            ))}
          </div>
        </div>
      </div>

      {/* On Duty */}
      {onDuty.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="font-semibold text-foreground text-sm mb-3">On Duty — {new Date(selectedDate).toLocaleDateString()}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onDuty.map((d: any, i: number) => (
              <div key={d.staffId || i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700">
                  {(d.staffName || '??').split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{d.staffName}</p>
                  <p className="text-xs text-muted-foreground">{d.status} {d.rpRank === 1 ? '(RP)' : ''}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-600">{formatTime(d.loggedIn)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Staff */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-3 bg-muted border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">All Staff ({staff.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employment</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Phone</th>
              <th className="text-center py-3 px-2 font-medium text-muted-foreground">On Duty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((s: any) => (
              <tr key={s.id} className="hover:bg-muted cursor-pointer" onClick={() => loadStaffDetail(s.id)}>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-3">
                    {s.picture ? (
                      <img src={s.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {(s.firstname || '?')[0]}{(s.surname || '?')[0]}
                      </div>
                    )}
                    <span className="font-medium text-foreground">{s.firstname} {s.surname}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{s.staffType || '-'}</span>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">{s.empType || '-'}</td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">{s.emailAddress || '-'}</td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">{s.contactNumber || '-'}</td>
                <td className="py-2.5 px-2 text-center">
                  {onDutyIds.has(s.id) ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">On Duty</span>
                  ) : <span className="text-gray-300">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {expandedStaff && staffDetail && (
          <div className="border-t border-border bg-muted p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Staff Details</h3>
              <button onClick={() => setExpandedStaff(null)} className="text-muted-foreground hover:text-muted-foreground">&#10005;</button>
            </div>
            <pre className="text-xs font-mono text-muted-foreground bg-card p-4 rounded-lg border border-border max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(staffDetail, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
