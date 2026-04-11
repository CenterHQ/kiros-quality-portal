'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import {
  QA_COLORS,
  LMS_TIER_LABELS,
  LMS_TIER_COLORS,
  type LmsPathway,
  type LmsPathwayModule,
  type LmsPathwayEnrollment,
  type LmsEnrollment,
  type LmsModule,
} from '@/lib/types'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/components/ui/toast'

interface PathwayModuleRow extends LmsPathwayModule {
  lms_modules: LmsModule
}

export default function PathwayDetailPage() {
  const params = useParams()
  const pathwayId = params.id as string
  const currentUser = useProfile()
  const { toast } = useToast()
  const supabase = createClient()

  const [pathway, setPathway] = useState<LmsPathway | null>(null)
  const [modules, setModules] = useState<PathwayModuleRow[]>([])
  const [enrollment, setEnrollment] = useState<LmsPathwayEnrollment | null>(null)
  const [moduleEnrollments, setModuleEnrollments] = useState<LmsEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [startingModuleId, setStartingModuleId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [pathwayRes, modulesRes, enrollmentRes] = await Promise.all([
      supabase.from('lms_pathways').select('*').eq('id', pathwayId).single(),
      supabase
        .from('lms_pathway_modules')
        .select('*, lms_modules(*)')
        .eq('pathway_id', pathwayId)
        .order('sort_order'),
      supabase
        .from('lms_pathway_enrollments')
        .select('*')
        .eq('pathway_id', pathwayId)
        .eq('user_id', currentUser.id)
        .maybeSingle(),
    ])

    if (pathwayRes.data) setPathway(pathwayRes.data)
    if (modulesRes.data) {
      const mods = modulesRes.data as PathwayModuleRow[]
      setModules(mods)
      // Fetch module enrollments for all modules in this pathway
      const moduleIds = mods.map((m) => m.module_id)
      if (moduleIds.length > 0) {
        const { data: meData } = await supabase
          .from('lms_enrollments')
          .select('*')
          .eq('user_id', currentUser.id)
          .in('module_id', moduleIds)
        if (meData) setModuleEnrollments(meData)
      }
    }
    if (enrollmentRes.data) setEnrollment(enrollmentRes.data)
    setLoading(false)
  }, [pathwayId, currentUser.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  function getModuleEnrollment(moduleId: string): LmsEnrollment | undefined {
    return moduleEnrollments.find((me) => me.module_id === moduleId)
  }

  async function handleStartModule(moduleId: string) {
    setStartingModuleId(moduleId)

    // Auto-create module enrollment if none exists
    const existing = getModuleEnrollment(moduleId)
    if (!existing) {
      const { error } = await supabase.from('lms_enrollments').insert({
        user_id: currentUser.id,
        module_id: moduleId,
        status: 'not_started',
      })
      if (error) {
        toast({ type: 'error', message: 'Failed to create module enrollment' })
        setStartingModuleId(null)
        return
      }
    }

    // Ensure pathway enrollment exists and is in_progress
    if (!enrollment) {
      const { error } = await supabase.from('lms_pathway_enrollments').insert({
        user_id: currentUser.id,
        pathway_id: pathwayId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      if (error) {
        toast({ type: 'error', message: 'Failed to create pathway enrollment' })
        setStartingModuleId(null)
        return
      }
    } else if (enrollment.status === 'not_started') {
      await supabase
        .from('lms_pathway_enrollments')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', enrollment.id)
    }

    const { error: logErr } = await supabase.from('activity_log').insert({
      user_id: currentUser.id,
      action: 'started_module',
      entity_type: 'lms_module',
      entity_id: moduleId,
      details: `Started module from pathway ${pathwayId}`,
    })
    if (logErr) console.error('Failed to log activity:', logErr)

    setStartingModuleId(null)
    // Navigate to the module
    window.location.href = `/learning/modules/${moduleId}`
  }

  // Check if pathway should be marked complete
  useEffect(() => {
    if (!enrollment || enrollment.status === 'completed' || modules.length === 0) return

    const requiredModules = modules.filter((m) => m.is_required)
    const allRequiredCompleted = requiredModules.every((m) => {
      const me = getModuleEnrollment(m.module_id)
      return me?.status === 'completed'
    })

    if (requiredModules.length > 0 && allRequiredCompleted) {
      supabase
        .from('lms_pathway_enrollments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', enrollment.id)
        .then(() => {
          supabase.from('activity_log').insert({
            user_id: currentUser.id,
            action: 'completed_pathway',
            entity_type: 'lms_pathway',
            entity_id: pathwayId,
            details: 'Completed all required modules in pathway',
          })
          loadData()
        })
    }
  }, [moduleEnrollments, modules, enrollment])

  const completedCount = modules.filter((m) => {
    const me = getModuleEnrollment(m.module_id)
    return me?.status === 'completed'
  }).length
  const totalCount = modules.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="h-8 bg-muted rounded w-96" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!pathway) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Pathway not found.</p>
        <Link href="/learning/pathways" className="text-sm mt-2 inline-block text-primary">
          Back to Pathways
        </Link>
      </div>
    )
  }

  const tierColor = pathway.tier ? LMS_TIER_COLORS[pathway.tier] : null

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: 'Learning', href: '/learning' },
        { label: 'Pathways', href: '/learning/pathways' },
        { label: pathway.title },
      ]} />

      {/* Back link */}
      <Link
        href="/learning/pathways"
        className="inline-flex items-center text-sm font-medium mb-4 hover:underline text-primary"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Pathways
      </Link>

      {/* Header card */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
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
          {enrollment?.status === 'completed' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Completed
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">{pathway.title}</h1>
        <p className="text-muted-foreground mb-4">{pathway.description || 'No description provided.'}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span>{totalCount} module{totalCount !== 1 ? 's' : ''}</span>
          {pathway.estimated_hours && <span>{pathway.estimated_hours}h estimated</span>}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground font-medium">
              {completedCount} of {totalCount} modules completed
            </span>
            <span className={`font-semibold ${progressPercent === 100 ? 'text-green-500' : 'text-primary'}`}>
              {progressPercent}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? '#22c55e' : 'hsl(var(--primary))',
              }}
            />
          </div>
        </div>
      </div>

      {/* Module List */}
      <h2 className="text-lg font-semibold text-foreground mb-3">Modules</h2>
      <div className="space-y-3">
        {modules.map((pm, index) => {
          const mod = pm.lms_modules
          const me = getModuleEnrollment(pm.module_id)
          const status = me?.status || 'not_started'
          const modTierColor = mod?.tier ? LMS_TIER_COLORS[mod.tier] : null

          return (
            <div
              key={pm.id}
              className="bg-card rounded-xl shadow-sm border border-border p-4 flex items-center gap-4"
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
                {status === 'completed' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : status === 'in_progress' ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-foreground truncate">
                    {mod?.title || 'Unknown Module'}
                  </h3>
                  {pm.is_required && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600">
                      Required
                    </span>
                  )}
                  {modTierColor && (
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: modTierColor.bg, color: modTierColor.text }}
                    >
                      {mod?.tier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {mod?.duration_minutes && <span>{mod.duration_minutes} min</span>}
                  {status === 'completed' && me?.completed_at && (
                    <span className="text-green-600">
                      Completed {new Date(me.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                {status === 'completed' ? (
                  <Link
                    href={`/learning/modules/${pm.module_id}`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    Review
                  </Link>
                ) : status === 'in_progress' ? (
                  <Link
                    href={`/learning/modules/${pm.module_id}`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors bg-primary"
                  >
                    Continue
                  </Link>
                ) : (
                  <button
                    onClick={() => handleStartModule(pm.module_id)}
                    disabled={startingModuleId === pm.module_id}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors disabled:opacity-50 border-primary text-primary"
                  >
                    {startingModuleId === pm.module_id ? 'Starting...' : 'Start Module'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modules.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <p className="text-muted-foreground">No modules have been added to this pathway yet.</p>
        </div>
      )}
    </div>
  )
}
