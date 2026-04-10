'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID } from '@/lib/owna'

export default function OwnaChildrenPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [search, setSearch] = useState('')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [childDetail, setChildDetail] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, childRes] = await Promise.all([
          ownaFetch(`/api/room/${DEMO_CENTRE_ID}/list?take=100`),
          ownaFetch(`/api/children/${DEMO_CENTRE_ID}/list?attending=true&take=500`),
        ])
        if (roomRes?.data) setRooms(roomRes.data.filter((r: any) => !r.disabled))
        if (childRes?.data) setChildren(childRes.data)
      } catch (err) { console.error('Failed to load:', err) }
      setLoading(false)
    }
    load()
  }, [])

  const loadChildDetail = async (childId: string) => {
    if (expandedChild === childId) { setExpandedChild(null); return }
    setExpandedChild(childId)
    try {
      const res = await ownaFetch(`/api/children/${DEMO_CENTRE_ID}/${childId}`)
      setChildDetail(res?.data || res)
    } catch { setChildDetail(null) }
  }

  const filtered = children.filter(c => {
    if (selectedRoom && c.roomId !== selectedRoom) return false
    if (search) {
      const term = search.toLowerCase()
      const name = `${c.firstname || ''} ${c.surname || ''}`.toLowerCase()
      if (!name.includes(term)) return false
    }
    return true
  })

  const getAge = (dob: string) => {
    if (!dob) return ''
    const birth = new Date(dob)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (months < 12) return `${months}m`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return years < 3 ? `${years}y ${rem}m` : `${years}y`
  }

  const getDays = (c: any) => {
    const days = []
    if (c.monday) days.push('M')
    if (c.tuesday) days.push('T')
    if (c.wednesday) days.push('W')
    if (c.thursday) days.push('Th')
    if (c.friday) days.push('F')
    return days.join(', ') || '-'
  }

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-muted-foreground">Loading OWNA children data...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Children &amp; Rooms</h1>
          <p className="text-muted-foreground text-sm mt-1">Live from OWNA — {children.length} children across {rooms.length} rooms</p>
        </div>
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">Live from OWNA</span>
      </div>

      {/* Room cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div onClick={() => setSelectedRoom('')} className={`bg-card rounded-xl shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${!selectedRoom ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
          <p className="text-xs text-muted-foreground mb-1">All Rooms</p>
          <p className="text-2xl font-bold text-primary">{children.length}</p>
          <p className="text-xs text-muted-foreground">children</p>
        </div>
        {rooms.map(room => {
          const count = children.filter(c => c.roomId === room.id).length
          return (
            <div key={room.id} onClick={() => setSelectedRoom(selectedRoom === room.id ? '' : room.id)} className={`bg-card rounded-xl shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${selectedRoom === room.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
              <p className="text-xs text-muted-foreground mb-1 truncate">{room.name}</p>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">cap: {room.capacity || '-'}</p>
                {room.capacity > 0 && (
                  <span className={`text-xs font-medium ${count >= room.capacity ? 'text-red-500' : 'text-green-500'}`}>{Math.round((count / room.capacity) * 100)}%</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-64" />
        <span className="text-sm text-muted-foreground self-center">{filtered.length} results</span>
      </div>

      {/* Children table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Child</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Room</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Age</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Gender</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Booked Days</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">CRN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 100).map(child => (
              <tr key={child.id} className="hover:bg-muted cursor-pointer" onClick={() => loadChildDetail(child.id)}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(child.firstname || '?')[0]}{(child.surname || '?')[0]}
                    </div>
                    <span className="font-medium text-foreground">{child.firstname} {child.surname}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600">{child.room || '-'}</td>
                <td className="py-3 px-2 text-gray-600">{getAge(child.dob)}</td>
                <td className="py-3 px-2 text-muted-foreground">{child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : child.gender || '-'}</td>
                <td className="py-3 px-2 text-muted-foreground text-xs">{getDays(child)}</td>
                <td className="py-3 px-2 text-muted-foreground text-xs font-mono">{child.crn || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No children found</div>}
        {filtered.length > 100 && <div className="py-3 text-center text-muted-foreground text-xs border-t border-gray-100">Showing first 100 of {filtered.length}</div>}

        {expandedChild && childDetail && (
          <div className="border-t border-border bg-muted p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Child Details</h3>
              <button onClick={() => setExpandedChild(null)} className="text-muted-foreground hover:text-gray-600">&#10005;</button>
            </div>
            <pre className="text-xs font-mono text-gray-600 bg-card p-4 rounded-lg border border-border max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(childDetail, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
