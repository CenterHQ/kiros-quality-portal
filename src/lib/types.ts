export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'ns' | 'el' | 'educator'
  avatar_url?: string
  notify_comments: boolean
  notify_status_changes: boolean
  notify_assignments: boolean
  created_at: string
  updated_at: string
}

export interface QAElement {
  id: number
  qa_number: number
  qa_name: string
  standard_number: string
  standard_name: string
  element_code: string
  element_name: string
  concept?: string
  current_rating: 'not_met' | 'met' | 'working_towards' | 'meeting' | 'exceeding'
  target_rating?: string
  status: 'not_started' | 'in_progress' | 'action_taken' | 'ready_for_review' | 'completed'
  assigned_to?: string
  officer_finding?: string
  our_response?: string
  actions_taken?: string
  meeting_criteria?: string
  exceeding_criteria?: string
  training_points?: string
  due_date?: string
  notes?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  created_by?: string
  qa_element_id?: number
  due_date?: string
  completed_at?: string
  sort_order: number
  created_at: string
  updated_at: string
  profiles?: Profile
  qa_elements?: QAElement
}

export interface Comment {
  id: string
  content: string
  user_id: string
  entity_type: 'element' | 'task' | 'document' | 'training'
  entity_id: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Document {
  id: string
  name: string
  file_path: string
  file_size?: number
  file_type?: string
  qa_area?: number
  category: string
  uploaded_by?: string
  description?: string
  created_at: string
  profiles?: Profile
}

export interface TrainingModule {
  id: number
  title: string
  description?: string
  duration_hours?: number
  content?: string
  sort_order: number
  related_qa?: string
  related_regulations?: string
  resources?: string
  created_at: string
}

export interface TrainingAssignment {
  id: string
  module_id: number
  user_id: string
  assigned_by?: string
  due_date?: string
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue'
  completed_at?: string
  score?: number
  notes?: string
  created_at: string
  training_modules?: TrainingModule
  profiles?: Profile
}

export interface ComplianceItem {
  id: number
  regulation: string
  description: string
  status: 'action_required' | 'in_progress' | 'completed' | 'ongoing'
  assigned_to?: string
  due_date?: string
  notes?: string
  evidence?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  details?: string
  created_at: string
  profiles?: Profile
}

export interface Resource {
  id: number
  title: string
  url: string
  description?: string
  qa_area?: number
  category: string
  sort_order: number
  created_at: string
}

export interface FormSubmission {
  id: string
  form_type: string
  data: Record<string, unknown>
  submitted_by?: string
  room?: string
  status: 'draft' | 'submitted' | 'reviewed'
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export const QA_COLORS: Record<number, string> = {
  1: '#e74c3c',
  2: '#e67e22',
  3: '#2ecc71',
  4: '#3498db',
  5: '#9b59b6',
  6: '#1abc9c',
  7: '#34495e',
}

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  not_met: { bg: '#fdf0f0', text: '#d9534f' },
  met: { bg: '#edf7ed', text: '#5cb85c' },
  working_towards: { bg: '#fef8ec', text: '#f0ad4e' },
  meeting: { bg: '#edf7ed', text: '#5cb85c' },
  exceeding: { bg: '#f3e8fa', text: '#7b2d8e' },
  not_started: { bg: '#f8f9fa', text: '#999' },
  in_progress: { bg: '#edf8fc', text: '#5bc0de' },
  action_taken: { bg: '#fef8ec', text: '#f0ad4e' },
  ready_for_review: { bg: '#e8f5ee', text: '#4a9e6e' },
  completed: { bg: '#edf7ed', text: '#5cb85c' },
  todo: { bg: '#f8f9fa', text: '#999' },
  review: { bg: '#fef8ec', text: '#f0ad4e' },
  done: { bg: '#edf7ed', text: '#5cb85c' },
  action_required: { bg: '#fdf0f0', text: '#d9534f' },
  ongoing: { bg: '#edf8fc', text: '#5bc0de' },
  assigned: { bg: '#edf8fc', text: '#5bc0de' },
  overdue: { bg: '#fdf0f0', text: '#d9534f' },
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Approved Provider',
  manager: 'Operations Manager',
  ns: 'Nominated Supervisor',
  el: 'Educational Leader',
  educator: 'Educator',
}
