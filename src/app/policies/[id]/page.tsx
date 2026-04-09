'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Policy, PolicyCategory, PolicyVersion, PolicyAcknowledgement, ServiceDetail, Profile, ReviewFrequency } from '@/lib/types'
import { POLICY_STATUS_LABELS, REVIEW_FREQUENCY_LABELS, QA_COLORS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

export default function PolicyDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const user = useProfile()
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [categories, setCategories] = useState<PolicyCategory[]>([])
  const [versions, setVersions] = useState<PolicyVersion[]>([])
  const [acknowledgements, setAcknowledgements] = useState<PolicyAcknowledgement[]>([])
  const [serviceDetails, setServiceDetails] = useState<ServiceDetail[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<PolicyVersion | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signed, setSigned] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const load = async () => {
    const [{ data: pol }, { data: cats }, { data: vers }, { data: acks }, { data: sd }, { data: profs }] = await Promise.all([
      supabase.from('policies').select('*, policy_categories(*)').eq('id', id).single(),
      supabase.from('policy_categories').select('*').order('sort_order'),
      supabase.from('policy_versions').select('*, profiles(full_name)').eq('policy_id', id).order('version', { ascending: false }),
      supabase.from('policy_acknowledgements').select('*, profiles(full_name)').eq('policy_id', id),
      supabase.from('service_details').select('*'),
      supabase.from('profiles').select('*'),
    ])
    if (pol) { setPolicy(pol as any); setEditContent(pol.content) }
    if (cats) setCategories(cats)
    if (vers) setVersions(vers as any)
    if (acks) setAcknowledgements(acks as any)
    if (sd) setServiceDetails(sd)
    if (profs) setProfiles(profs)
  }

  useEffect(() => { load() }, [id])

  if (!policy) return <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">Loading...</div>

  const isPrivileged = user && ['admin', 'manager', 'ns'].includes(user.role)
  const cat = policy.policy_categories as PolicyCategory | undefined
  const hasAcknowledged = user && acknowledgements.some(a => a.user_id === user.id && a.version_acknowledged === policy.version)
  const ackCount = acknowledgements.filter(a => a.version_acknowledged === policy.version).length

  const saveNewVersion = async () => {
    if (!editContent.trim() || !changeSummary.trim()) return
    setSaving(true)
    const newVersion = policy.version + 1
    // Replace placeholders
    let finalContent = editContent
    for (const sd of serviceDetails) {
      finalContent = finalContent.replace(new RegExp(`\\{\\{${sd.key}\\}\\}`, 'g'), sd.value)
    }

    await supabase.from('policies').update({
      content: finalContent,
      version: newVersion,
      last_reviewed_at: new Date().toISOString(),
      last_reviewed_by: user?.id,
      status: 'published',
    }).eq('id', policy.id)

    await supabase.from('policy_versions').insert({
      policy_id: policy.id,
      version: newVersion,
      content: finalContent,
      change_summary: changeSummary,
      created_by: user?.id,
    })

    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id, action: 'updated_policy', entity_type: 'policy', entity_id: policy.id,
        details: `Updated policy "${policy.title}" to v${newVersion}: ${changeSummary}`,
      })
    }

    setSaving(false)
    setEditing(false)
    setChangeSummary('')
    await load()
  }

  const updateStatus = async (status: string) => {
    const updates: Record<string, unknown> = { status }
    if (status === 'approved') {
      updates.approved_by = user?.id
      updates.approved_at = new Date().toISOString()
    }
    if (status === 'published') {
      updates.published_at = new Date().toISOString()
    }
    await supabase.from('policies').update(updates).eq('id', policy.id)
    await load()
  }

  const markReviewed = async () => {
    const freq = policy.review_frequency
    const next = new Date()
    switch (freq) {
      case 'monthly': next.setMonth(next.getMonth() + 1); break
      case 'quarterly': next.setMonth(next.getMonth() + 3); break
      case 'biannual': next.setMonth(next.getMonth() + 6); break
      case 'annual': next.setFullYear(next.getFullYear() + 1); break
      case 'biennial': next.setFullYear(next.getFullYear() + 2); break
    }
    await supabase.from('policies').update({
      last_reviewed_at: new Date().toISOString(),
      last_reviewed_by: user?.id,
      next_review_date: next.toISOString().split('T')[0],
    }).eq('id', policy.id)
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id, action: 'reviewed_policy', entity_type: 'policy', entity_id: policy.id,
        details: `Reviewed policy "${policy.title}" — next review: ${next.toLocaleDateString()}`,
      })
    }
    await load()
  }

  // Signature pad handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y) }
  }
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) { const pos = getPos(e); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#000'; ctx.lineTo(pos.x, pos.y); ctx.stroke() }
  }
  const endDraw = () => { if (isDrawing) { setIsDrawing(false); setSigned(true) } }

  const acknowledge = async () => {
    if (!user || hasAcknowledged) return
    const sigData = canvasRef.current?.toDataURL() || null
    await supabase.from('policy_acknowledgements').insert({
      policy_id: policy.id,
      user_id: user.id,
      version_acknowledged: policy.version,
      signature_data: sigData,
    })
    if (user) {
      await supabase.from('activity_log').insert({
        user_id: user.id, action: 'acknowledged_policy', entity_type: 'policy', entity_id: policy.id,
        details: `Acknowledged policy "${policy.title}" v${policy.version}`,
      })
    }
    await load()
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', under_review: 'bg-yellow-50 text-yellow-600',
    approved: 'bg-blue-50 text-blue-600', published: 'bg-green-50 text-green-600', archived: 'bg-gray-100 text-gray-400',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <a href="/policies" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Policies</a>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {cat && <span className="text-lg">{cat.icon}</span>}
              <h1 className="text-2xl font-bold">{policy.title}</h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[policy.status]}`}>{POLICY_STATUS_LABELS[policy.status]}</span>
              <span>v{policy.version}</span>
              {cat && <span>{cat.name}</span>}
              <span>{REVIEW_FREQUENCY_LABELS[policy.review_frequency]} review</span>
              {policy.next_review_date && <span>Next review: {new Date(policy.next_review_date).toLocaleDateString()}</span>}
              <span>{ackCount}/{profiles.length} acknowledged</span>
            </div>
            {policy.related_qa?.length > 0 && (
              <div className="flex gap-1 mt-2">
                {policy.related_qa.map(qa => <span key={qa} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: QA_COLORS[qa] }}>QA{qa}</span>)}
              </div>
            )}
          </div>
          {isPrivileged && (
            <div className="flex gap-2">
              {!editing && <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">Edit</button>}
              <button onClick={markReviewed} className="px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50">Mark Reviewed</button>
              <button onClick={() => setShowVersionHistory(!showVersionHistory)} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
                {showVersionHistory ? 'Hide' : 'Show'} History
              </button>
              {policy.status === 'draft' && <button onClick={() => updateStatus('published')} className="px-3 py-1.5 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90">Publish</button>}
              {policy.status !== 'archived' && <button onClick={() => updateStatus('archived')} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50">Archive</button>}
            </div>
          )}
        </div>
        {policy.summary && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{policy.summary}</p>}
      </div>

      {/* Version history */}
      {showVersionHistory && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Version History</h2>
          <div className="space-y-3">
            {versions.map(v => (
              <div key={v.id} className={`p-3 rounded-lg border cursor-pointer transition ${selectedVersion?.id === v.id ? 'border-[#470DA8] bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setSelectedVersion(selectedVersion?.id === v.id ? null : v)}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">Version {v.version}</span>
                    {v.change_summary && <span className="text-xs text-gray-500 ml-2">— {v.change_summary}</span>}
                  </div>
                  <div className="text-xs text-gray-400">
                    {(v.profiles as any)?.full_name} | {new Date(v.created_at).toLocaleDateString()}
                  </div>
                </div>
                {selectedVersion?.id === v.id && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{v.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content — edit or view */}
      {editing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Edit Policy Content</h2>
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={20} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-[#470DA8] focus:border-transparent mb-4" />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary *</label>
            <input type="text" value={changeSummary} onChange={e => setChangeSummary(e.target.value)} placeholder="Briefly describe what changed and why" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#470DA8]" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditing(false); setEditContent(policy.content) }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={saveNewVersion} disabled={saving || !changeSummary.trim()} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save New Version'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">{policy.content}</pre>
          </div>
        </div>
      )}

      {/* Acknowledgement section */}
      {policy.status === 'published' && !editing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Policy Acknowledgement</h2>
          {hasAcknowledged ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-green-500 text-xl">&#10003;</span>
              <div>
                <p className="text-sm font-medium text-green-700">You have acknowledged this policy (v{policy.version})</p>
                <p className="text-xs text-green-600">{acknowledgements.find(a => a.user_id === user?.id && a.version_acknowledged === policy.version)?.acknowledged_at ? new Date(acknowledgements.find(a => a.user_id === user?.id && a.version_acknowledged === policy.version)!.acknowledged_at).toLocaleDateString() : ''}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">By signing below, I acknowledge that I have read and understood this policy (Version {policy.version}).</p>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden inline-block bg-white">
                  <canvas ref={canvasRef} width={400} height={100} className="cursor-crosshair touch-none"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Draw your signature above</p>
              </div>
              <button onClick={acknowledge} disabled={!signed} className="px-4 py-2 bg-[#470DA8] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Acknowledge Policy
              </button>
            </div>
          )}

          {/* Acknowledgement status */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Acknowledgement Status ({ackCount}/{profiles.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {profiles.map(p => {
                const ack = acknowledgements.find(a => a.user_id === p.id && a.version_acknowledged === policy.version)
                return (
                  <div key={p.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${ack ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className={ack ? 'text-green-500' : 'text-gray-300'}>{ack ? '&#10003;' : '&#9675;'}</span>
                    <span className="text-gray-700">{p.full_name}</span>
                    {ack && <span className="text-gray-400 ml-auto">{new Date(ack.acknowledged_at).toLocaleDateString()}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
