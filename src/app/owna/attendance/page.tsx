'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr, daysAgo } from '@/lib/owna'

interface AttendanceRecord {
  childId: string
  child: string
  firstName: string
  surname: string
  roomName: string
  roomId: string
  attendanceDate: string
  signInTime: string | null
  signOutTime: string | null
  signedInBy: string | null
  signedOutBy: string | null
  status: string
  absent: boolean
  absentReason: string | null
}

export default function OwnaAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [roomFilter, setRoomFilter] = useState('')

  const loadAttendance = async (date: string) => {
    setLoading(true)
    try {
      const res = await ownaFetch(`/api/attendance/${DEMO_CENTRE_ID}/${date}/${date}?take=500`)
      if (res?.data) setAttendance(res.data)
      else setAttendance([])
    } catch (err) {
      console.error('Failed to load attendance:', err)
      setAttendance([])
    }
    setLoading(false)
  }

  useEffect(() => { loadAttendance(selectedDate) }, [selectedDate])

  const rooms = Array.from(new Set(attendance.map(a => a.roomName).filter(Boolean))).sort()
  const filtered = roomFilter ? attendance.filter(a => a.roomName === roomFilter) : attendance

  const signedIn = filtered.filter(a => a.signInTime && !a.absent)
  const signedOut = filtered.filter(a => a.signOutTime && !a.absent)
  const absent = filtered.filter(a => a.absent)
  const present = signedIn.filter(a => !a.signOutTime)

  const roomStats = rooms.map(room => {
    const roomAtt = attendance.filter(a => a.roomName === room)
    return {
      room,
      total: roomAtt.length,
      present: roomAtt.filter(a => a.signInTime && !a.signOutTime && !a.absent).length,
      absent: roomAtt.filter(a => a.absent).length,
      signedOut: roomAtt.filter(a => a.signOutTime).length,
    }
  })

  const formatTime = (t: string | null) => {
    if (!t) return '-'
    try {
      const d = new Date(t)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return t }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Live sign-in/sign-out data from OWNA</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedDate(daysAgo(1))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Yesterday</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          <button onClick={() => setSelectedDate(todayStr())} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">Today</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Booked</p>
          <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Currently Present</p>
          <p className="text-2xl font-bold text-green-600">{present.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Signed In Today</p>
          <p className="text-2xl font-bold text-blue-600">{signedIn.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Signed Out</p>
          <p className="text-2xl font-bold text-gray-500">{signedOut.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Absent</p>
          <p className={`text-2xl font-bold ${absent.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{absent.length}</p>
        </div>
      </div>

      {/* Room breakdown */}
      {roomStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Room Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {roomStats.map(rs => (
              <div key={rs.room} onClick={() => setRoomFilter(roomFilter === rs.room ? '' : rs.room)} className={`p-3 rounded-lg border cursor-pointer transition ${roomFilter === rs.room ? 'border-[#470DA8] bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <p className="font-medium text-sm text-gray-900">{rs.room}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-green-600">{rs.present} present</span>
                  <span className="text-orange-500">{rs.absent} absent</span>
                  <span className="text-gray-400">{rs.total} total</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: rs.total > 0 ? `${(rs.present / rs.total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading attendance...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">No attendance records for {new Date(selectedDate).toLocaleDateString()}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Child</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Room</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Sign In</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Signed In By</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Sign Out</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Signed Out By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a, i) => (
                <tr key={`${a.childId}-${i}`} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-medium text-gray-900">{a.child || `${a.firstName} ${a.surname}`}</td>
                  <td className="py-2.5 px-2 text-gray-600">{a.roomName || '-'}</td>
                  <td className="py-2.5 px-2">
                    {a.absent ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">Absent{a.absentReason ? ` — ${a.absentReason}` : ''}</span>
                    ) : a.signOutTime ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Signed Out</span>
                    ) : a.signInTime ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">Present</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">Expected</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-gray-600">{formatTime(a.signInTime)}</td>
                  <td className="py-2.5 px-2 text-gray-400 text-xs">{a.signedInBy || '-'}</td>
                  <td className="py-2.5 px-2 text-gray-600">{formatTime(a.signOutTime)}</td>
                  <td className="py-2.5 px-2 text-gray-400 text-xs">{a.signedOutBy || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
