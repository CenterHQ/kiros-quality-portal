'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr } from '@/lib/owna'

interface StaffMember {
  id: string
  firstName: string
  surname: string
  fullName: string
  email: string
  phone: string
  position: string
  roomName: string
  roomId: string
  qualification: string
  startDate: string
  status: string
  photo: string | null
}

interface StaffOnDuty {
  staffId: string
  staffName: string
  firstName: string
  surname: string
  roomName: string
  signInTime: string | null
  signOutTime: string | null
  hours: number
}

export default function OwnaStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [onDuty, setOnDuty] = useState<StaffOnDuty[]>([])
  const [staffLogs, setStaffLogs] = useState<any[]>([])
  const [responsiblePerson, setResponsiblePerson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null)
  const [staffDetail, setStaffDetail] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [staffRes, dutyRes, logRes, rpRes] = await Promise.all([
        ownaFetch(`/api/staff/${DEMO_CENTRE_ID}/list`),
        ownaFetch(`/api/staff/onduty/${DEMO_CENTRE_ID}/${selectedDate}`),
        ownaFetch(`/api/staff/log/${DEMO_CENTRE_ID}/${selectedDate}`),
        ownaFetch(`/api/staff/rp/${DEMO_CENTRE_ID}`),
      ])
      if (staffRes?.data) setStaff(staffRes.data)
      if (dutyRes?.data) setOnDuty(dutyRes.data)
      else if (Array.isArray(dutyRes)) setOnDuty(dutyRes)
      if (logRes?.data) setStaffLogs(logRes.data)
      else if (Array.isArray(logRes)) setStaffLogs(logRes)
      if (rpRes?.data) setResponsiblePerson(rpRes.data)
      else setResponsiblePerson(rpRes)
    } catch (err) { console.error('Failed to load staff data:', err) }
    setLoading(false)
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

  const formatTime = (t: string | null) => {
    if (!t) return '-'
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return t }
  }

  const onDutyIds = new Set(onDuty.map(d => d.staffId))
  const currentlyOnDuty = staff.filter(s => onDutyIds.has(s.id))

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-gray-400">Loading OWNA staff data...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Staff profiles, on-duty status, and responsible person from OWNA</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          <button onClick={() => setSelectedDate(todayStr())} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">Today</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Staff</p>
          <p className="text-2xl font-bold text-[#470DA8]">{staff.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">On Duty Today</p>
          <p className="text-2xl font-bold text-green-600">{onDuty.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Staff Logs</p>
          <p className="text-2xl font-bold text-blue-600">{staffLogs.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Responsible Person</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{responsiblePerson?.fullName || responsiblePerson?.data?.[0]?.fullName || 'Not set'}</p>
        </div>
      </div>

      {/* On Duty section */}
      {onDuty.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">On Duty — {new Date(selectedDate).toLocaleDateString()}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onDuty.map((d, i) => (
              <div key={`${d.staffId}-${i}`} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700">
                  {(d.firstName || d.staffName || '?')[0]}{(d.surname || '')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{d.staffName || `${d.firstName} ${d.surname}`}</p>
                  <p className="text-xs text-gray-500">{d.roomName || 'Floating'}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-600">{formatTime(d.signInTime)}</p>
                  {d.signOutTime && <p className="text-gray-400">{formatTime(d.signOutTime)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All staff list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-sm">All Staff ({staff.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Position</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Room</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Qualification</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Email</th>
              <th className="text-center py-3 px-2 font-medium text-gray-600">On Duty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadStaffDetail(s.id)}>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#470DA8]/10 flex items-center justify-center text-xs font-medium text-[#470DA8]">
                      {(s.firstName || '?')[0]}{(s.surname || '?')[0]}
                    </div>
                    <span className="font-medium text-gray-900">{s.fullName || `${s.firstName} ${s.surname}`}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-gray-600">{s.position || '-'}</td>
                <td className="py-2.5 px-2 text-gray-600">{s.roomName || '-'}</td>
                <td className="py-2.5 px-2 text-gray-500 text-xs">{s.qualification || '-'}</td>
                <td className="py-2.5 px-2 text-gray-500 text-xs">{s.email || '-'}</td>
                <td className="py-2.5 px-2 text-center">
                  {onDutyIds.has(s.id) ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">On Duty</span>
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No staff data available</div>}

        {expandedStaff && staffDetail && (
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Staff Details</h3>
              <button onClick={() => setExpandedStaff(null)} className="text-gray-400 hover:text-gray-600">&#10005;</button>
            </div>
            <pre className="text-xs font-mono text-gray-600 bg-white p-4 rounded-lg border border-gray-200 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(staffDetail, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
