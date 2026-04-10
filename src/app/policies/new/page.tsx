'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PolicyCategory, ServiceDetail, Profile, ReviewFrequency } from '@/lib/types'
import { REVIEW_FREQUENCY_LABELS, QA_COLORS } from '@/lib/types'
import { useProfile } from '@/lib/ProfileContext'

export default function NewPolicyPage() {
  const supabase = createClient()
  const router = useRouter()
  const user = useProfile()
  const [categories, setCategories] = useState<PolicyCategory[]>([])
  const [serviceDetails, setServiceDetails] = useState<ServiceDetail[]>([])
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [summary, setSummary] = useState('')
  const [reviewFrequency, setReviewFrequency] = useState<ReviewFrequency>('annual')
  const [relatedQA, setRelatedQA] = useState<number[]>([])
  const [relatedRegs, setRelatedRegs] = useState('')
  const [isFamilyFacing, setIsFamilyFacing] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: cats }, { data: sd }] = await Promise.all([
        supabase.from('policy_categories').select('*').order('sort_order'),
        supabase.from('service_details').select('*'),
      ])
      if (cats) setCategories(cats)
      if (sd) setServiceDetails(sd)
    }
    load()
  }, [])

  const insertPlaceholder = (key: string) => {
    setContent(prev => prev + `{{${key}}}`)
  }

  const getNextReviewDate = (freq: ReviewFrequency): string => {
    const d = new Date()
    switch (freq) {
      case 'monthly': d.setMonth(d.getMonth() + 1); break
      case 'quarterly': d.setMonth(d.getMonth() + 3); break
      case 'biannual': d.setMonth(d.getMonth() + 6); break
      case 'annual': d.setFullYear(d.getFullYear() + 1); break
      case 'biennial': d.setFullYear(d.getFullYear() + 2); break
    }
    return d.toISOString().split('T')[0]
  }

  const save = async (status: 'draft' | 'published') => {
    if (!title.trim()) return
    setSaving(true)
    // Replace placeholders with actual values
    let finalContent = content
    for (const sd of serviceDetails) {
      finalContent = finalContent.replace(new RegExp(`\\{\\{${sd.key}\\}\\}`, 'g'), sd.value)
    }

    const { data: newPolicy } = await supabase.from('policies').insert({
      title: title.trim(),
      category_id: categoryId,
      content: finalContent,
      summary: summary.trim() || null,
      version: 1,
      status,
      review_frequency: reviewFrequency,
      next_review_date: getNextReviewDate(reviewFrequency),
      related_qa: relatedQA,
      related_regulations: relatedRegs || null,
      is_family_facing: isFamilyFacing,
      created_by: user?.id,
      owner_id: user?.id,
      published_at: status === 'published' ? new Date().toISOString() : null,
    }).select().single()

    if (newPolicy) {
      // Save initial version
      await supabase.from('policy_versions').insert({
        policy_id: newPolicy.id,
        version: 1,
        content: finalContent,
        change_summary: 'Initial version',
        created_by: user?.id,
      })
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id, action: 'created_policy', entity_type: 'policy', entity_id: newPolicy.id,
          details: `Created policy: ${title}`,
        })
      }
    }
    setSaving(false)
    router.push('/policies')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/policies" className="text-sm text-muted-foreground hover:text-foreground mb-1 inline-block">&larr; Back to Policies</a>
          <h1 className="text-2xl font-bold">Create New Policy</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => save('draft')} disabled={saving || !title.trim()} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50">
            Save as Draft
          </button>
          <button onClick={() => save('published')} disabled={saving || !title.trim() || !content.trim()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Policy details */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-4">Policy Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Policy Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Sun Safety Policy" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select value={categoryId || ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">Select category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Review Frequency</label>
            <select value={reviewFrequency} onChange={e => setReviewFrequency(e.target.value as ReviewFrequency)} className="w-full px-3 py-2 border border-border rounded-lg text-sm">
              {Object.entries(REVIEW_FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Summary</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} placeholder="Brief summary of the policy purpose" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Related Quality Areas</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(qa => (
                <button key={qa} onClick={() => setRelatedQA(relatedQA.includes(qa) ? relatedQA.filter(q => q !== qa) : [...relatedQA, qa])} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${relatedQA.includes(qa) ? 'text-white border-transparent' : 'text-muted-foreground border-border bg-card hover:bg-accent'}`} style={relatedQA.includes(qa) ? { backgroundColor: QA_COLORS[qa] } : {}}>
                  QA{qa}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Related Regulations</label>
            <input type="text" value={relatedRegs} onChange={e => setRelatedRegs(e.target.value)} placeholder="e.g., Reg 168, Reg 170" className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isFamilyFacing} onChange={e => setIsFamilyFacing(e.target.checked)} className="rounded border-border text-primary focus:ring-primary" />
              <span className="text-foreground">Family-facing policy (visible to families)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Service detail placeholders */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-blue-700 text-sm mb-2">Service Detail Placeholders</h3>
        <p className="text-xs text-blue-600 mb-3">Click a placeholder to insert it into the policy content. Values are auto-populated from your service details.</p>
        <div className="flex flex-wrap gap-2">
          {serviceDetails.map(sd => (
            <button key={sd.key} onClick={() => insertPlaceholder(sd.key)} className="px-2 py-1 bg-card border border-blue-200 text-blue-700 rounded text-xs hover:bg-blue-100 transition" title={sd.value || 'Not set'}>
              {`{{${sd.key}}}`} <span className="text-blue-400 ml-1">{sd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content editor */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
        <h2 className="font-semibold text-foreground mb-4">Policy Content</h2>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={25} placeholder="Enter policy content here. Use {{service_name}}, {{nominated_supervisor}}, etc. for auto-populated service details..." className="w-full px-4 py-3 border border-border rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary focus:border-transparent" />
      </div>
    </div>
  )
}
