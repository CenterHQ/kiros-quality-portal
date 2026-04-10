'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Room, RosterShift, StaffQualification, LeaveRequest, ProgrammingTime, RatioStatus } from '@/lib/types'
import { AGE_GROUP_LABELS, SHIFT_TYPE_LABELS, QUALIFICATION_LABELS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getWeekDates(offset: number): string[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

type Tab = 'roster' | 'compliance' | 'leave' | 'programming' | 'staff'

export default function RosteringPage() {
  const supabase = createClient()
  const user = useProfile()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [shifts, setShifts] = useState<RosterShift[]>([])
  const [qualifications, setQualifications] = useState<StaffQualification[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [programmingTime, setProgrammingTime] = useState<ProgrammingTime[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [tab, setTab] = useState<Tab>('roster')
  const [showAddShift, setShowAddShift] = useState(false)
  const [selectedDay, setSelectedDay] = useState('')
  const [newShift, setNewShift] = useState({ user_id: '', room_id: '', start_time: '07:00', end_time: '15:30', shift_type: 'regular', break_start: '12:00', break_end: '12:30', notes: '' })
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', age_group: '3-5', licensed_capacity: 22, ratio_children: 10, ratio_educators: 1, color: '#470DA8' })
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [newLeave, setNewLeave] = useState({ user_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' })

  const [mobileDay, setMobileDay] = useState(() => {
    const day = new Date().getDay()
    return day === 0 || day === 6 ? 0 : day - 1 // Mon=0, clamp weekends to Mon
  })

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const weekLabel = `${new Date(weekDates[0]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${new Date(weekDates[4]).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const load = async () => {
    const [{ data: rm }, { data: pr }, { data: sq }, { data: lr }, { data: pt }] = await Promise.all([
      supabase.from('rooms').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('profiles').select('*'),
      supabase.from('staff_qualifications').select('*'),
      supabase.from('leave_requests').select('*, profiles(full_name)').order('start_date', { ascending: false }),
      supabase.from('programming_time').select('*, profiles(full_name)').order('week_starting', { ascending: false }),
    ])
    if (rm) setRooms(rm)
    if (pr) setProfiles(pr)
    if (sq) setQualifications(sq as any)
    if (lr) setLeaveRequests(lr as any)
    if (pt) setProgrammingTime(pt as any)
  }

  const loadShifts = async () => {
    const { data: sh } = await supabase.from('roster_shifts').select('*, profiles(full_name, role), rooms(name, age_group, ratio_children, ratio_educators, color)')
      .gte('shift_date', weekDates[0]).lte('shift_date', weekDates[4]).order('start_time')
    if (sh) setShifts(sh as any)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadShifts() }, [weekOffset])

  useEffect(() => {
    const channel = supabase.channel('roster-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roster_shifts' }, loadShifts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [weekOffset])

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)

  // Ratio calculation per room per day
  const getRatioStatus = (room: Room, date: string): RatioStatus => {
    const roomShifts = shifts.filter(s => s.room_id === room.id && s.shift_date === date && s.status !== 'cancelled' && s.shift_type !== 'programming_time')
    const educatorsOnFloor = roomShifts.length
    const childrenPresent = room.licensed_capacity // Simplified - use actual attendance when available
    const requiredEducators = Math.ceil(childrenPresent / room.ratio_children) * room.ratio_educators
    const surplus = educatorsOnFloor - requiredEducators
    return {
      room,
      educatorsOnFloor,
      childrenPresent,
      requiredEducators,
      status: surplus > 0 ? 'compliant' : surplus === 0 ? 'at_minimum' : 'breach',
      surplus,
    }
  }

  const addShift = async () => {
    if (!selectedDay || !newShift.user_id) return
    await supabase.from('roster_shifts').insert({
      shift_date: selectedDay,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      user_id: newShift.user_id,
      room_id: newShift.room_id ? Number(newShift.room_id) : null,
      shift_type: newShift.shift_type,
      break_start: newShift.break_start || null,
      break_end: newShift.break_end || null,
      notes: newShift.notes || null,
      created_by: user?.id,
    })
    if (user) {
      const staffName = profiles.find(p => p.id === newShift.user_id)?.full_name
      await supabase.from('activity_log').insert({
        user_id: user.id, action: 'created_roster_shift', entity_type: 'roster_shift',
        details: `Added shift for ${staffName} on ${selectedDay}`,
      })
    }
    setShowAddShift(false)
    setNewShift({ user_id: '', room_id: '', start_time: '07:00', end_time: '15:30', shift_type: 'regular', break_start: '12:00', break_end: '12:30', notes: '' })
    await loadShifts()
  }

  const deleteShift = async (id: string) => {
    await supabase.from('roster_shifts').delete().eq('id', id)
    await loadShifts()
  }

  const addRoom = async () => {
    if (!newRoom.name) return
    await supabase.from('rooms').insert({ ...newRoom, sort_order: rooms.length })
    setShowAddRoom(false)
    setNewRoom({ name: '', age_group: '3-5', licensed_capacity: 22, ratio_children: 10, ratio_educators: 1, color: '#470DA8' })
    await load()
  }

  const addLeave = async () => {
    if (!newLeave.user_id || !newLeave.start_date || !newLeave.end_date) return
    await supabase.from('leave_requests').insert({
      user_id: newLeave.user_id,
      leave_type: newLeave.leave_type,
      start_date: newLeave.start_date,
      end_date: newLeave.end_date,
      reason: newLeave.reason || null,
    })
    setShowLeaveForm(false)
    setNewLeave({ user_id: '', leave_type: 'annual', start_date: '', end_date: '', reason: '' })
    await load()
  }

  const updateLeaveStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'approved') {
      updates.approved_by = user?.id
      updates.approved_at = new Date().toISOString()
    }
    await supabase.from('leave_requests').update(updates).eq('id', id)
    await load()
  }

  const copyWeek = async (fromOffset: number) => {
    const fromDates = getWeekDates(fromOffset)
    const toDates = weekDates
    const { data: fromShifts } = await supabase.from('roster_shifts').select('*')
      .gte('shift_date', fromDates[0]).lte('shift_date', fromDates[4])
    if (!fromShifts || fromShifts.length === 0) return
    const newShifts = fromShifts.map(s => {
      const dayIndex = fromDates.indexOf(s.shift_date)
      if (dayIndex === -1) return null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = s
      return { ...rest, shift_date: toDates[dayIndex], status: 'scheduled', is_published: false, created_by: user?.id }
    }).filter(Boolean)
    if (newShifts.length > 0) {
      await supabase.from('roster_shifts').insert(newShifts)
      await loadShifts()
    }
  }

  const publishWeek = async () => {
    const weekShifts = shifts.filter(s => !s.is_published)
    if (weekShifts.length === 0) return
    // Check compliance before publishing
    const breaches: string[] = []
    for (const room of rooms) {
      for (const date of weekDates) {
        const ratio = getRatioStatus(room, date)
        if (ratio.status === 'breach') {
          breaches.push(`${room.name} on ${new Date(date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} (need ${ratio.requiredEducators}, have ${ratio.educatorsOnFloor})`)
        }
      }
    }
    if (breaches.length > 0) {
      toast({ type: 'warning', message: `Cannot publish — ratio breaches detected: ${breaches.join(', ')}` })
      return
    }
    await supabase.from('roster_shifts')
      .update({ is_published: true, published_at: new Date().toISOString(), published_by: user?.id })
      .gte('shift_date', weekDates[0]).lte('shift_date', weekDates[4])
    await loadShifts()
  }

  // Check for qualification coverage
  const getQualificationCoverage = (date: string) => {
    const dayShifts = shifts.filter(s => s.shift_date === date && s.status !== 'cancelled')
    const staffIds = Array.from(new Set(dayShifts.map(s => s.user_id).filter(Boolean))) as string[]
    const hasFirstAid = staffIds.some(uid => qualifications.some(q => q.user_id === uid && q.qualification_type === 'first_aid' && q.status === 'current'))
    const hasDiploma = staffIds.filter(uid => qualifications.some(q => q.user_id === uid && (q.qualification_type === 'diploma' || q.qualification_type === 'ect_degree') && q.status === 'current'))
    const diplomaRatio = staffIds.length > 0 ? hasDiploma.length / staffIds.length : 0
    return { hasFirstAid, diplomaCount: hasDiploma.length, diplomaRatio, totalStaff: staffIds.length }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Rostering"
        description="Staff scheduling, ratio compliance & workforce management"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Rostering' }]}
        actions={isPrivileged ? (
          <>
            <button onClick={() => setShowAddRoom(true)} className="px-3 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">+ Room</button>
            <button onClick={() => copyWeek(weekOffset - 1)} className="px-3 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">Copy Previous Week</button>
            <button onClick={publishWeek} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">Publish Week</button>
          </>
        ) : undefined}
        className="mb-6"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {([
          { id: 'roster', label: 'Weekly Roster' },
          { id: 'compliance', label: 'Compliance' },
          { id: 'leave', label: `Leave (${leaveRequests.filter(l => l.status === 'pending').length})` },
          { id: 'programming', label: 'Programming Time' },
          { id: 'staff', label: 'Staff & Qualifications' },
        ] as { id: Tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ROSTER TAB */}
      {tab === 'roster' && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setWeekOffset(o => o - 1)} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">&larr; Previous</button>
            <div className="text-center">
              <h2 className="font-semibold text-foreground">{weekLabel}</h2>
              {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs text-primary hover:underline">Today</button>}
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted">Next &rarr;</button>
          </div>

          {/* Mobile day selector */}
          <div className="flex md:hidden gap-1 mb-3 bg-muted rounded-lg p-1">
            {weekDates.map((date, i) => (
              <button key={i} onClick={() => setMobileDay(i)}
                className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition ${
                  mobileDay === i ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
                }`}>
                {['Mon','Tue','Wed','Thu','Fri'][i]}
              </button>
            ))}
          </div>

          {/* Roster grid by room */}
          {rooms.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <p className="text-4xl mb-3">🏫</p>
              <p className="text-sm">No rooms configured. Add rooms to start rostering.</p>
            </Card>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="mb-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: room.color }} />
                  <h3 className="font-semibold text-foreground">{room.name}</h3>
                  <span className="text-xs text-muted-foreground">{AGE_GROUP_LABELS[room.age_group]} | Capacity: {room.licensed_capacity} | Ratio: 1:{room.ratio_children}</span>
                </div>
                {/* Desktop: full week grid */}
                <div className="hidden md:block bg-card rounded-xl shadow-sm ring-1 ring-foreground/10 overflow-hidden">
                  <div className="grid grid-cols-5 divide-x divide-border">
                    {weekDates.map((date, dayIdx) => {
                      const dayShifts = shifts.filter(s => s.room_id === room.id && s.shift_date === date && s.status !== 'cancelled')
                      const ratio = getRatioStatus(room, date)
                      const isWeekend = dayIdx > 4
                      return (
                        <div key={date} className={`p-3 min-h-[140px] bg-card ${isWeekend ? 'bg-muted' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">{DAYS[dayIdx]} {new Date(date).getDate()}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${ratio.status === 'compliant' ? 'bg-green-400' : ratio.status === 'at_minimum' ? 'bg-yellow-400' : 'bg-red-400'}`} title={`${ratio.educatorsOnFloor}/${ratio.requiredEducators} educators`} />
                          </div>
                          <div className="space-y-1">
                            {dayShifts.map(shift => (
                              <div key={shift.id} className="group relative px-2 py-1.5 rounded-md text-xs border" style={{ backgroundColor: room.color + '15', borderColor: room.color + '30' }}>
                                <div className="flex items-center justify-between">
                                  <span className="font-medium truncate" style={{ color: room.color }}>{(shift.profiles as any)?.full_name || 'Unassigned'}</span>
                                  {isPrivileged && (
                                    <button onClick={() => deleteShift(shift.id)} className="md:opacity-0 md:group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition min-h-[44px] min-w-[44px] flex items-center justify-center -my-2 -mr-1">&#10005;</button>
                                  )}
                                </div>
                                <span className="text-muted-foreground">{shift.start_time?.slice(0, 5)}-{shift.end_time?.slice(0, 5)}</span>
                                {shift.shift_type !== 'regular' && (
                                  <span className="ml-1 px-1 py-0.5 bg-card/60 rounded text-[9px] text-muted-foreground">{SHIFT_TYPE_LABELS[shift.shift_type]}</span>
                                )}
                                {shift.is_published && <span className="ml-1 text-green-500 text-[9px]">&#10003;</span>}
                              </div>
                            ))}
                          </div>
                          {isPrivileged && (
                            <button onClick={() => { setSelectedDay(date); setNewShift({ ...newShift, room_id: String(room.id) }); setShowAddShift(true) }} className="mt-2 w-full px-2 py-1 border border-dashed border-border text-muted-foreground rounded text-xs hover:border-primary hover:text-primary transition">
                              + Add Shift
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Mobile: single day view */}
                <div className="md:hidden space-y-2">
                  {(() => {
                    const date = weekDates[mobileDay]
                    const dayShifts = shifts.filter(s => s.room_id === room.id && s.shift_date === date && s.status !== 'cancelled')
                    const ratio = getRatioStatus(room, date)
                    return (
                      <>
                        <div className="flex items-center justify-between px-1 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">{DAYS[mobileDay]} {new Date(date).getDate()}</span>
                          <span className={`inline-flex items-center gap-1 text-xs ${ratio.status === 'compliant' ? 'text-green-600' : ratio.status === 'at_minimum' ? 'text-yellow-600' : 'text-red-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${ratio.status === 'compliant' ? 'bg-green-400' : ratio.status === 'at_minimum' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                            {ratio.educatorsOnFloor}/{ratio.requiredEducators} educators
                          </span>
                        </div>
                        {dayShifts.length === 0 ? (
                          <div className="bg-card border border-border rounded-lg p-4 text-center text-xs text-muted-foreground">No shifts scheduled</div>
                        ) : dayShifts.map(shift => (
                          <div key={shift.id} className="bg-card border border-border rounded-lg p-3" style={{ borderLeftWidth: 3, borderLeftColor: room.color }}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm" style={{ color: room.color }}>{(shift.profiles as any)?.full_name || 'Unassigned'}</span>
                              {isPrivileged && (
                                <button onClick={() => deleteShift(shift.id)} className="text-red-400 hover:text-red-600 text-xs min-h-[44px] min-w-[44px] flex items-center justify-center -my-2 -mr-1">&#10005;</button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</span>
                              {shift.shift_type !== 'regular' && (
                                <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{SHIFT_TYPE_LABELS[shift.shift_type]}</span>
                              )}
                              {shift.is_published && <span className="text-green-500 text-[10px]">&#10003; Published</span>}
                            </div>
                          </div>
                        ))}
                        {isPrivileged && (
                          <button onClick={() => { setSelectedDay(date); setNewShift({ ...newShift, room_id: String(room.id) }); setShowAddShift(true) }} className="w-full px-3 py-2.5 border border-dashed border-border text-muted-foreground rounded-lg text-xs hover:border-primary hover:text-primary transition">
                            + Add Shift
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* COMPLIANCE TAB */}
      {tab === 'compliance' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Ratio Compliance — {weekLabel}</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Room</th>
                    {weekDates.map((d, i) => <th key={d} className="text-center py-2 px-2 font-medium text-muted-foreground">{DAYS[i]} {new Date(d).getDate()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.id} className="border-b border-border">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: room.color }} />
                          <span className="font-medium">{room.name}</span>
                          <span className="text-xs text-muted-foreground">1:{room.ratio_children}</span>
                        </div>
                      </td>
                      {weekDates.map(date => {
                        const ratio = getRatioStatus(room, date)
                        return (
                          <td key={date} className="text-center py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              ratio.status === 'compliant' ? 'bg-green-50 text-green-700' :
                              ratio.status === 'at_minimum' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {ratio.educatorsOnFloor}/{ratio.requiredEducators}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualification Coverage</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Requirement</th>
                    {weekDates.map((d, i) => <th key={d} className="text-center py-2 px-2 font-medium text-muted-foreground">{DAYS[i]} {new Date(d).getDate()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 font-medium">First Aid on Site</td>
                    {weekDates.map(date => {
                      const cov = getQualificationCoverage(date)
                      return (
                        <td key={date} className="text-center py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cov.hasFirstAid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {cov.hasFirstAid ? '&#10003;' : '&#10007;'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-3 pr-4 font-medium">50% Diploma+ Mix</td>
                    {weekDates.map(date => {
                      const cov = getQualificationCoverage(date)
                      const met = cov.diplomaRatio >= 0.5
                      return (
                        <td key={date} className="text-center py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${met ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {cov.diplomaCount}/{cov.totalStaff} ({Math.round(cov.diplomaRatio * 100)}%)
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Expiring Soon (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-2">
                {qualifications.filter(q => {
                  if (!q.expiry_date) return false
                  const exp = new Date(q.expiry_date)
                  const now = new Date()
                  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  return diff > 0 && diff <= 30
                }).map(q => {
                  const staff = profiles.find(p => p.id === q.user_id)
                  return (
                    <div key={q.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{staff?.full_name} — {QUALIFICATION_LABELS[q.qualification_type]}</span>
                      <span className="text-orange-500">{new Date(q.expiry_date!).toLocaleDateString()}</span>
                    </div>
                  )
                })}
                {qualifications.filter(q => q.expiry_date && ((new Date(q.expiry_date).getTime() - Date.now()) / 86400000) <= 30 && ((new Date(q.expiry_date).getTime() - Date.now()) / 86400000) > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground">No expiring qualifications</p>
                )}
              </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Expired</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-2">
                {qualifications.filter(q => q.expiry_date && new Date(q.expiry_date) < new Date()).map(q => {
                  const staff = profiles.find(p => p.id === q.user_id)
                  return (
                    <div key={q.id} className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{staff?.full_name} — {QUALIFICATION_LABELS[q.qualification_type]}</span>
                      <span className="text-red-500">{new Date(q.expiry_date!).toLocaleDateString()}</span>
                    </div>
                  )
                })}
                {qualifications.filter(q => q.expiry_date && new Date(q.expiry_date) < new Date()).length === 0 && (
                  <p className="text-xs text-green-600">All qualifications current</p>
                )}
              </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Approved Leave This Week</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-2">
                {leaveRequests.filter(l => l.status === 'approved' && l.start_date <= weekDates[4] && l.end_date >= weekDates[0]).map(l => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{(l.profiles as any)?.full_name}</span>
                    <span className="text-blue-500">{l.leave_type}</span>
                  </div>
                ))}
                {leaveRequests.filter(l => l.status === 'approved' && l.start_date <= weekDates[4] && l.end_date >= weekDates[0]).length === 0 && (
                  <p className="text-xs text-muted-foreground">No approved leave this week</p>
                )}
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LEAVE TAB */}
      {tab === 'leave' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Leave Requests</h2>
            <button onClick={() => setShowLeaveForm(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ Request Leave</button>
          </div>
          <div className="space-y-3">
            {leaveRequests.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <p className="text-sm">No leave requests.</p>
              </Card>
            ) : leaveRequests.map(l => (
              <div key={l.id} className="bg-card rounded-xl shadow-sm ring-1 ring-foreground/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{(l.profiles as any)?.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        l.status === 'approved' ? 'bg-green-50 text-green-600' :
                        l.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                        l.status === 'declined' ? 'bg-red-50 text-red-600' :
                        'bg-muted text-muted-foreground'
                      }`}>{l.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l.leave_type.replace('_', ' ')} | {new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}
                    </p>
                    {l.reason && <p className="text-xs text-muted-foreground/70 mt-1">{l.reason}</p>}
                  </div>
                  {isPrivileged && l.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateLeaveStatus(l.id, 'approved')} className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs hover:bg-green-100">Approve</button>
                      <button onClick={() => updateLeaveStatus(l.id, 'declined')} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-100">Decline</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROGRAMMING TIME TAB */}
      {tab === 'programming' && (
        <div className="animate-fade-in">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800">Under the Children&apos;s Services Award (Clause 21.5), each educator is entitled to <strong>2 hours per week</strong> of non-contact programming time. Schedule programming time shifts to ensure coverage.</p>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Educator</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Week Starting</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Planned</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Actual</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {programmingTime.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No programming time records. Programming time shifts will appear here when scheduled.</td></tr>
                ) : programmingTime.map(pt => (
                  <tr key={pt.id} className="border-b border-border">
                    <td className="py-3 px-4 font-medium">{(pt.profiles as any)?.full_name}</td>
                    <td className="py-3 px-2 text-center">{new Date(pt.week_starting).toLocaleDateString()}</td>
                    <td className="py-3 px-2 text-center">{pt.planned_hours}h</td>
                    <td className="py-3 px-2 text-center">{pt.actual_hours}h</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        pt.status === 'completed' ? 'bg-green-50 text-green-600' :
                        pt.status === 'missed' ? 'bg-red-50 text-red-600' :
                        pt.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                        'bg-muted text-muted-foreground'
                      }`}>{pt.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STAFF TAB */}
      {tab === 'staff' && (
        <div className="animate-fade-in">
          <h2 className="font-semibold text-foreground mb-4">Staff Qualifications</h2>
          <div className="space-y-4">
            {profiles.map(p => {
              const pQuals = qualifications.filter(q => q.user_id === p.id)
              return (
                <div key={p.id} className="bg-card rounded-xl shadow-sm ring-1 ring-foreground/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-sm">{p.full_name}</h4>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                    {isPrivileged && (
                      <a href={`/rostering/qualifications/${p.id}`} className="px-3 py-1.5 border border-border text-muted-foreground rounded-lg text-xs hover:bg-muted">Manage</a>
                    )}
                  </div>
                  {pQuals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No qualifications recorded</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pQuals.map(q => (
                        <span key={q.id} className={`px-2 py-1 rounded-full text-xs font-medium ${
                          q.status === 'current' ? 'bg-green-50 text-green-700 border border-green-200' :
                          q.status === 'expiring_soon' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                          q.status === 'expired' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {QUALIFICATION_LABELS[q.qualification_type]}
                          {q.expiry_date && <span className="ml-1 opacity-60">({new Date(q.expiry_date).toLocaleDateString()})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ADD SHIFT MODAL */}
      {showAddShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddShift(false)}>
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">Add Shift — {selectedDay && new Date(selectedDay).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Staff Member *</label>
                <select value={newShift.user_id} onChange={e => setNewShift({ ...newShift, user_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">Select staff...</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Room</label>
                <select value={newShift.room_id} onChange={e => setNewShift({ ...newShift, room_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">No room (admin/float)</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({AGE_GROUP_LABELS[r.age_group]})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Time</label>
                  <input type="time" value={newShift.start_time} onChange={e => setNewShift({ ...newShift, start_time: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Time</label>
                  <input type="time" value={newShift.end_time} onChange={e => setNewShift({ ...newShift, end_time: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Shift Type</label>
                <select value={newShift.shift_type} onChange={e => setNewShift({ ...newShift, shift_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Break Start</label>
                  <input type="time" value={newShift.break_start} onChange={e => setNewShift({ ...newShift, break_start: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Break End</label>
                  <input type="time" value={newShift.break_end} onChange={e => setNewShift({ ...newShift, break_end: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddShift(false)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={addShift} disabled={!newShift.user_id} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Add Shift</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddRoom(false)}>
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">Add Room</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Room Name *</label>
                <input type="text" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="e.g., Joeys" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Age Group</label>
                <select value={newRoom.age_group} onChange={e => {
                  const ag = e.target.value
                  const defaults: Record<string, { ratio: number; cap: number }> = { '0-2': { ratio: 4, cap: 8 }, '2-3': { ratio: 5, cap: 10 }, '3-5': { ratio: 10, cap: 22 }, 'school_age': { ratio: 15, cap: 30 }, 'mixed': { ratio: 4, cap: 16 } }
                  const d = defaults[ag] || { ratio: 10, cap: 20 }
                  setNewRoom({ ...newRoom, age_group: ag, ratio_children: d.ratio, licensed_capacity: d.cap })
                }} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  {Object.entries(AGE_GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Licensed Capacity</label>
                  <input type="number" value={newRoom.licensed_capacity} onChange={e => setNewRoom({ ...newRoom, licensed_capacity: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ratio (1:X)</label>
                  <input type="number" value={newRoom.ratio_children} onChange={e => setNewRoom({ ...newRoom, ratio_children: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Color</label>
                <input type="color" value={newRoom.color} onChange={e => setNewRoom({ ...newRoom, color: e.target.value })} className="w-16 h-8 border border-border rounded cursor-pointer" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddRoom(false)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={addRoom} disabled={!newRoom.name} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Add Room</button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REQUEST MODAL */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLeaveForm(false)}>
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">Request Leave</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Staff Member *</label>
                <select value={newLeave.user_id} onChange={e => setNewLeave({ ...newLeave, user_id: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="">Select staff...</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Leave Type</label>
                <select value={newLeave.leave_type} onChange={e => setNewLeave({ ...newLeave, leave_type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="professional_development">Professional Development</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date *</label>
                  <input type="date" value={newLeave.start_date} onChange={e => setNewLeave({ ...newLeave, start_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date *</label>
                  <input type="date" value={newLeave.end_date} onChange={e => setNewLeave({ ...newLeave, end_date: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                <textarea value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={addLeave} disabled={!newLeave.user_id || !newLeave.start_date || !newLeave.end_date} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
