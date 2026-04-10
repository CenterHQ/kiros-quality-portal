'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import type {
  Profile,
  LmsModule,
  LmsEnrollment,
  LmsCertificate,
  StaffQualification,
  QualificationType,
} from '@/lib/types'
import {
  QUALIFICATION_LABELS,
  ROLE_LABELS,
  QA_COLORS,
} from '@/lib/types'

type EnrollmentWithModule = LmsEnrollment & { lms_modules: LmsModule }
type QualWithProfile = StaffQualification & { profiles?: Pick<Profile, 'full_name' | 'role'> }
type CertWithProfile = LmsCertificate & { profiles?: Pick<Profile, 'full_name' | 'role'> }

const QUAL_COLUMNS: QualificationType[] = [
  'first_aid', 'cpr', 'anaphylaxis', 'asthma', 'child_protection', 'wwcc', 'food_safety',
]

function computeQualStatus(q: StaffQualification): 'current' | 'expiring_soon' | 'expired' | 'not_recorded' {
  if (!q.expiry_date) return q.status === 'current' ? 'current' : 'not_recorded'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(q.expiry_date)
  if (expiry < today) return 'expired'
  const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 30) return 'expiring_soon'
  return 'current'
}

function computeCertStatus(c: { expiry_date?: string | null }): 'current' | 'expiring_soon' | 'expired' {
  if (!c.expiry_date) return 'current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(c.expiry_date)
  if (expiry < today) return 'expired'
  const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 30) return 'expiring_soon'
  return 'current'
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    current: 'bg-green-500',
    completed: 'bg-green-500',
    expiring_soon: 'bg-amber-500',
    expired: 'bg-red-500',
    not_recorded: 'bg-gray-300',
    in_progress: 'bg-blue-500',
    overdue: 'bg-red-500',
    not_enrolled: 'bg-gray-300',
  }
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[status] || 'bg-gray-300'}`}
      title={status.replace(/_/g, ' ')}
    />
  )
}

export default function StaffTrainingMatrixPage() {
  const supabase = createClient()
  const user = useProfile()

  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [qualifications, setQualifications] = useState<QualWithProfile[]>([])
  const [mandatoryModules, setMandatoryModules] = useState<LmsModule[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentWithModule[]>([])
  const [certificates, setCertificates] = useState<CertWithProfile[]>([])
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; qualType: QualificationType } | null>(null)
  const [selectedModuleCell, setSelectedModuleCell] = useState<{ staffId: string; moduleId: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  const isPrivileged = ['admin', 'manager', 'ns', 'el'].includes(user.role)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const profileQuery = isPrivileged
        ? supabase.from('profiles').select('*').order('full_name')
        : supabase.from('profiles').select('*').eq('id', user.id)

      const qualQuery = isPrivileged
        ? supabase.from('staff_qualifications').select('*, profiles(full_name, role)')
        : supabase.from('staff_qualifications').select('*, profiles(full_name, role)').eq('user_id', user.id)

      const enrollQuery = isPrivileged
        ? supabase.from('lms_enrollments').select('*, lms_modules(*)')
        : supabase.from('lms_enrollments').select('*, lms_modules(*)').eq('user_id', user.id)

      const certQuery = isPrivileged
        ? supabase.from('lms_certificates').select('*, profiles(full_name, role)')
        : supabase.from('lms_certificates').select('*, profiles(full_name, role)').eq('user_id', user.id)

      const [profileRes, qualRes, moduleRes, enrollRes, certRes] = await Promise.all([
        profileQuery,
        qualQuery,
        supabase.from('lms_modules').select('*').eq('tier', 'mandatory').eq('status', 'published').order('title'),
        enrollQuery,
        certQuery,
      ])

      if (profileRes.data) setProfiles(profileRes.data)
      if (qualRes.data) setQualifications(qualRes.data as QualWithProfile[])
      if (moduleRes.data) setMandatoryModules(moduleRes.data)
      if (enrollRes.data) setEnrollments(enrollRes.data as EnrollmentWithModule[])
      if (certRes.data) setCertificates(certRes.data as CertWithProfile[])
    } catch (err) {
      console.error('Error loading training matrix data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build qualification lookup: staffId -> qualType -> qualification
  const qualLookup = useMemo(() => {
    const map: Record<string, Record<string, StaffQualification>> = {}
    for (const q of qualifications) {
      if (!map[q.user_id]) map[q.user_id] = {}
      map[q.user_id][q.qualification_type] = q
    }
    return map
  }, [qualifications])

  // Build enrollment lookup: staffId -> moduleId -> enrollment
  const enrollLookup = useMemo(() => {
    const map: Record<string, Record<string, LmsEnrollment>> = {}
    for (const e of enrollments) {
      if (!map[e.user_id]) map[e.user_id] = {}
      map[e.user_id][e.module_id] = e
    }
    return map
  }, [enrollments])

  // Compliance stats
  const stats = useMemo(() => {
    const totalStaff = profiles.length
    let fullyCompliant = 0
    let gaps = 0
    let expiringSoon = 0

    for (const p of profiles) {
      const staffQuals = qualLookup[p.id] || {}
      const staffEnrolls = enrollLookup[p.id] || {}
      let hasGap = false

      // Check qualifications
      for (const qt of QUAL_COLUMNS) {
        const q = staffQuals[qt]
        if (!q) { hasGap = true; gaps++; continue }
        const s = computeQualStatus(q)
        if (s === 'expired' || s === 'not_recorded') { hasGap = true; gaps++ }
        if (s === 'expiring_soon') expiringSoon++
      }

      // Check mandatory modules
      for (const m of mandatoryModules) {
        const e = staffEnrolls[m.id]
        if (!e || e.status !== 'completed') { hasGap = true; gaps++ }
      }

      if (!hasGap) fullyCompliant++
    }

    // Also count certificate expirations
    for (const c of certificates) {
      if (c.expiry_date) {
        const d = daysUntil(c.expiry_date)
        if (d > 0 && d <= 30) expiringSoon++
      }
    }

    return { totalStaff, fullyCompliant, gaps, expiringSoon }
  }, [profiles, qualLookup, enrollLookup, mandatoryModules, certificates])

  // Expiry alerts: qualifications + certificates within 60 days
  const expiryAlerts = useMemo(() => {
    const alerts: Array<{
      staffName: string
      item: string
      expiryDate: string
      daysRemaining: number
      type: 'qualification' | 'certificate'
    }> = []

    for (const q of qualifications) {
      if (!q.expiry_date) continue
      const d = daysUntil(q.expiry_date)
      if (d <= 60) {
        alerts.push({
          staffName: q.profiles?.full_name || 'Unknown',
          item: QUALIFICATION_LABELS[q.qualification_type] || q.qualification_type,
          expiryDate: q.expiry_date,
          daysRemaining: d,
          type: 'qualification',
        })
      }
    }

    for (const c of certificates) {
      if (!c.expiry_date) continue
      const d = daysUntil(c.expiry_date)
      if (d <= 60) {
        alerts.push({
          staffName: c.profiles?.full_name || 'Unknown',
          item: c.title,
          expiryDate: c.expiry_date,
          daysRemaining: d,
          type: 'certificate',
        })
      }
    }

    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
    return alerts
  }, [qualifications, certificates])

  // Module completion summary: moduleId -> { completed, total }
  const moduleSummary = useMemo(() => {
    const summary: Record<string, { completed: number; total: number }> = {}
    for (const m of mandatoryModules) {
      let completed = 0
      for (const p of profiles) {
        const e = enrollLookup[p.id]?.[m.id]
        if (e?.status === 'completed') completed++
      }
      summary[m.id] = { completed, total: profiles.length }
    }
    return summary
  }, [mandatoryModules, profiles, enrollLookup])

  function getEnrollmentDisplayStatus(e: LmsEnrollment | undefined): string {
    if (!e) return 'not_enrolled'
    if (e.status === 'completed') return 'completed'
    if (e.status === 'in_progress') return 'in_progress'
    if (e.due_date && daysUntil(e.due_date) < 0) return 'overdue'
    return e.status
  }

  const exportCSV = useCallback(() => {
    setExporting(true)
    try {
      const headers = [
        'Staff Name', 'Role',
        ...QUAL_COLUMNS.map(qt => `${QUALIFICATION_LABELS[qt]} Status`),
        ...QUAL_COLUMNS.map(qt => `${QUALIFICATION_LABELS[qt]} Expiry`),
        ...mandatoryModules.map(m => `${m.title} Status`),
        ...mandatoryModules.map(m => `${m.title} Completed`),
      ]

      const rows = profiles.map(p => {
        const staffQuals = qualLookup[p.id] || {}
        const staffEnrolls = enrollLookup[p.id] || {}
        return [
          p.full_name,
          ROLE_LABELS[p.role] || p.role,
          ...QUAL_COLUMNS.map(qt => {
            const q = staffQuals[qt]
            return q ? computeQualStatus(q) : 'not_recorded'
          }),
          ...QUAL_COLUMNS.map(qt => {
            const q = staffQuals[qt]
            return q?.expiry_date || ''
          }),
          ...mandatoryModules.map(m => {
            const e = staffEnrolls[m.id]
            return getEnrollmentDisplayStatus(e)
          }),
          ...mandatoryModules.map(m => {
            const e = staffEnrolls[m.id]
            return e?.completed_at || ''
          }),
        ]
      })

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff-training-matrix-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [profiles, qualLookup, enrollLookup, mandatoryModules])

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Training Matrix</h1>
          <p className="text-gray-500 mt-1">
            {isPrivileged
              ? 'Compliance overview for all staff qualifications and mandatory training'
              : 'Your qualification and training compliance status'}
          </p>
        </div>
        {isPrivileged && (
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 bg-primary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
      </div>

      {/* Compliance Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fully Compliant</p>
              <p className="text-2xl font-bold text-green-600">{stats.fullyCompliant}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compliance Gaps</p>
              <p className="text-2xl font-bold text-red-600">{stats.gaps}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Qualification Compliance Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Qualification Compliance</h2>
          <p className="text-sm text-gray-500 mt-0.5">Staff qualifications and expiry status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Staff Member</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Role</th>
                {QUAL_COLUMNS.map(qt => (
                  <th key={qt} className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap">
                    {(QUALIFICATION_LABELS[qt] || qt).replace(/\s*\(.*\)/, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles.map(p => {
                const staffQuals = qualLookup[p.id] || {}
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">{p.full_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{ROLE_LABELS[p.role] || p.role}</td>
                    {QUAL_COLUMNS.map(qt => {
                      const q = staffQuals[qt]
                      const status = q ? computeQualStatus(q) : 'not_recorded'
                      const isSelected = selectedCell?.staffId === p.id && selectedCell?.qualType === qt
                      return (
                        <td
                          key={qt}
                          className="text-center px-3 py-3 cursor-pointer relative"
                          onClick={() => setSelectedCell(isSelected ? null : { staffId: p.id, qualType: qt })}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <StatusDot status={status} />
                            {q?.expiry_date && (
                              <span className="text-xs text-gray-400">
                                {new Date(q.expiry_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </span>
                            )}
                          </div>
                          {isSelected && q && (
                            <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-left">
                              <p className="font-medium text-gray-900 text-xs mb-1">{QUALIFICATION_LABELS[qt]}</p>
                              {q.certificate_number && (
                                <p className="text-xs text-gray-500">Cert #: {q.certificate_number}</p>
                              )}
                              {q.issuing_body && (
                                <p className="text-xs text-gray-500">Issuer: {q.issuing_body}</p>
                              )}
                              {q.issue_date && (
                                <p className="text-xs text-gray-500">Issued: {new Date(q.issue_date).toLocaleDateString('en-AU')}</p>
                              )}
                              {q.expiry_date && (
                                <p className="text-xs text-gray-500">Expires: {new Date(q.expiry_date).toLocaleDateString('en-AU')}</p>
                              )}
                              <p className="text-xs mt-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                  status === 'current' ? 'bg-green-100 text-green-700' :
                                  status === 'expiring_soon' ? 'bg-amber-100 text-amber-700' :
                                  status === 'expired' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {status.replace(/_/g, ' ')}
                                </span>
                              </p>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={QUAL_COLUMNS.length + 2} className="px-4 py-8 text-center text-gray-400">
                    No staff data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Training Module Matrix */}
      {mandatoryModules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mandatory Training Modules</h2>
            <p className="text-sm text-gray-500 mt-0.5">Staff completion status for all mandatory compliance modules</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Staff Member</th>
                  {mandatoryModules.map(m => (
                    <th key={m.id} className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap max-w-[140px]">
                      <span className="block truncate" title={m.title}>{m.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map(p => {
                  const staffEnrolls = enrollLookup[p.id] || {}
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">{p.full_name}</td>
                      {mandatoryModules.map(m => {
                        const e = staffEnrolls[m.id]
                        const status = getEnrollmentDisplayStatus(e)
                        const isSelected = selectedModuleCell?.staffId === p.id && selectedModuleCell?.moduleId === m.id
                        return (
                          <td
                            key={m.id}
                            className="text-center px-3 py-3 cursor-pointer relative"
                            onClick={() => setSelectedModuleCell(isSelected ? null : { staffId: p.id, moduleId: m.id })}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <StatusDot status={status} />
                              {status === 'completed' && e?.score != null && (
                                <span className="text-xs text-gray-400">{e.score}%</span>
                              )}
                            </div>
                            {isSelected && e && (
                              <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-left">
                                <p className="font-medium text-gray-900 text-xs mb-1">{m.title}</p>
                                <p className="text-xs text-gray-500">
                                  Status: <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                                </p>
                                {e.completed_at && (
                                  <p className="text-xs text-gray-500">
                                    Completed: {new Date(e.completed_at).toLocaleDateString('en-AU')}
                                  </p>
                                )}
                                {e.score != null && (
                                  <p className="text-xs text-gray-500">Score: {e.score}%</p>
                                )}
                                {e.due_date && (
                                  <p className="text-xs text-gray-500">
                                    Due: {new Date(e.due_date).toLocaleDateString('en-AU')}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {/* Summary row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-medium">
                  <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50 z-10">Completion</td>
                  {mandatoryModules.map(m => {
                    const s = moduleSummary[m.id] || { completed: 0, total: 0 }
                    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
                    return (
                      <td key={m.id} className="text-center px-3 py-3">
                        <span className={`text-xs font-semibold ${pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {s.completed}/{s.total}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Expiry Alerts</h2>
            <p className="text-sm text-gray-500 mt-0.5">Qualifications and certificates expiring within the next 60 days</p>
          </div>
          <div className="divide-y divide-gray-100">
            {expiryAlerts.map((alert, i) => {
              const urgencyClass =
                alert.daysRemaining < 0 ? 'border-l-4 border-l-red-500 bg-red-50' :
                alert.daysRemaining <= 30 ? 'border-l-4 border-l-amber-500 bg-amber-50' :
                'border-l-4 border-l-yellow-400 bg-yellow-50'
              return (
                <div key={i} className={`px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${urgencyClass}`}>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{alert.staffName}</p>
                      <p className="text-xs text-gray-600">{alert.item}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">
                      {new Date(alert.expiryDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      alert.daysRemaining < 0 ? 'bg-red-100 text-red-700' :
                      alert.daysRemaining <= 30 ? 'bg-amber-100 text-amber-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {alert.daysRemaining < 0
                        ? `Expired ${Math.abs(alert.daysRemaining)}d ago`
                        : `${alert.daysRemaining}d remaining`}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {alert.type}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {expiryAlerts.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No upcoming expiry alerts</p>
          <p className="text-sm text-gray-400 mt-1">All qualifications and certificates are up to date</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Legend</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Current / Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> In Progress</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Expiring Soon</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Expired / Overdue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Not Recorded / Not Enrolled</span>
        </div>
      </div>
    </div>
  )
}
