'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'
import type {
  Profile,
  LmsModule,
  LmsEnrollment,
  LmsPathway,
  LmsPathwayEnrollment,
  StaffQualification,
} from '@/lib/types'
import CentreContextPanel from '@/components/CentreContextPanel'
import {
  QA_COLORS,
  LMS_TIER_LABELS,
  LMS_TIER_COLORS,
  LMS_ENROLLMENT_STATUS_LABELS,
  QUALIFICATION_LABELS,
  ROLE_LABELS,
} from '@/lib/types'

type EnrollmentWithModule = LmsEnrollment & { lms_modules: LmsModule }
type PathwayEnrollmentWithPathway = LmsPathwayEnrollment & { lms_pathways: LmsPathway }

export default function LearningHubPage() {
  const supabase = createClient()
  const user = useProfile()

  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<EnrollmentWithModule[]>([])
  const [pathwayEnrollments, setPathwayEnrollments] = useState<PathwayEnrollmentWithPathway[]>([])
  const [qualifications, setQualifications] = useState<StaffQualification[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentWithModule[]>([])
  const [allQualifications, setAllQualifications] = useState<StaffQualification[]>([])
  const [pathwayModuleCounts, setPathwayModuleCounts] = useState<Record<string, { total: number; completed: number }>>({})

  const isPrivileged = ['admin', 'manager', 'ns', 'el'].includes(user.role)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [enrollRes, pathwayEnrollRes, qualsRes] = await Promise.all([
        supabase.from('lms_enrollments').select('*, lms_modules(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('lms_pathway_enrollments').select('*, lms_pathways(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('staff_qualifications').select('*').eq('user_id', user.id),
      ])

      if (enrollRes.data) setEnrollments(enrollRes.data)
      if (pathwayEnrollRes.data) setPathwayEnrollments(pathwayEnrollRes.data)
      if (qualsRes.data) setQualifications(qualsRes.data)

      if (isPrivileged) {
        const [profRes, allEnrollRes, allQualsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('lms_enrollments').select('*, lms_modules(*)').order('created_at', { ascending: false }),
          supabase.from('staff_qualifications').select('*, profiles(full_name, role)'),
        ])
        if (profRes.data) setAllProfiles(profRes.data)
        if (allEnrollRes.data) setAllEnrollments(allEnrollRes.data)
        if (allQualsRes.data) setAllQualifications(allQualsRes.data)
      }

      // Load pathway module counts for enrolled pathways
      if (pathwayEnrollRes.data && pathwayEnrollRes.data.length > 0) {
        const pathwayIds = pathwayEnrollRes.data.map((pe: PathwayEnrollmentWithPathway) => pe.pathway_id)
        const { data: pathwayModules } = await supabase
          .from('lms_pathway_modules')
          .select('pathway_id, module_id')
          .in('pathway_id', pathwayIds)

        if (pathwayModules && enrollRes.data) {
          const counts: Record<string, { total: number; completed: number }> = {}
          const completedModuleIds = new Set(
            enrollRes.data
              .filter((e: EnrollmentWithModule) => e.status === 'completed')
              .map((e: EnrollmentWithModule) => e.module_id)
          )
          for (const pm of pathwayModules) {
            if (!counts[pm.pathway_id]) counts[pm.pathway_id] = { total: 0, completed: 0 }
            counts[pm.pathway_id].total++
            if (completedModuleIds.has(pm.module_id)) counts[pm.pathway_id].completed++
          }
          setPathwayModuleCounts(counts)
        }
      }
    } catch (err) {
      console.error('Failed to load learning hub data:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const completedEnrollments = useMemo(
    () => enrollments.filter(e => e.status === 'completed'),
    [enrollments]
  )
  const activeEnrollments = useMemo(
    () => enrollments.filter(e => e.status === 'not_started' || e.status === 'in_progress'),
    [enrollments]
  )
  const overdueEnrollments = useMemo(
    () => enrollments.filter(e => e.due_date && e.due_date < today && e.status !== 'completed'),
    [enrollments, today]
  )
  const totalHours = useMemo(
    () => completedEnrollments.reduce((sum, e) => sum + (e.lms_modules?.duration_minutes || 0), 0) / 60,
    [completedEnrollments]
  )
  const recentlyCompleted = useMemo(
    () => completedEnrollments.slice(0, 5),
    [completedEnrollments]
  )

  // Team stats
  const teamStats = useMemo(() => {
    if (!isPrivileged) return null
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const completedThisMonth = allEnrollments.filter(
      e => e.status === 'completed' && e.completed_at && e.completed_at >= monthStart
    ).length
    const overdueCount = allEnrollments.filter(
      e => e.due_date && e.due_date < today && e.status !== 'completed'
    ).length
    const complianceGaps = allQualifications.filter(
      q => q.status === 'expired' || q.status === 'expiring_soon'
    ).length
    return {
      totalStaff: allProfiles.length,
      completedThisMonth,
      overdueCount,
      complianceGaps,
    }
  }, [isPrivileged, allProfiles, allEnrollments, allQualifications, today])

  // Staff compliance grouped by user
  const staffComplianceMap = useMemo(() => {
    if (!isPrivileged) return null
    const map: Record<string, { profile: any; qualifications: StaffQualification[] }> = {}
    for (const q of allQualifications) {
      const uid = q.user_id
      if (!map[uid]) {
        const p = allProfiles.find(pr => pr.id === uid)
        map[uid] = { profile: p || { full_name: 'Unknown', role: 'educator' }, qualifications: [] }
      }
      map[uid].qualifications.push(q)
    }
    return Object.values(map)
  }, [isPrivileged, allProfiles, allQualifications])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Hub</h1>
          <p className="text-muted-foreground mt-1">Track your professional development and compliance training</p>
        </div>
        <Link
          href="/learning/library"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Browse Module Library
        </Link>
      </div>

      {/* My Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{completedEnrollments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">modules finished</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <p className="text-sm text-muted-foreground">In Progress</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{activeEnrollments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">modules active</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdueEnrollments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">past due date</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-3xl font-bold text-primary mt-1">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">learning hours</p>
        </div>
      </div>

      {/* Compliance Alerts */}
      {qualifications.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Compliance Alerts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {qualifications.map(q => {
              const isExpired = q.status === 'expired'
              const isExpiring = q.status === 'expiring_soon'
              const bgColor = isExpired ? 'bg-red-50 border-red-200' : isExpiring ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
              const dotColor = isExpired ? 'bg-red-500' : isExpiring ? 'bg-amber-500' : 'bg-green-500'
              const textColor = isExpired ? 'text-red-700' : isExpiring ? 'text-amber-700' : 'text-green-700'
              const statusLabel = isExpired ? 'Expired' : isExpiring ? 'Expiring Soon' : 'Current'
              return (
                <div key={q.id} className={`rounded-xl border p-4 ${bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    <span className={`text-sm font-semibold ${textColor}`}>{statusLabel}</span>
                  </div>
                  <p className="font-medium text-foreground text-sm">{QUALIFICATION_LABELS[q.qualification_type] || q.qualification_type}</p>
                  {q.expiry_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isExpired ? 'Expired' : 'Expires'}: {new Date(q.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My Current Modules */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">My Current Modules</h2>
        {activeEnrollments.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm border border-border p-8 text-center">
            <p className="text-muted-foreground">No active modules. Browse the <Link href="/learning/library" className="text-primary underline">Module Library</Link> to enrol.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEnrollments.map(enrollment => {
              const mod = enrollment.lms_modules
              if (!mod) return null
              const isOverdue = enrollment.due_date && enrollment.due_date < today
              const tierColor = LMS_TIER_COLORS[mod.tier]
              return (
                <Link
                  key={enrollment.id}
                  href={`/learning/modules/${mod.id}`}
                  className="bg-card rounded-xl shadow-sm border border-border p-5 hover:shadow-md transition-shadow block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: tierColor.bg, color: tierColor.text }}
                    >
                      {LMS_TIER_LABELS[mod.tier]}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      enrollment.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {LMS_ENROLLMENT_STATUS_LABELS[enrollment.status]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-2 line-clamp-2">{mod.title}</h3>
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{mod.duration_minutes} min</span>
                    {enrollment.due_date && (
                      <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                        Due: {new Date(enrollment.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-6">
        <CentreContextPanel
          contextTypes={['qip_goal', 'teaching_approach', 'leadership_goal']}
          title="Learning Priorities from QIP"
          limit={3}
        />
      </div>

      {/* My Pathways */}
      {pathwayEnrollments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">My Pathways</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pathwayEnrollments.map(pe => {
              const pathway = pe.lms_pathways
              if (!pathway) return null
              const counts = pathwayModuleCounts[pe.pathway_id]
              const progress = counts && counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0
              return (
                <div key={pe.id} className="bg-card rounded-xl shadow-sm border border-border p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-sm">{pathway.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pe.status === 'completed' ? 'bg-green-100 text-green-700' :
                      pe.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {pe.status === 'completed' ? 'Completed' : pe.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                  {pathway.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pathway.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pathway.related_qa?.map(qa => (
                      <span
                        key={qa}
                        className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                        style={{ backgroundColor: QA_COLORS[qa] || '#999' }}
                      >
                        {qa}
                      </span>
                    ))}
                  </div>
                  {counts && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{counts.completed} of {counts.total} modules</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {pathway.estimated_hours && (
                    <p className="text-xs text-muted-foreground mt-2">Estimated: {pathway.estimated_hours}h</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {recentlyCompleted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Recently Completed</h2>
          <div className="bg-card rounded-xl shadow-sm border border-border divide-y divide-border/50">
            {recentlyCompleted.map(enrollment => {
              const mod = enrollment.lms_modules
              if (!mod) return null
              return (
                <div key={enrollment.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed: {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {enrollment.score !== null && enrollment.score !== undefined && (
                    <span className="text-sm font-semibold text-primary">{enrollment.score}%</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Overview - Privileged roles only */}
      {isPrivileged && teamStats && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Team Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl shadow-sm border border-border p-5">
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-3xl font-bold text-foreground mt-1">{teamStats.totalStaff}</p>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-5">
              <p className="text-sm text-muted-foreground">Completed This Month</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{teamStats.completedThisMonth}</p>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-5">
              <p className="text-sm text-muted-foreground">Overdue Assignments</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{teamStats.overdueCount}</p>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-5">
              <p className="text-sm text-muted-foreground">Compliance Gaps</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{teamStats.complianceGaps}</p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Compliance Summary - Privileged roles only */}
      {isPrivileged && staffComplianceMap && staffComplianceMap.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Staff Compliance Summary</h2>
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Staff Member</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Role</th>
                  <th className="text-center px-4 py-3 font-medium text-foreground">Qualifications</th>
                  <th className="text-center px-4 py-3 font-medium text-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {staffComplianceMap.map((entry, idx) => {
                  const expired = entry.qualifications.filter(q => q.status === 'expired').length
                  const expiring = entry.qualifications.filter(q => q.status === 'expiring_soon').length
                  const current = entry.qualifications.filter(q => q.status === 'current').length
                  return (
                    <tr key={idx} className="hover:bg-accent">
                      <td className="px-4 py-3 font-medium text-foreground">{entry.profile.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[entry.profile.role] || entry.profile.role}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {entry.qualifications.map(q => {
                            const color = q.status === 'expired' ? 'bg-red-500' : q.status === 'expiring_soon' ? 'bg-amber-500' : 'bg-green-500'
                            return (
                              <span
                                key={q.id}
                                title={`${QUALIFICATION_LABELS[q.qualification_type] || q.qualification_type} - ${q.status}`}
                                className={`w-3 h-3 rounded-full ${color} inline-block`}
                              />
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {expired > 0 && <span className="text-xs font-semibold text-red-600">{expired} expired</span>}
                          {expiring > 0 && <span className="text-xs font-semibold text-amber-600">{expiring} expiring</span>}
                          {expired === 0 && expiring === 0 && <span className="text-xs font-semibold text-green-600">All current</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
