'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const FORM_CONFIGS: Record<string, { title: string; fields: { name: string; label: string; type: 'text' | 'textarea' | 'select' | 'date'; options?: string[] }[] }> = {
  weekly_reflection: {
    title: 'Weekly Critical Reflection',
    fields: [
      { name: 'room', label: 'Room', type: 'select', options: ['Nursery', 'Toddlers', 'Preschool'] },
      { name: 'week_beginning', label: 'Week Beginning', type: 'date' },
      { name: 'what_happened', label: 'What happened this week? Key experiences and learning observed', type: 'textarea' },
      { name: 'what_worked', label: 'What worked well? Why?', type: 'textarea' },
      { name: 'what_to_change', label: 'What would we change? Why?', type: 'textarea' },
      { name: 'next_week_planning', label: 'How has this informed next week\'s planning?', type: 'textarea' },
      { name: 'individual_children', label: 'Individual children — Notable observations', type: 'textarea' },
      { name: 'family_input', label: 'Family input received this week', type: 'textarea' },
      { name: 'critical_questions', label: 'Critical questions we asked ourselves', type: 'textarea' },
    ]
  },
  meeting_minutes: {
    title: 'Team Meeting Minutes',
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'attendees', label: 'Attendees', type: 'textarea' },
      { name: 'children_learning', label: '1. Children\'s Learning and Program Review', type: 'textarea' },
      { name: 'individual_goals', label: '2. Individual Children\'s Goals and Progress', type: 'textarea' },
      { name: 'reflective_practice', label: '3. Reflective Practice', type: 'textarea' },
      { name: 'professional_development', label: '4. Professional Development', type: 'textarea' },
      { name: 'family_engagement', label: '5. Family Engagement', type: 'textarea' },
      { name: 'health_safety', label: '6. Health and Safety', type: 'textarea' },
      { name: 'operational', label: '7. Operational Matters', type: 'textarea' },
      { name: 'staff_wellbeing', label: '8. Staff Wellbeing', type: 'textarea' },
      { name: 'actions', label: 'Actions Summary', type: 'textarea' },
      { name: 'next_meeting', label: 'Next Meeting Date', type: 'date' },
    ]
  },
  drill_reflection: {
    title: 'Emergency Drill Reflection',
    fields: [
      { name: 'drill_type', label: 'Type of Drill', type: 'select', options: ['Evacuation', 'Lockdown', 'Other'] },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'time_commenced', label: 'Time Commenced', type: 'text' },
      { name: 'time_completed', label: 'Time Completed', type: 'text' },
      { name: 'num_children', label: 'Number of Children', type: 'text' },
      { name: 'num_staff', label: 'Number of Staff', type: 'text' },
      { name: 'what_happened', label: 'What happened', type: 'textarea' },
      { name: 'what_went_well', label: 'What went well', type: 'textarea' },
      { name: 'needs_improving', label: 'What needs improving', type: 'textarea' },
      { name: 'actions_required', label: 'Actions required', type: 'textarea' },
      { name: 'previous_actions_completed', label: 'Were previous drill actions completed?', type: 'select', options: ['Yes', 'No'] },
    ]
  },
  family_collaboration: {
    title: 'Family Collaboration Sheet',
    fields: [
      { name: 'child_name', label: 'Child\'s Name', type: 'text' },
      { name: 'room', label: 'Room', type: 'select', options: ['Nursery', 'Toddlers', 'Preschool'] },
      { name: 'enjoys_at_home', label: 'What does your child enjoy doing at home?', type: 'textarea' },
      { name: 'new_interests', label: 'What new interests has your child shown recently?', type: 'textarea' },
      { name: 'cultural_celebrations', label: 'Cultural celebrations, traditions, or practices to include?', type: 'textarea' },
      { name: 'languages', label: 'Languages spoken at home', type: 'text' },
      { name: 'learning_goals', label: 'What would you like your child to learn or develop this term?', type: 'textarea' },
      { name: 'questions', label: 'Anything you\'d like to know about our program?', type: 'textarea' },
      { name: 'communication_preference', label: 'Preferred update method', type: 'select', options: ['Playground App', 'Verbal at pick-up', 'Email', 'Formal meeting'] },
      { name: 'feedback', label: 'Any feedback about your child\'s experience?', type: 'textarea' },
      { name: 'suggestions', label: 'Suggestions for improvement?', type: 'textarea' },
    ]
  },
  performance_review: {
    title: 'Educator Performance Review',
    fields: [
      { name: 'educator_name', label: 'Educator Name', type: 'text' },
      { name: 'position', label: 'Position', type: 'text' },
      { name: 'room', label: 'Room', type: 'select', options: ['Nursery', 'Toddlers', 'Preschool'] },
      { name: 'review_date', label: 'Review Date', type: 'date' },
      { name: 'proud_of', label: 'Self-assessment: What am I most proud of?', type: 'textarea' },
      { name: 'develop', label: 'Self-assessment: Areas to develop?', type: 'textarea' },
      { name: 'support_needed', label: 'Self-assessment: Support needed?', type: 'textarea' },
      { name: 'strengths', label: 'Strengths identified', type: 'textarea' },
      { name: 'development_areas', label: 'Areas for development', type: 'textarea' },
      { name: 'goal_1', label: 'PD Goal 1', type: 'textarea' },
      { name: 'goal_2', label: 'PD Goal 2', type: 'textarea' },
      { name: 'next_review', label: 'Next Review Date', type: 'date' },
    ]
  },
  family_survey: {
    title: 'Family Satisfaction Survey',
    fields: [
      { name: 'communication_day', label: 'Satisfaction with communication about child\'s day', type: 'select', options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'] },
      { name: 'communication_program', label: 'Satisfaction with communication about educational program', type: 'select', options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'] },
      { name: 'informed', label: 'Do you feel well-informed about learning and development?', type: 'select', options: ['Yes', 'Somewhat', 'No'] },
      { name: 'welcomed', label: 'Do you feel welcomed?', type: 'select', options: ['Always', 'Usually', 'Sometimes', 'Rarely'] },
      { name: 'discuss_child', label: 'Do educators discuss your child with you?', type: 'select', options: ['Always', 'Usually', 'Sometimes', 'Rarely'] },
      { name: 'views_valued', label: 'Are your views valued?', type: 'select', options: ['Always', 'Usually', 'Sometimes', 'Rarely'] },
      { name: 'learning_satisfaction', label: 'Satisfaction with learning experiences', type: 'select', options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'] },
      { name: 'more_of', label: 'What would you like to see more of?', type: 'textarea' },
      { name: 'recommend', label: 'Likelihood to recommend Kiros', type: 'select', options: ['Very likely', 'Likely', 'Neutral', 'Unlikely', 'Very unlikely'] },
      { name: 'does_well', label: 'What does Kiros do well?', type: 'textarea' },
      { name: 'improve', label: 'What could Kiros improve?', type: 'textarea' },
    ]
  },
  learning_profile: {
    title: 'Individual Learning Profile',
    fields: [
      { name: 'child_name', label: 'Child\'s Name', type: 'text' },
      { name: 'dob', label: 'Date of Birth', type: 'date' },
      { name: 'room', label: 'Room', type: 'select', options: ['Nursery', 'Toddlers', 'Preschool'] },
      { name: 'family_goal_1', label: 'Family Goal 1', type: 'textarea' },
      { name: 'family_goal_2', label: 'Family Goal 2', type: 'textarea' },
      { name: 'family_goal_3', label: 'Family Goal 3', type: 'textarea' },
      { name: 'cultural_background', label: 'Cultural/language background', type: 'textarea' },
      { name: 'interests', label: 'Current interests and strengths', type: 'textarea' },
      { name: 'focus_areas', label: 'Developmental focus areas', type: 'textarea' },
      { name: 'goal_1', label: 'Individual Learning Goal 1', type: 'textarea' },
      { name: 'eylf_1', label: 'EYLF Outcome for Goal 1', type: 'text' },
      { name: 'goal_2', label: 'Individual Learning Goal 2', type: 'textarea' },
      { name: 'eylf_2', label: 'EYLF Outcome for Goal 2', type: 'text' },
      { name: 'goal_3', label: 'Individual Learning Goal 3', type: 'textarea' },
      { name: 'eylf_3', label: 'EYLF Outcome for Goal 3', type: 'text' },
    ]
  },
  casual_induction: {
    title: 'Casual Educator Induction',
    fields: [
      { name: 'educator_name', label: 'Educator Name', type: 'text' },
      { name: 'date', label: 'Date', type: 'date' },
      { name: 'inducted_by', label: 'Inducted By', type: 'text' },
      { name: 'wwcc_verified', label: 'WWCC Verified', type: 'select', options: ['Yes', 'No'] },
      { name: 'first_aid_sighted', label: 'First Aid / CPR Sighted', type: 'select', options: ['Yes', 'No'] },
      { name: 'philosophy_explained', label: 'Philosophy Explained', type: 'select', options: ['Yes', 'No'] },
      { name: 'tour_completed', label: 'Service Tour Completed', type: 'select', options: ['Yes', 'No'] },
      { name: 'child_protection', label: 'Child Protection Discussed', type: 'select', options: ['Yes', 'No'] },
      { name: 'supervision_explained', label: 'Supervision Requirements Explained', type: 'select', options: ['Yes', 'No'] },
      { name: 'emergency_procedures', label: 'Emergency Procedures Explained', type: 'select', options: ['Yes', 'No'] },
      { name: 'hygiene_explained', label: 'Hygiene Requirements Explained', type: 'select', options: ['Yes', 'No'] },
      { name: 'interactions_policy', label: 'Reg 155 / Interactions Discussed', type: 'select', options: ['Yes', 'No'] },
      { name: 'allocated_room', label: 'Allocated Room', type: 'select', options: ['Nursery', 'Toddlers', 'Preschool'] },
    ]
  },
}

export default function NewFormPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const formType = searchParams.get('type') || ''
  const config = FORM_CONFIGS[formType]
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  if (!config) return <div className="p-8 text-center text-gray-500">Invalid form type</div>

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const saveForm = async (status: 'draft' | 'submitted') => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('form_submissions').insert({
      form_type: formType,
      data: formData,
      submitted_by: user.id,
      room: formData.room || null,
      status,
    })

    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: `${status === 'submitted' ? 'Submitted' : 'Saved draft'} ${config.title}`,
      entity_type: 'form',
      entity_id: formType,
    })

    router.push('/forms')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back to Forms</button>
      <h1 className="text-2xl font-bold mb-6">{config.title}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        {config.fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea value={formData[field.name] || ''} onChange={e => updateField(field.name, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none resize-y min-h-[80px]" />
            ) : field.type === 'select' ? (
              <select value={formData[field.name] || ''} onChange={e => updateField(field.name, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none">
                <option value="">Select...</option>
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type={field.type} value={formData[field.name] || ''} onChange={e => updateField(field.name, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6b2fa0] outline-none" />
            )}
          </div>
        ))}

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button onClick={() => saveForm('submitted')} disabled={saving}
            className="px-6 py-2 bg-[#6b2fa0] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving...' : 'Submit'}
          </button>
          <button onClick={() => saveForm('draft')} disabled={saving}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  )
}
