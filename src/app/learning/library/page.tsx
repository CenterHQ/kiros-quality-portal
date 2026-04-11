'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import type {
  Profile,
  LmsModule,
  LmsEnrollment,
  LmsModuleTier,
} from '@/lib/types'
import {
  QA_COLORS,
  LMS_TIER_LABELS,
  LMS_TIER_COLORS,
  LMS_ENROLLMENT_STATUS_LABELS,
  LMS_CATEGORY_LABELS,
} from '@/lib/types'

type ModuleWithStats = LmsModule & {
  enrolled_count: number
  completed_count: number
  user_enrollment?: LmsEnrollment | null
}

export default function ModuleLibraryPage() {
  const supabase = createClient()
  const user = useProfile()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<LmsModule[]>([])
  const [enrollments, setEnrollments] = useState<LmsEnrollment[]>([])
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<LmsModuleTier | 'all'>('all')
  const [qaFilter, setQaFilter] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [enrollingModule, setEnrollingModule] = useState<string | null>(null)
  const [assignModule, setAssignModule] = useState<string | null>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)

  const isPrivileged = ['admin', 'manager', 'ns', 'el'].includes(user.role)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [modulesRes, myEnrollRes, allEnrollRes] = await Promise.all([
        supabase.from('lms_modules').select('*').eq('status', 'published').order('title'),
        supabase.from('lms_enrollments').select('*').eq('user_id', user.id),
        supabase.from('lms_enrollments').select('id, module_id, status'),
      ])
      if (modulesRes.data) setModules(modulesRes.data)
      if (myEnrollRes.data) setEnrollments(myEnrollRes.data)
      if (allEnrollRes.data) setAllEnrollments(allEnrollRes.data)
      if (isPrivileged) {
        const profilesRes = await supabase.from('profiles').select('*').order('full_name')
        if (profilesRes.data) setProfiles(profilesRes.data)
      }
    } catch (err) {
      console.error('Failed to load module library:', err)
    } finally {
      setLoading(false)
    }
  }, [user.id, isPrivileged])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Compute enrollment stats per module
  const enrollmentStats = useMemo(() => {
    const stats: Record<string, { enrolled: number; completed: number }> = {}
    for (const e of allEnrollments) {
      if (!stats[e.module_id]) stats[e.module_id] = { enrolled: 0, completed: 0 }
      stats[e.module_id].enrolled++
      if (e.status === 'completed') stats[e.module_id].completed++
    }
    return stats
  }, [allEnrollments])

  // User enrollment lookup
  const userEnrollmentMap = useMemo(() => {
    const map: Record<string, LmsEnrollment> = {}
    for (const e of enrollments) {
      map[e.module_id] = e
    }
    return map
  }, [enrollments])

  // Available categories from modules
  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const m of modules) {
      if (m.category) cats.add(m.category)
    }
    return Array.from(cats).sort()
  }, [modules])

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        if (!m.title.toLowerCase().includes(q) && !(m.description || '').toLowerCase().includes(q)) return false
      }
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false
      if (qaFilter !== null && !(m.related_qa || []).includes(qaFilter)) return false
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
      return true
    })
  }, [modules, search, tierFilter, qaFilter, categoryFilter])

  // Tier breakdown
  const tierCounts = useMemo(() => {
    const counts = { mandatory: 0, core: 0, advanced: 0 }
    for (const m of modules) {
      if (counts[m.tier] !== undefined) counts[m.tier]++
    }
    return counts
  }, [modules])

  async function handleSelfEnroll(moduleId: string) {
    setEnrollingModule(moduleId)
    try {
      const { data, error } = await supabase
        .from('lms_enrollments')
        .insert({
          user_id: user.id,
          module_id: moduleId,
          status: 'not_started',
        })
        .select()
        .single()

      if (error) throw error

      // Log activity
      const { error: logError } = await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'self_enrolled',
        entity_type: 'lms_enrollment',
        entity_id: data.id,
        details: `Self-enrolled in module`,
      })
      if (logError) console.error('Failed to log enrollment:', logError)

      // Refresh enrollments
      setEnrollments(prev => [...prev, data])
      setAllEnrollments(prev => [...prev, data])
    } catch (err) {
      console.error('Failed to enroll:', err)
      toast({ type: 'warning', message: 'Failed to enrol. You may already be enrolled in this module.' })
    } finally {
      setEnrollingModule(null)
    }
  }

  async function handleAssign(moduleId: string) {
    if (!assignUserId) return
    setAssignLoading(true)
    try {
      const { data, error } = await supabase
        .from('lms_enrollments')
        .insert({
          user_id: assignUserId,
          module_id: moduleId,
          status: 'not_started',
          assigned_by: user.id,
          due_date: assignDueDate || null,
        })
        .select()
        .single()

      if (error) throw error

      const { error: logError2 } = await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'assigned_module',
        entity_type: 'lms_enrollment',
        entity_id: data.id,
        details: `Assigned module to user ${assignUserId}`,
      })
      if (logError2) console.error('Failed to log module assignment:', logError2)

      setAllEnrollments(prev => [...prev, data])
      if (assignUserId === user.id) {
        setEnrollments(prev => [...prev, data])
      }
      setAssignModule(null)
      setAssignUserId('')
      setAssignDueDate('')
    } catch (err) {
      console.error('Failed to assign:', err)
      toast({ type: 'warning', message: 'Failed to assign module. The user may already be enrolled.' })
    } finally {
      setAssignLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Module Library</h1>
          <p className="text-muted-foreground mt-1">Browse and enrol in training modules</p>
        </div>
        <Link
          href="/learning"
          className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors text-sm font-medium"
        >
          Back to Learning Hub
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-card rounded-xl shadow-sm border border-border px-4 py-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="text-lg font-bold text-foreground">{modules.length}</span>
        </div>
        {(Object.entries(tierCounts) as [LmsModuleTier, number][]).map(([tier, count]) => (
          <div
            key={tier}
            className="rounded-xl shadow-sm border px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: LMS_TIER_COLORS[tier].bg, borderColor: LMS_TIER_COLORS[tier].text + '30' }}
          >
            <span className="text-sm" style={{ color: LMS_TIER_COLORS[tier].text }}>{LMS_TIER_LABELS[tier]}:</span>
            <span className="text-lg font-bold" style={{ color: LMS_TIER_COLORS[tier].text }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search modules by title or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* Tier Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1.5">Tier:</span>
          <button
            onClick={() => setTierFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tierFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            All
          </button>
          {(['mandatory', 'core', 'advanced'] as LmsModuleTier[]).map(tier => (
            <button
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: tierFilter === tier ? LMS_TIER_COLORS[tier].text : LMS_TIER_COLORS[tier].bg,
                color: tierFilter === tier ? '#fff' : LMS_TIER_COLORS[tier].text,
              }}
            >
              {LMS_TIER_LABELS[tier]}
            </button>
          ))}
        </div>

        {/* QA Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground py-1.5">QA Area:</span>
          {[1, 2, 3, 4, 5, 6, 7].map(qa => (
            <button
              key={qa}
              onClick={() => setQaFilter(qaFilter === qa ? null : qa)}
              className="w-8 h-8 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: qaFilter === qa ? QA_COLORS[qa] : QA_COLORS[qa] + '20',
                color: qaFilter === qa ? '#fff' : QA_COLORS[qa],
                border: `2px solid ${QA_COLORS[qa]}`,
              }}
            >
              {qa}
            </button>
          ))}
          {qaFilter !== null && (
            <button
              onClick={() => setQaFilter(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-accent"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-border rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{LMS_CATEGORY_LABELS[cat] || cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} found</p>

      {/* Module Grid */}
      {filteredModules.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <p className="text-muted-foreground">No modules match your filters. Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map(mod => {
            const stats = enrollmentStats[mod.id]
            const userEnrollment = userEnrollmentMap[mod.id]
            const tierColor = LMS_TIER_COLORS[mod.tier]
            const isEnrolling = enrollingModule === mod.id
            const isAssigning = assignModule === mod.id

            return (
              <div key={mod.id} className="bg-card rounded-xl shadow-sm border border-border p-5 flex flex-col">
                {/* Tier Badge */}
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tierColor.bg, color: tierColor.text }}
                  >
                    {LMS_TIER_LABELS[mod.tier]}
                  </span>
                  {userEnrollment && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      userEnrollment.status === 'completed' ? 'bg-green-100 text-green-700' :
                      userEnrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      userEnrollment.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {LMS_ENROLLMENT_STATUS_LABELS[userEnrollment.status]}
                    </span>
                  )}
                </div>

                {/* Title */}
                <Link href={`/learning/modules/${mod.id}`} className="hover:underline">
                  <h3 className="font-semibold text-foreground text-sm mb-1">{mod.title}</h3>
                </Link>

                {/* Description */}
                {mod.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                )}

                {/* QA Badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {mod.related_qa?.map(qa => (
                    <span
                      key={qa}
                      className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold"
                      style={{ backgroundColor: QA_COLORS[qa] || '#999' }}
                    >
                      {qa}
                    </span>
                  ))}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                  <span>{mod.duration_minutes} min</span>
                  {mod.category && <span>{LMS_CATEGORY_LABELS[mod.category] || mod.category}</span>}
                  {mod.renewal_frequency && mod.renewal_frequency !== 'once' && (
                    <span className="text-amber-600">Renews: {mod.renewal_frequency}</span>
                  )}
                </div>

                {/* Enrollment stats */}
                {stats && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {stats.enrolled} enrolled &middot; {stats.completed} completed
                  </p>
                )}

                {/* Actions */}
                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {!userEnrollment && (
                    <button
                      onClick={() => handleSelfEnroll(mod.id)}
                      disabled={isEnrolling}
                      className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isEnrolling ? 'Enrolling...' : 'Enrol'}
                    </button>
                  )}
                  {userEnrollment && userEnrollment.status !== 'completed' && (
                    <Link
                      href={`/learning/modules/${mod.id}`}
                      className="flex-1 px-3 py-2 bg-primary/80 text-primary-foreground rounded-lg text-xs font-medium text-center hover:bg-primary transition-colors"
                    >
                      Continue
                    </Link>
                  )}
                  {userEnrollment && userEnrollment.status === 'completed' && (
                    <Link
                      href={`/learning/modules/${mod.id}`}
                      className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium text-center hover:bg-accent transition-colors"
                    >
                      Review
                    </Link>
                  )}

                  {isPrivileged && (
                    <button
                      onClick={() => setAssignModule(isAssigning ? null : mod.id)}
                      className="px-3 py-2 border border-primary text-primary rounded-lg text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>

                {/* Assign dropdown */}
                {isAssigning && isPrivileged && (
                  <div className="mt-3 p-3 bg-muted rounded-lg border border-border space-y-2">
                    <select
                      value={assignUserId}
                      onChange={e => setAssignUserId(e.target.value)}
                      className="w-full border border-border rounded-lg text-xs px-2 py-1.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="">Select staff member...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={assignDueDate}
                      onChange={e => setAssignDueDate(e.target.value)}
                      placeholder="Due date (optional)"
                      className="w-full border border-border rounded-lg text-xs px-2 py-1.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(mod.id)}
                        disabled={!assignUserId || assignLoading}
                        className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {assignLoading ? 'Assigning...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setAssignModule(null); setAssignUserId(''); setAssignDueDate('') }}
                        className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
