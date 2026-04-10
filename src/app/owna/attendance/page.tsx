'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID, todayStr, daysAgo } from '@/lib/owna'

export default function OwnaAttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [roomFilter, setRoomFilter] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)
  const [noDataMessage, setNoDataMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadAttendance = async (date: string) => {
    setError(null)
    setLoading(true)
    setNoDataMessage('')
    try {
      const res = await ownaFetch(`/api/attendance/${DEMO_CENTRE_ID}/${date}/${date}?take=1000`)
      if (res?.data && res.data.length > 0) {
        setAttendance(res.data)
        setTotalRecords(res.data.length)
      } else {
        setAttendance([])
        setNoDataMessage(`No attendance records for ${new Date(date).toLocaleDateString()}. This is a demo centre — try a different date or click "Load Latest Data" to find records.`)
      }
    } catch (err) {
      console.error('Failed to load attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }

  const loadLatestData = async () => {
    setLoading(true)
    setNoDataMessage('')
    try {
      // Get most recent attendance records regardless of date
      const res = await ownaFetch(`/api/attendance/${DEMO_CENTRE_ID}/list?status=0&take=200&sort=attendanceDate%20desc`)
      if (res?.data && res.data.length > 0) {
        setAttendance(res.data)
        setTotalRecords(res.totalCount || res.data.length)
        // Update selected date to match first record
        const latestDate = res.data[0].attendanceDate
        if (latestDate) setSelectedDate(latestDate)
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  useEffect(() => { loadAttendance(selectedDate) }, [selectedDate])

  // Fields from OWNA: room, roomId, child, childId, signIn, signOut, signInParent, signOutParent, attending, attendanceDate, fee
  const rooms = Array.from(new Set(attendance.map((a: any) => a.room).filter(Boolean))).sort()
  const filtered = roomFilter ? attendance.filter((a: any) => a.room === roomFilter) : attendance

  const isValidTime = (t: string | null) => t && !t.includes('2000-01-01') && !t.includes('0001-01-01')

  const present = filtered.filter(a => isValidTime(a.signIn) && !isValidTime(a.signOut) && a.attending)
  const signedIn = filtered.filter(a => isValidTime(a.signIn))
  const signedOut = filtered.filter(a => isValidTime(a.signOut))
  const absent = filtered.filter(a => !a.attending)
  const expected = filtered.filter(a => a.attending && !isValidTime(a.signIn))

  const roomStats = rooms.map(room => {
    const ra = attendance.filter((a: any) => a.room === room)
    return {
      room,
      total: ra.length,
      present: ra.filter(a => isValidTime(a.signIn) && !isValidTime(a.signOut) && a.attending).length,
      absent: ra.filter(a => !a.attending).length,
      signedOut: ra.filter(a => isValidTime(a.signOut)).length,
    }
  })

  const formatTime = (t: string | null) => {
    if (!t || t.includes('2000-01-01') || t.includes('0001-01-01')) return '-'
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    catch { return '-' }
  }

  if (error) return (
    <div className="py-16 text-center animate-fade-in">
      <p className="text-lg font-semibold text-foreground mb-2">Unable to load data</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <button onClick={() => loadAttendance(selectedDate)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">Retry</button>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Live sign-in/sign-out data from OWNA{totalRecords > 0 ? ` (${totalRecords} records)` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadLatestData} className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg text-xs hover:bg-blue-50">Load Latest Data</button>
          <button onClick={() => setSelectedDate(daysAgo(1))} className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted">Yesterday</button>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
          <button onClick={() => setSelectedDate(todayStr())} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90">Today</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Booked</p>
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Currently Present</p>
          <p className="text-2xl font-bold text-green-600">{present.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Signed In</p>
          <p className="text-2xl font-bold text-blue-600">{signedIn.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Signed Out</p>
          <p className="text-2xl font-bold text-muted-foreground">{signedOut.length}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Expected / Absent</p>
          <p className="text-2xl font-bold text-orange-500">{expected.length} / {absent.length}</p>
        </div>
      </div>

      {/* Room breakdown */}
      {roomStats.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-6">
          <h2 className="font-semibold text-foreground text-sm mb-3">Room Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {roomStats.map(rs => (
              <div key={rs.room} onClick={() => setRoomFilter(roomFilter === rs.room ? '' : rs.room)} className={`p-3 rounded-lg border cursor-pointer transition ${roomFilter === rs.room ? 'border-primary bg-purple-50' : 'border-border hover:bg-muted'}`}>
                <p className="font-medium text-sm text-foreground truncate">{rs.room}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-green-600">{rs.present} present</span>
                  <span className="text-orange-500">{rs.absent} absent</span>
                  <span className="text-muted-foreground">{rs.total} total</span>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: rs.total > 0 ? `${(rs.present / rs.total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading attendance...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm mb-3">{noDataMessage || `No attendance records for ${new Date(selectedDate).toLocaleDateString()}`}</p>
            <button onClick={loadLatestData} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">Load Latest Data</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Child</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Room</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Sign In</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">By</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Sign Out</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">By</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.slice(0, 200).map((a: any, i: number) => (
                <tr key={a.id || i} className="hover:bg-muted">
                  <td className="py-2.5 px-4 font-medium text-foreground">{a.child || '-'}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{a.room || '-'}</td>
                  <td className="py-2.5 px-2">
                    {!a.attending ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">Absent</span>
                    ) : isValidTime(a.signOut) ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Signed Out</span>
                    ) : isValidTime(a.signIn) ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">Present</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">Expected</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-muted-foreground">{formatTime(a.signIn)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground text-xs">{a.signInParent || '-'}</td>
                  <td className="py-2.5 px-2 text-muted-foreground">{formatTime(a.signOut)}</td>
                  <td className="py-2.5 px-2 text-muted-foreground text-xs">{a.signOutParent || '-'}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{a.fee ? `$${a.fee.toFixed(2)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
