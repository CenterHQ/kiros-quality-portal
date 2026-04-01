'use client'

import { useEffect, useState } from 'react'
import { ownaFetch, DEMO_CENTRE_ID } from '@/lib/owna'

interface OWNARoom {
  id: string
  name: string
  capacity: number
  ageFrom: number
  ageTo: number
  children?: number
}

interface OWNAChild {
  id: string
  firstName: string
  surname: string
  fullName: string
  dateOfBirth: string
  gender: string
  roomName: string
  roomId: string
  startDate: string
  status: string
  age?: string
  allergies?: string
  medicalConditions?: string
  dietaryRequirements?: string
  photo?: string
  emergencyContacts?: any[]
}

export default function OwnaChildrenPage() {
  const [rooms, setRooms] = useState<OWNARoom[]>([])
  const [children, setChildren] = useState<OWNAChild[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [search, setSearch] = useState('')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [childDetail, setChildDetail] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, childRes] = await Promise.all([
          ownaFetch(`/api/room/${DEMO_CENTRE_ID}/list`),
          ownaFetch(`/api/children/${DEMO_CENTRE_ID}/list?attending=true`),
        ])
        if (roomRes?.data) setRooms(roomRes.data)
        if (childRes?.data) setChildren(childRes.data)
      } catch (err) {
        console.error('Failed to load OWNA data:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  const loadChildDetail = async (childId: string) => {
    if (expandedChild === childId) { setExpandedChild(null); return }
    setExpandedChild(childId)
    try {
      const res = await ownaFetch(`/api/children/${DEMO_CENTRE_ID}/${childId}`)
      if (res?.data) setChildDetail(res.data)
      else setChildDetail(res)
    } catch { setChildDetail(null) }
  }

  const filtered = children.filter(c => {
    if (selectedRoom && c.roomId !== selectedRoom) return false
    if (search) {
      const term = search.toLowerCase()
      const name = (c.fullName || `${c.firstName} ${c.surname}`).toLowerCase()
      if (!name.includes(term)) return false
    }
    return true
  })

  const getAge = (dob: string) => {
    if (!dob) return ''
    const birth = new Date(dob)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    if (years < 1) return `${Math.max(0, years * 12 + months)}m`
    if (years < 3) return `${years}y ${Math.max(0, months < 0 ? months + 12 : months)}m`
    return `${years}y`
  }

  if (loading) return <div className="max-w-6xl mx-auto py-12 text-center text-gray-400">Loading OWNA children data...</div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/owna/attendance" className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-block">&larr; OWNA Integration</a>
          <h1 className="text-2xl font-bold">Children &amp; Rooms</h1>
          <p className="text-gray-500 text-sm mt-1">Live data from OWNA — {children.length} children across {rooms.length} rooms</p>
        </div>
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">Live from OWNA</span>
      </div>

      {/* Room summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div onClick={() => setSelectedRoom('')} className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${!selectedRoom ? 'border-[#470DA8] ring-2 ring-[#470DA8]/20' : 'border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">All Rooms</p>
          <p className="text-2xl font-bold text-[#470DA8]">{children.length}</p>
          <p className="text-xs text-gray-400">children enrolled</p>
        </div>
        {rooms.map(room => {
          const roomChildren = children.filter(c => c.roomId === room.id)
          return (
            <div key={room.id} onClick={() => setSelectedRoom(selectedRoom === room.id ? '' : room.id)} className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${selectedRoom === room.id ? 'border-[#470DA8] ring-2 ring-[#470DA8]/20' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">{room.name}</p>
              <p className="text-2xl font-bold text-gray-900">{roomChildren.length}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">capacity: {room.capacity || 'N/A'}</p>
                {room.capacity > 0 && (
                  <span className={`text-xs font-medium ${roomChildren.length >= room.capacity ? 'text-red-500' : roomChildren.length >= room.capacity * 0.9 ? 'text-orange-500' : 'text-green-500'}`}>
                    {Math.round((roomChildren.length / room.capacity) * 100)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search children by name..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8] focus:border-transparent w-64" />
        <span className="text-sm text-gray-400 self-center">{filtered.length} results</span>
      </div>

      {/* Children table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-600">Child</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Room</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Age</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">DOB</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Gender</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Start Date</th>
              <th className="text-center py-3 px-2 font-medium text-gray-600 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.slice(0, 100).map(child => (
              <tr key={child.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadChildDetail(child.id)}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#470DA8]/10 flex items-center justify-center text-xs font-medium text-[#470DA8]">
                      {(child.firstName || '?')[0]}{(child.surname || '?')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{child.fullName || `${child.firstName} ${child.surname}`}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600">{child.roomName || '-'}</td>
                <td className="py-3 px-2 text-gray-600">{getAge(child.dateOfBirth)}</td>
                <td className="py-3 px-2 text-gray-500">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-2 text-gray-500">{child.gender || '-'}</td>
                <td className="py-3 px-2 text-gray-500">{child.startDate ? new Date(child.startDate).toLocaleDateString() : '-'}</td>
                <td className="py-3 px-2 text-center">
                  <span className="text-gray-400 text-xs">{expandedChild === child.id ? '&#9660;' : '&#9654;'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">No children found</div>
        )}

        {/* Expanded child detail */}
        {expandedChild && childDetail && (
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Child Details</h3>
              <button onClick={() => setExpandedChild(null)} className="text-gray-400 hover:text-gray-600">&#10005;</button>
            </div>
            <pre className="text-xs font-mono text-gray-600 bg-white p-4 rounded-lg border border-gray-200 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(childDetail, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
