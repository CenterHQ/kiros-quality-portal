'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FormSubmission } from '@/lib/types'

const FORM_TYPES = [
  { id: 'weekly_reflection', name: 'Weekly Critical Reflection', description: 'Document weekly reflections on program and practice', icon: '📝' },
  { id: 'meeting_minutes', name: 'Team Meeting Minutes', description: 'Record team meeting discussions and action items', icon: '📋' },
  { id: 'drill_reflection', name: 'Emergency Drill Reflection', description: 'Document and reflect on emergency drill outcomes', icon: '🚨' },
  { id: 'family_collaboration', name: 'Family Collaboration Sheet', description: 'Capture family input about their child', icon: '👨‍👩‍👧' },
  { id: 'performance_review', name: 'Performance Review', description: 'Educator performance review and goal setting', icon: '⭐' },
  { id: 'family_survey', name: 'Family Satisfaction Survey', description: 'Gather feedback from families', icon: '📊' },
  { id: 'learning_profile', name: 'Individual Learning Profile', description: 'Document individual child learning goals and progress', icon: '👶' },
  { id: 'casual_induction', name: 'Casual Educator Induction', description: 'Induction checklist for casual/relief educators', icon: '✅' },
]

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('form_submissions').select('*, profiles(full_name)').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSubmissions(data as any) })
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Forms & Templates</h1>
      <p className="text-gray-500 text-sm mb-6">Create, submit, and review digital forms</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORM_TYPES.map(ft => {
          const ftSubmissions = submissions.filter(s => s.form_type === ft.id)
          return (
            <div key={ft.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{ft.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{ft.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{ft.description}</p>
                  </div>
                  <a href={`/forms/new?type=${ft.id}`} className="px-3 py-1 bg-[#470DA8] text-white rounded-lg text-xs font-medium hover:opacity-90 transition whitespace-nowrap">
                    + New
                  </a>
                </div>
                {ftSubmissions.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-2">{ftSubmissions.length} submission(s)</p>
                    {ftSubmissions.slice(0, 3).map(s => (
                      <div key={s.id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-gray-600">{new Date(s.created_at).toLocaleDateString()} — {(s as any).profiles?.full_name || 'Unknown'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'submitted' ? 'bg-blue-50 text-blue-600' : s.status === 'reviewed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
