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

// ============================================
// CHECKLIST TYPES
// ============================================

export type ChecklistItemType = 'yes_no' | 'text' | 'number' | 'photo' | 'dropdown' | 'signature' | 'heading' | 'date' | 'time' | 'checklist'
export type ChecklistFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'event_triggered'
export type ChecklistTemplateStatus = 'active' | 'draft' | 'archived'
export type ChecklistInstanceStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped'
export type SmartTicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type SmartTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix'

export interface ChecklistItemDefinition {
  id: string
  title: string
  type: ChecklistItemType
  required?: boolean
  options?: string[]
  conditional_on?: string
  conditional_value?: unknown
  section?: string
  sort_order: number
}

export interface ChecklistItemResponse {
  value: unknown
  notes?: string
  photo_url?: string
  signature_data?: string
  timestamp?: string
}

export interface ChecklistCategory {
  id: number
  name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  created_at: string
}

export interface ChecklistTemplate {
  id: string
  name: string
  description?: string
  category_id?: number
  frequency: ChecklistFrequency
  frequency_days?: number[]
  frequency_day_of_month?: number
  frequency_month?: number
  items: ChecklistItemDefinition[]
  related_qa: number[]
  assignable_roles: string[]
  is_system_template: boolean
  status: ChecklistTemplateStatus
  created_by?: string
  created_at: string
  updated_at: string
  checklist_categories?: ChecklistCategory
  profiles?: Profile
}

export interface ChecklistSchedule {
  id: string
  template_id: string
  assigned_to?: string
  assigned_role?: string
  due_time?: string
  auto_create: boolean
  status: 'active' | 'paused'
  created_by?: string
  created_at: string
  updated_at: string
  checklist_templates?: ChecklistTemplate
  profiles?: Profile
}

export interface ChecklistInstance {
  id: string
  template_id?: string
  schedule_id?: string
  name: string
  due_date: string
  due_time?: string
  status: ChecklistInstanceStatus
  assigned_to?: string
  completed_by?: string
  completed_at?: string
  responses: Record<string, ChecklistItemResponse>
  items_snapshot: ChecklistItemDefinition[]
  notes?: string
  total_items: number
  completed_items: number
  failed_items: number
  event_type?: string
  event_description?: string
  created_at: string
  updated_at: string
  checklist_templates?: ChecklistTemplate
  profiles?: Profile
  completed_profiles?: Profile
}

export interface SmartTicket {
  id: string
  checklist_instance_id?: string
  checklist_item_id?: string
  title: string
  description?: string
  priority: SmartTicketPriority
  status: SmartTicketStatus
  assigned_to?: string
  resolution_notes?: string
  resolved_by?: string
  resolved_at?: string
  evidence_photos: string[]
  related_qa?: number
  due_date?: string
  created_by?: string
  created_at: string
  updated_at: string
  checklist_instances?: ChecklistInstance
  profiles?: Profile
  resolved_profiles?: Profile
}

export const CHECKLIST_FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  event_triggered: 'Event Triggered',
}

export const CHECKLIST_ITEM_TYPE_LABELS: Record<ChecklistItemType, string> = {
  yes_no: 'Yes / No',
  text: 'Text',
  number: 'Number',
  photo: 'Photo',
  dropdown: 'Dropdown',
  signature: 'Signature',
  heading: 'Section Heading',
  date: 'Date',
  time: 'Time',
  checklist: 'Checklist',
}

export const SMART_TICKET_PRIORITY_COLORS: Record<SmartTicketPriority, { bg: string; text: string }> = {
  low: { bg: '#edf7ed', text: '#5cb85c' },
  medium: { bg: '#fef8ec', text: '#f0ad4e' },
  high: { bg: '#fdf0f0', text: '#e67e22' },
  critical: { bg: '#fdf0f0', text: '#d9534f' },
}

// ============================================
// ROSTERING TYPES
// ============================================

export type AgeGroup = '0-2' | '2-3' | '3-5' | 'school_age' | 'mixed'
export type ShiftType = 'regular' | 'programming_time' | 'break_cover' | 'casual' | 'training' | 'admin' | 'excursion'
export type ShiftStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type QualificationType = 'cert_iii' | 'diploma' | 'ect_degree' | 'working_towards_cert_iii' | 'working_towards_diploma' | 'working_towards_ect' | 'first_aid' | 'cpr' | 'anaphylaxis' | 'asthma' | 'child_protection' | 'wwcc' | 'food_safety' | 'other'
export type LeaveType = 'annual' | 'sick' | 'personal' | 'parental' | 'unpaid' | 'professional_development' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

export interface Room {
  id: number
  name: string
  age_group: AgeGroup
  licensed_capacity: number
  ratio_children: number
  ratio_educators: number
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffQualification {
  id: string
  user_id: string
  qualification_type: QualificationType
  certificate_number?: string
  issuing_body?: string
  issue_date?: string
  expiry_date?: string
  status: 'current' | 'expiring_soon' | 'expired' | 'pending' | 'not_applicable'
  document_url?: string
  notes?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface RosterShift {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  user_id?: string
  room_id?: number
  shift_type: ShiftType
  role_required?: string
  status: ShiftStatus
  break_start?: string
  break_end?: string
  notes?: string
  template_id?: string
  is_published: boolean
  published_at?: string
  published_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  profiles?: Profile
  rooms?: Room
}

export interface RosterTemplate {
  id: string
  name: string
  description?: string
  shifts: Array<{
    day_of_week: number
    room_id: number
    user_id?: string
    start_time: string
    end_time: string
    shift_type: ShiftType
    role_required?: string
  }>
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ProgrammingTime {
  id: string
  user_id: string
  week_starting: string
  planned_hours: number
  actual_hours: number
  covering_shift_ids: string[]
  status: 'planned' | 'scheduled' | 'completed' | 'missed'
  notes?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  is_partial: boolean
  partial_start_time?: string
  partial_end_time?: string
  status: LeaveStatus
  reason?: string
  approved_by?: string
  approved_at?: string
  decline_reason?: string
  coverage_arranged: boolean
  covering_user_id?: string
  notes?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface CasualPoolMember {
  id: string
  user_id?: string
  full_name: string
  email?: string
  phone?: string
  qualification_level?: string
  has_first_aid: boolean
  has_wwcc: boolean
  wwcc_expiry?: string
  preferred_rooms: string[]
  preferred_age_groups: string[]
  availability: Record<string, unknown>
  rating: number
  total_shifts: number
  last_shift_date?: string
  is_agency: boolean
  agency_name?: string
  hourly_rate?: number
  status: 'active' | 'inactive' | 'blacklisted'
  notes?: string
  created_at: string
  updated_at: string
}

export interface RatioRule {
  id: number
  state: string
  age_group: AgeGroup
  children_per_educator: number
  description?: string
}

export interface RatioStatus {
  room: Room
  educatorsOnFloor: number
  childrenPresent: number
  requiredEducators: number
  status: 'compliant' | 'at_minimum' | 'breach'
  surplus: number
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '0-2': 'Nursery (0-2)',
  '2-3': 'Toddlers (2-3)',
  '3-5': 'Preschool (3-5)',
  'school_age': 'School Age',
  'mixed': 'Mixed Age',
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'Regular',
  programming_time: 'Programming Time',
  break_cover: 'Break Cover',
  casual: 'Casual/Relief',
  training: 'Training',
  admin: 'Admin',
  excursion: 'Excursion',
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
  parental: 'Parental Leave',
  unpaid: 'Unpaid Leave',
  professional_development: 'Professional Development',
  other: 'Other',
}

export const QUALIFICATION_LABELS: Record<QualificationType, string> = {
  cert_iii: 'Certificate III',
  diploma: 'Diploma',
  ect_degree: 'ECT Degree',
  working_towards_cert_iii: 'Working Towards Cert III',
  working_towards_diploma: 'Working Towards Diploma',
  working_towards_ect: 'Working Towards ECT',
  first_aid: 'First Aid (HLTAID012)',
  cpr: 'CPR',
  anaphylaxis: 'Anaphylaxis Management',
  asthma: 'Asthma Management',
  child_protection: 'Child Protection',
  wwcc: 'Working With Children Check',
  food_safety: 'Food Safety',
  other: 'Other',
}

// ============================================
// POLICY MANAGEMENT TYPES
// ============================================

export type PolicyStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived'
export type ReviewFrequency = 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'biennial'

export interface PolicyCategory {
  id: number
  name: string
  description?: string
  icon: string
  sort_order: number
  created_at: string
}

export interface Policy {
  id: string
  title: string
  category_id?: number
  content: string
  summary?: string
  version: number
  status: PolicyStatus
  review_frequency: ReviewFrequency
  next_review_date?: string
  last_reviewed_at?: string
  last_reviewed_by?: string
  approved_by?: string
  approved_at?: string
  published_at?: string
  related_qa: number[]
  related_regulations?: string
  created_by?: string
  owner_id?: string
  is_family_facing: boolean
  tags: string[]
  created_at: string
  updated_at: string
  policy_categories?: PolicyCategory
  profiles?: Profile
}

export interface PolicyVersion {
  id: string
  policy_id: string
  version: number
  content: string
  change_summary?: string
  created_by?: string
  created_at: string
  profiles?: Profile
}

export interface PolicyAcknowledgement {
  id: string
  policy_id: string
  user_id: string
  version_acknowledged: number
  acknowledged_at: string
  signature_data?: string
  profiles?: Profile
}

export interface ServiceDetail {
  id: number
  key: string
  value: string
  label: string
  category: string
  updated_at: string
}

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
}

export const REVIEW_FREQUENCY_LABELS: Record<ReviewFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 Months',
  annual: 'Annually',
  biennial: 'Every 2 Years',
}

// ============================================
// CUSTOM REGISTERS TYPES
// ============================================

export type RegisterColumnType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'email' | 'phone' | 'file' | 'currency' | 'url' | 'textarea'

export interface RegisterColumnDef {
  id: string
  name: string
  type: RegisterColumnType
  required: boolean
  width?: number
  options?: string[] // for dropdown
  default_value?: string
  sort_order: number
}

export interface RegisterDefinition {
  id: string
  name: string
  description?: string
  icon: string
  columns: RegisterColumnDef[]
  is_system_template: boolean
  status: 'active' | 'archived'
  created_by?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface RegisterEntry {
  id: string
  register_id: string
  row_data: Record<string, unknown>
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export const REGISTER_COLUMN_TYPE_LABELS: Record<RegisterColumnType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  email: 'Email',
  phone: 'Phone',
  file: 'File',
  currency: 'Currency',
  url: 'URL',
  textarea: 'Long Text',
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
