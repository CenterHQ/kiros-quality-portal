'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import {
  QA_COLORS,
  LMS_TIER_LABELS,
  LMS_TIER_COLORS,
  type LmsPathway,
  type LmsPathwayEnrollment,
  type LmsPathwayModule,
  type LmsEnrollment,
  type LmsModuleTier,
} from '@/lib/types'

interface PathwayWithCount extends LmsPathway {
  module_count: number
}

export default function PathwaysPage() {
  const currentUser = useProfile()
  const supabase = createClient()

  const [pathways, setPathways] = useState<PathwayWithCount[]>([])
  const [enrollments, setEnrollments] = useState<LmsPathwayEnrollment[]>([])
  const [pathwayModules, setPathwayModules] = useState<LmsPathwayModule[]>([])
  const [moduleEnrollments, setModuleEnrollments] = useState<LmsEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  // Filters
  const [filterTier, setFilterTier] = useState<LmsModuleTier | 'all'>('all')
  const [filterQA, setFilterQA] = useState<number | 0>(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [pathwaysRes, enrollmentsRes, pathwayModulesRes, moduleEnrollmentsRes] = await Promise.all([
      supabase.from('lms_pathways').select('*').eq('status', 'published').order('title'),
      supabase.from('lms_pathway_enrollments').select('*').eq('user_id', currentUser.id),
      supabase.from('lms_pathway_modules').select('*, lms_modules(id, title)').order('sort_order'),
      supabase.from('lms_enrollments').select('*').eq('user_id', currentUser.id),
    ])

    if (pathwaysRes.data && pathwayModulesRes.data) {
      const moduleCounts = new Map<string, number>()
      for (const pm of pathwayModulesRes.data) {
        moduleCounts.set(pm.pathway_id, (moduleCounts.get(pm.pathway_id) || 0) + 1)
      }
      setPathways(
        pathwaysRes.data.map((p) => ({
          ...p,
          module_count: moduleCounts.get(p.id) || 0,
        }))
      )
    }
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data)
    if (pathwayModulesRes.data) setPathwayModules(pathwayModulesRes.data)
    if (moduleEnrollmentsRes.data) setModuleEnrollments(moduleEnrollmentsRes.data)
    setLoading(false)
  }

  function getEnrollment(pathwayId: string) {
    return enrollments.find((e) => e.pathway_id === pathwayId)
  }

  function getPathwayProgress(pathwayId: string): { completed: number; total: number } {
    const modules = pathwayModules.filter((pm) => pm.pathway_id === pathwayId)
    const total = modules.length
    const completed = modules.filter((pm) => {
      const enrollment = moduleEnrollments.find((me) => me.module_id === pm.module_id)
      return enrollment?.status === 'completed'
    }).length
    return { completed, total }
  }

  async function handleEnroll(pathwayId: string) {
    setEnrollingId(pathwayId)
    const { error } = await supabase.from('lms_pathway_enrollments').insert({
      user_id: currentUser.id,
      pathway_id: pathwayId,
      status: 'not_started',
    })
    if (!error) {
      await supabase.from('activity_log').insert({
        user_id: currentUser.id,
        action: 'enrolled_pathway',
        entity_type: 'lms_pathway',
        entity_id: pathwayId,
        details: 'Enrolled in learning pathway',
      })
      await loadData()
    }
    setEnrollingId(null)
  }

  const filtered = useMemo(() => {
    return pathways.filter((p) => {
      if (filterTier !== 'all' && p.tier !== filterTier) return false
      if (filterQA > 0 && !(p.related_qa || []).includes(filterQA)) return false
      return true
    })
  }, [pathways, filterTier, filterQA])

  const stats = useMemo(() => {
    const enrolled = enrollments.filter((e) => e.status !== 'completed').length
    const completed = enrollments.filter((e) => e.status === 'completed').length
    return { total: pathways.length, enrolled, completed }
  }, [pathways, enrollments])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Learning Pathways</h1>
        <p className="text-muted-foreground mt-1">Browse and enroll in structured learning paths to build your skills.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Pathways</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-sm text-muted-foreground">Enrolled</p>
          <p className="text-2xl font-bold text-primary">{stats.enrolled}</p>
        </div>
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value as LmsModuleTier | 'all')}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All Tiers</option>
          <option value="mandatory">Mandatory Compliance</option>
          <option value="core">Core Professional Development</option>
          <option value="advanced">Advanced / Exceeding</option>
        </select>
        <select
          value={filterQA}
          onChange={(e) => setFilterQA(Number(e.target.value))}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value={0}>All QA Areas</option>
          {[1, 2, 3, 4, 5, 6, 7].map((qa) => (
            <option key={qa} value={qa}>QA{qa}</option>
          ))}
        </select>
      </div>

      {/* Pathway Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <p className="text-muted-foreground">No pathways match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((pathway) => {
            const enrollment = getEnrollment(pathway.id)
            const progress = getPathwayProgress(pathway.id)
            const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
            const tierColor = pathway.tier ? LMS_TIER_COLORS[pathway.tier] : null

            return (
              <div
                key={pathway.id}
                className="bg-card rounded-xl shadow-sm border border-border flex flex-col overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Tier + QA badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {tierColor && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: tierColor.bg, color: tierColor.text }}
                      >
                        {LMS_TIER_LABELS[pathway.tier!]}
                      </span>
                    )}
                    {(pathway.related_qa || []).map((qa) => (
                      <span
                        key={qa}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: QA_COLORS[qa] || '#666' }}
                      >
                        QA{qa}
                      </span>
                    ))}
                  </div>

                  {/* Title + description */}
                  <h3 className="font-semibold text-foreground mb-1">{pathway.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                    {pathway.description || 'No description provided.'}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>{pathway.module_count} module{pathway.module_count !== 1 ? 's' : ''}</span>
                    {pathway.estimated_hours && (
                      <span>{pathway.estimated_hours}h estimated</span>
                    )}
                  </div>

                  {/* Progress bar (if enrolled) */}
                  {enrollment && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {progress.completed} of {progress.total} modules
                        </span>
                        <span className="font-medium text-primary">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: progressPercent === 100 ? '#22c55e' : 'hsl(var(--primary))',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  {enrollment ? (
                    <Link
                      href={`/learning/pathways/${pathway.id}`}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors"
                      style={{ backgroundColor: enrollment.status === 'completed' ? '#22c55e' : 'hsl(var(--primary))' }}
                    >
                      {enrollment.status === 'completed' ? 'View Completed' : 'Continue'}
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(pathway.id)}
                      disabled={enrollingId === pathway.id}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors disabled:opacity-50 border-primary text-primary"
                    >
                      {enrollingId === pathway.id ? 'Enrolling...' : 'Enroll'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
