'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/ProfileContext'
import Link from 'next/link'
import type {
  Profile,
  LmsCertificate,
  LmsCertificateType,
  LmsCertificateStatus,
} from '@/lib/types'
import {
  QA_COLORS,
  ROLE_LABELS,
} from '@/lib/types'

type CertWithRelations = LmsCertificate & {
  profiles?: Pick<Profile, 'full_name' | 'role'>
  lms_modules?: { id: string; title: string } | null
}

type Tab = 'my' | 'upload' | 'all'

const CERT_TYPE_LABELS: Record<LmsCertificateType, string> = {
  internal: 'Internal',
  external: 'External',
  qualification: 'Qualification',
}

const CERT_TYPE_COLORS: Record<LmsCertificateType, { bg: string; text: string }> = {
  internal: { bg: '#f3e8fa', text: '#7b2d8e' },
  external: { bg: '#edf8fc', text: '#2980b9' },
  qualification: { bg: '#edf7ed', text: '#27ae60' },
}

const STATUS_BADGE_STYLES: Record<LmsCertificateStatus, string> = {
  current: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<LmsCertificateStatus, string> = {
  current: 'Current',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
}

const QA_LABELS: Record<number, string> = {
  1: 'QA1 - Educational Program & Practice',
  2: 'QA2 - Children\'s Health & Safety',
  3: 'QA3 - Physical Environment',
  4: 'QA4 - Staffing Arrangements',
  5: 'QA5 - Relationships with Children',
  6: 'QA6 - Collaborative Partnerships',
  7: 'QA7 - Governance & Leadership',
}

function computeStatus(cert: { expiry_date?: string | null }): LmsCertificateStatus {
  if (!cert.expiry_date) return 'current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(cert.expiry_date)
  if (expiry < today) return 'expired'
  const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 30) return 'expiring_soon'
  return 'current'
}

export default function CertificatesPage() {
  const supabase = createClient()
  const user = useProfile()

  const [activeTab, setActiveTab] = useState<Tab>('my')
  const [loading, setLoading] = useState(true)
  const [myCerts, setMyCerts] = useState<CertWithRelations[]>([])
  const [allCerts, setAllCerts] = useState<CertWithRelations[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)

  // Upload form state
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<'external' | 'qualification'>('external')
  const [formIssuer, setFormIssuer] = useState('')
  const [formIssueDate, setFormIssueDate] = useState('')
  const [formExpiryDate, setFormExpiryDate] = useState('')
  const [formQA, setFormQA] = useState<number[]>([])
  const [formFile, setFormFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // All Staff tab filters
  const [filterStaff, setFilterStaff] = useState('')
  const [filterStatus, setFilterStatus] = useState<LmsCertificateStatus | ''>('')
  const [sortColumn, setSortColumn] = useState<'title' | 'issue_date' | 'expiry_date' | 'status'>('expiry_date')
  const [sortAsc, setSortAsc] = useState(true)
  const [exportingAll, setExportingAll] = useState(false)

  const isPrivileged = ['admin', 'manager', 'ns', 'el'].includes(user.role)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const myRes = await supabase
        .from('lms_certificates')
        .select('*, lms_modules(id, title), profiles(full_name, role)')
        .eq('user_id', user.id)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      if (myRes.error) throw myRes.error
      setMyCerts(myRes.data || [])

      if (isPrivileged) {
        const [allRes, profilesRes] = await Promise.all([
          supabase
            .from('lms_certificates')
            .select('*, lms_modules(id, title), profiles(full_name, role)')
            .order('expiry_date', { ascending: true, nullsFirst: false }),
          supabase.from('profiles').select('*').order('full_name'),
        ])

        if (allRes.data) {
          setAllCerts(allRes.data)
        }
        if (profilesRes.data) {
          setAllProfiles(profilesRes.data)
        }
      }
    } catch (err: any) {
      console.error('Error loading certificates:', err)
      setError(err.message || 'Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  // Sorted my certs: expiring soonest first, then by issue date
  const sortedMyCerts = useMemo(() => {
    return [...myCerts].sort((a, b) => {
      const statusA = computeStatus(a)
      const statusB = computeStatus(b)
      const priorityOrder: Record<string, number> = { expired: 0, expiring_soon: 1, current: 2 }
      const pA = priorityOrder[statusA] ?? 2
      const pB = priorityOrder[statusB] ?? 2
      if (pA !== pB) return pA - pB
      if (a.expiry_date && b.expiry_date) return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      if (a.expiry_date) return -1
      if (b.expiry_date) return 1
      return new Date(b.issue_date || b.created_at).getTime() - new Date(a.issue_date || a.created_at).getTime()
    })
  }, [myCerts])

  // Filtered & sorted all certs
  const filteredAllCerts = useMemo(() => {
    let certs = [...allCerts]

    if (filterStaff) {
      certs = certs.filter(c => c.user_id === filterStaff)
    }
    if (filterStatus) {
      certs = certs.filter(c => computeStatus(c) === filterStatus)
    }

    certs.sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case 'title':
          cmp = (a.title || '').localeCompare(b.title || '')
          break
        case 'issue_date':
          cmp = new Date(a.issue_date || '1970-01-01').getTime() - new Date(b.issue_date || '1970-01-01').getTime()
          break
        case 'expiry_date':
          cmp = new Date(a.expiry_date || '2099-12-31').getTime() - new Date(b.expiry_date || '2099-12-31').getTime()
          break
        case 'status': {
          const order: Record<string, number> = { expired: 0, expiring_soon: 1, current: 2 }
          cmp = (order[computeStatus(a)] ?? 2) - (order[computeStatus(b)] ?? 2)
          break
        }
      }
      return sortAsc ? cmp : -cmp
    })

    return certs
  }, [allCerts, filterStaff, filterStatus, sortColumn, sortAsc])

  function toggleSort(col: typeof sortColumn) {
    if (sortColumn === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortColumn(col)
      setSortAsc(true)
    }
  }

  function toggleQA(qa: number) {
    setFormQA(prev => prev.includes(qa) ? prev.filter(q => q !== qa) : [...prev, qa])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) return
    setSubmitting(true)
    setError(null)
    setSubmitSuccess(false)

    try {
      let filePath: string | null = null

      // Upload file if provided
      if (formFile) {
        const ext = formFile.name.split('.').pop()
        const fileName = `${Date.now()}_${formFile.name}`
        const path = `certificates/${user.id}/${fileName}`
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(path, formFile)
        if (uploadErr) throw uploadErr
        filePath = path
      }

      // Insert certificate record
      const { error: insertErr } = await supabase
        .from('lms_certificates')
        .insert({
          user_id: user.id,
          title: formTitle.trim(),
          certificate_type: formType,
          issuer: formIssuer.trim() || null,
          issue_date: formIssueDate || null,
          expiry_date: formExpiryDate || null,
          file_path: filePath,
          related_qa: formQA,
          status: formExpiryDate ? computeStatus({ expiry_date: formExpiryDate }) : 'current',
        })
      if (insertErr) throw insertErr

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'uploaded_certificate',
        entity_type: 'lms_certificate',
        details: `Uploaded certificate: ${formTitle.trim()}`,
      })

      // Reset form
      setFormTitle('')
      setFormType('external')
      setFormIssuer('')
      setFormIssueDate('')
      setFormExpiryDate('')
      setFormQA([])
      setFormFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSubmitSuccess(true)

      // Reload data
      await loadData()
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload certificate')
    } finally {
      setSubmitting(false)
    }
  }

  const exportAllCSV = useCallback(() => {
    setExportingAll(true)
    try {
      const headers = ['Staff Name', 'Role', 'Certificate Title', 'Type', 'Issuer', 'Issue Date', 'Expiry Date', 'Status', 'Related QA']
      const rows = filteredAllCerts.map(c => [
        c.profiles?.full_name || 'Unknown',
        ROLE_LABELS[c.profiles?.role || ''] || c.profiles?.role || '',
        c.title,
        CERT_TYPE_LABELS[c.certificate_type] || c.certificate_type,
        c.issuer || '',
        c.issue_date || '',
        c.expiry_date || '',
        STATUS_LABELS[computeStatus(c)],
        (c.related_qa || []).map(q => `QA${q}`).join('; '),
      ])

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff-certificates-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingAll(false)
    }
  }, [filteredAllCerts])

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'my', label: 'My Certificates', show: true },
    { key: 'upload', label: 'Upload Certificate', show: true },
    { key: 'all', label: 'All Staff', show: isPrivileged },
  ]

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-10 bg-muted rounded w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Certificates & Evidence</h1>
        <p className="text-muted-foreground mt-1">Manage and track professional certificates for A&R evidence</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
              {tab.key === 'my' && myCerts.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {myCerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'my' && (
        <div>
          {sortedMyCerts.length === 0 ? (
            <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">No certificates yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first certificate or complete a training module to get started</p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium bg-primary"
              >
                Upload Certificate
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMyCerts.map(cert => {
                const status = computeStatus(cert)
                const typeColor = CERT_TYPE_COLORS[cert.certificate_type]
                return (
                  <div key={cert.id} className="bg-card rounded-xl shadow-sm border border-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">{cert.title}</h3>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>

                    {/* Issuer */}
                    {cert.issuer && (
                      <p className="text-sm text-muted-foreground">
                        <span className="text-muted-foreground">Issued by:</span> {cert.issuer}
                      </p>
                    )}

                    {/* Dates */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {cert.issue_date && (
                        <div>
                          <span className="text-muted-foreground">Issued:</span>{' '}
                          {new Date(cert.issue_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                      {cert.expiry_date && (
                        <div>
                          <span className="text-muted-foreground">Expires:</span>{' '}
                          <span className={status === 'expired' ? 'text-red-600 font-medium' : status === 'expiring_soon' ? 'text-amber-600 font-medium' : ''}>
                            {new Date(cert.expiry_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                      >
                        {CERT_TYPE_LABELS[cert.certificate_type]}
                      </span>
                      {(cert.related_qa || []).map(qa => (
                        <span
                          key={qa}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: QA_COLORS[qa] || '#6b7280' }}
                        >
                          QA{qa}
                        </span>
                      ))}
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border text-xs">
                      {cert.file_path && (
                        <button
                          onClick={async () => {
                            const { data } = await supabase.storage.from('documents').createSignedUrl(cert.file_path!, 3600)
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                          }}
                          className="text-primary hover:text-primary/90 font-medium flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Certificate
                        </button>
                      )}
                      {cert.lms_modules && (
                        <Link
                          href={`/learning/modules/${cert.module_id}`}
                          className="text-kiros-purple-light hover:text-primary font-medium flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          From: {cert.lms_modules.title}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-foreground mb-1">Upload External Certificate</h2>
          <p className="text-sm text-muted-foreground mb-6">Add certificates from external training or qualifications</p>

          {submitSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700 font-medium">Certificate uploaded successfully</p>
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Certificate Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g., First Aid Certificate HLTAID012"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Certificate Type</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as 'external' | 'qualification')}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors bg-card"
              >
                <option value="external">External Certificate</option>
                <option value="qualification">Qualification</option>
              </select>
            </div>

            {/* Issuer */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Issuing Organisation</label>
              <input
                type="text"
                value={formIssuer}
                onChange={e => setFormIssuer(e.target.value)}
                placeholder="e.g., St John Ambulance"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Issue Date</label>
                <input
                  type="date"
                  value={formIssueDate}
                  onChange={e => setFormIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formExpiryDate}
                  onChange={e => setFormExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank if no expiry</p>
              </div>
            </div>

            {/* QA Areas */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Related Quality Areas</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map(qa => (
                  <label
                    key={qa}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                      formQA.includes(qa)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formQA.includes(qa)}
                      onChange={() => toggleQA(qa)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: QA_COLORS[qa] }}
                    />
                    <span className="text-foreground">QA{qa}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Certificate File</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setFormFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="cert-file"
                />
                <label htmlFor="cert-file" className="cursor-pointer">
                  <svg className="w-8 h-8 text-muted-foreground mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {formFile ? (
                    <p className="text-sm text-primary font-medium">{formFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !formTitle.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 bg-primary"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Upload Certificate'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormTitle(''); setFormType('external'); setFormIssuer('')
                  setFormIssueDate(''); setFormExpiryDate(''); setFormQA([]); setFormFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'all' && isPrivileged && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by Staff</label>
                <select
                  value={filterStaff}
                  onChange={e => setFilterStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Staff</option>
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as LmsCertificateStatus | '')}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="current">Current</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button
                onClick={exportAllCSV}
                disabled={exportingAll || filteredAllCerts.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 shrink-0 bg-primary"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {exportingAll ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Staff Name</th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort('title')}
                    >
                      Certificate Title {sortColumn === 'title' ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Issuer</th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort('issue_date')}
                    >
                      Issue Date {sortColumn === 'issue_date' ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort('expiry_date')}
                    >
                      Expiry Date {sortColumn === 'expiry_date' ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort('status')}
                    >
                      Status {sortColumn === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAllCerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No certificates found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredAllCerts.map(cert => {
                      const status = computeStatus(cert)
                      const typeColor = CERT_TYPE_COLORS[cert.certificate_type]
                      return (
                        <tr key={cert.id} className="hover:bg-muted transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                            {cert.profiles?.full_name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-foreground">{cert.title}</td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                            >
                              {CERT_TYPE_LABELS[cert.certificate_type]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{cert.issuer || '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {cert.issue_date
                              ? new Date(cert.issue_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {cert.expiry_date
                              ? new Date(cert.expiry_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_STYLES[status]}`}>
                              {STATUS_LABELS[status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {cert.file_path ? (
                              <button
                                onClick={async () => {
                                  const { data } = await supabase.storage.from('documents').createSignedUrl(cert.file_path!, 3600)
                                  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                                }}
                                className="text-primary hover:text-primary/90 font-medium text-xs"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredAllCerts.length > 0 && (
              <div className="px-4 py-3 border-t border-border bg-muted text-xs text-muted-foreground">
                Showing {filteredAllCerts.length} certificate{filteredAllCerts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
