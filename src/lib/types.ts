export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'ns' | 'el' | 'educator'
  avatar_url?: string
  notify_comments: boolean
  notify_status_changes: boolean
  notify_assignments: boolean
  allowed_pages?: string[] | null
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
  status: 'todo' | 'in_progress' | 'done'
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

// ============================================
// CENTRE CONTEXT & AI TYPES
// ============================================

export type CentreContextType =
  | 'qip_goal' | 'qip_strategy' | 'philosophy_principle'
  | 'policy_requirement' | 'procedure_step' | 'service_value'
  | 'teaching_approach' | 'family_engagement' | 'inclusion_practice'
  | 'safety_protocol' | 'environment_feature' | 'leadership_goal'

export interface CentreContext {
  id: string
  document_id?: string
  context_type: CentreContextType
  title: string
  content: string
  related_qa: number[]
  related_element_codes: string[]
  source_quote?: string
  ai_generated: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChatConversation {
  id: string
  user_id: string
  title?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool_call' | 'tool_result'

export interface ChatMessage {
  id: string
  conversation_id: string
  role: ChatMessageRole
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export type AiSuggestionStatus = 'pending' | 'approved' | 'rejected' | 'actioned' | 'dismissed'
export type AiSuggestionType = 'daily_priority' | 'qip_improvement' | 'training_gap' | 'checklist_improvement' | 'compliance_reminder' | 'family_engagement'
export type AiSuggestionActionType = 'create_task' | 'assign_training' | 'create_checklist' | 'update_element' | 'view_item'

export interface AiSuggestion {
  id: string
  suggested_by?: string
  target_role?: string
  target_user_id?: string
  suggestion_type: AiSuggestionType
  title: string
  content: string
  action_type?: AiSuggestionActionType
  action_payload?: Record<string, unknown>
  related_qa?: number[]
  status: AiSuggestionStatus
  reviewed_by?: string
  reviewed_at?: string
  expires_at?: string
  created_at: string
  profiles?: Profile
  reviewer_profiles?: Profile
}

export const CONTEXT_TYPE_LABELS: Record<CentreContextType, string> = {
  qip_goal: 'QIP Goal',
  qip_strategy: 'QIP Strategy',
  philosophy_principle: 'Philosophy',
  policy_requirement: 'Policy',
  procedure_step: 'Procedure',
  service_value: 'Service Value',
  teaching_approach: 'Teaching Approach',
  family_engagement: 'Family Engagement',
  inclusion_practice: 'Inclusion',
  safety_protocol: 'Safety Protocol',
  environment_feature: 'Environment',
  leadership_goal: 'Leadership',
}

export const CONTEXT_TYPE_COLORS: Record<CentreContextType, { bg: string; text: string }> = {
  qip_goal: { bg: '#fdf0f0', text: '#d9534f' },
  qip_strategy: { bg: '#fef8ec', text: '#f0ad4e' },
  philosophy_principle: { bg: '#f3e8fa', text: '#7b2d8e' },
  policy_requirement: { bg: '#edf8fc', text: '#5bc0de' },
  procedure_step: { bg: '#edf7ed', text: '#5cb85c' },
  service_value: { bg: '#f3e8fa', text: '#470DA8' },
  teaching_approach: { bg: '#edf8fc', text: '#3498db' },
  family_engagement: { bg: '#e8f5ee', text: '#1abc9c' },
  inclusion_practice: { bg: '#fef8ec', text: '#e67e22' },
  safety_protocol: { bg: '#fdf0f0', text: '#e74c3c' },
  environment_feature: { bg: '#edf7ed', text: '#2ecc71' },
  leadership_goal: { bg: '#edf8fc', text: '#34495e' },
}

export const SUGGESTION_STATUS_LABELS: Record<AiSuggestionStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  actioned: 'Actioned',
  dismissed: 'Dismissed',
}

// ============================================
// LMS (LEARNING MANAGEMENT SYSTEM) TYPES
// ============================================

export type LmsModuleTier = 'mandatory' | 'core' | 'advanced'
export type LmsModuleStatus = 'draft' | 'published' | 'archived'
export type LmsSectionType = 'content' | 'video' | 'quiz' | 'reflection' | 'action_step'
export type LmsEnrollmentStatus = 'not_started' | 'in_progress' | 'completed' | 'expired'
export type LmsQuestionType = 'multiple_choice' | 'true_false' | 'scenario'
export type LmsPathwayStatus = 'not_started' | 'in_progress' | 'completed'
export type LmsPdpGoalStatus = 'active' | 'completed' | 'deferred'
export type LmsPdpReviewStatus = 'draft' | 'submitted' | 'reviewed' | 'acknowledged'
export type LmsCertificateType = 'internal' | 'external' | 'qualification'
export type LmsCertificateStatus = 'current' | 'expiring_soon' | 'expired'

export interface LmsModule {
  id: string
  title: string
  description?: string
  tier: LmsModuleTier
  related_qa: number[]
  related_element_codes: string[]
  duration_minutes: number
  category?: string
  renewal_frequency?: 'annual' | 'biennial' | 'triennial' | 'once' | null
  status: LmsModuleStatus
  thumbnail_url?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface LmsModuleSection {
  id: string
  module_id: string
  sort_order: number
  section_type: LmsSectionType
  title: string
  content?: string
  video_url?: string
  estimated_minutes: number
  created_at: string
}

export interface LmsQuizQuestion {
  id: string
  section_id: string
  question: string
  question_type: LmsQuestionType
  options: Array<{ text: string; is_correct: boolean; explanation?: string }>
  sort_order: number
}

export interface LmsEnrollment {
  id: string
  user_id: string
  module_id: string
  status: LmsEnrollmentStatus
  assigned_by?: string
  due_date?: string
  started_at?: string
  completed_at?: string
  score?: number
  created_at: string
  lms_modules?: LmsModule
  profiles?: Profile
  assigned_profiles?: Profile
}

export interface LmsSectionProgress {
  id: string
  enrollment_id: string
  section_id: string
  completed: boolean
  completed_at?: string
}

export interface LmsQuizResponse {
  id: string
  enrollment_id: string
  question_id: string
  selected_option: number
  is_correct: boolean
  answered_at: string
}

export interface LmsReflection {
  id: string
  enrollment_id: string
  section_id: string
  response: string
  submitted_at: string
}

export interface LmsPathway {
  id: string
  title: string
  description?: string
  related_qa: number[]
  tier?: LmsModuleTier
  estimated_hours?: number
  status: LmsModuleStatus
  created_by?: string
  created_at: string
}

export interface LmsPathwayModule {
  id: string
  pathway_id: string
  module_id: string
  sort_order: number
  is_required: boolean
  lms_modules?: LmsModule
}

export interface LmsPathwayEnrollment {
  id: string
  user_id: string
  pathway_id: string
  status: LmsPathwayStatus
  started_at?: string
  completed_at?: string
  created_at: string
  lms_pathways?: LmsPathway
  profiles?: Profile
}

export interface LmsPdpGoal {
  id: string
  user_id: string
  title: string
  description?: string
  related_qa: number[]
  target_date?: string
  status: LmsPdpGoalStatus
  linked_module_ids: string[]
  linked_pathway_ids: string[]
  evidence_notes?: string
  created_at: string
  updated_at: string
}

export interface LmsPdpReview {
  id: string
  user_id: string
  reviewer_id?: string
  review_period?: string
  goals_summary?: string
  strengths?: string
  areas_for_growth?: string
  agreed_actions?: string
  staff_signature?: string
  reviewer_signature?: string
  status: LmsPdpReviewStatus
  reviewed_at?: string
  created_at: string
  profiles?: Profile
  reviewer_profiles?: Profile
}

export interface LmsCertificate {
  id: string
  user_id: string
  title: string
  certificate_type: LmsCertificateType
  issuer?: string
  issue_date?: string
  expiry_date?: string
  file_path?: string
  module_id?: string
  related_qa: number[]
  status: LmsCertificateStatus
  created_at: string
  profiles?: Profile
  lms_modules?: LmsModule
}

export const LMS_TIER_LABELS: Record<LmsModuleTier, string> = {
  mandatory: 'Mandatory Compliance',
  core: 'Core Professional Development',
  advanced: 'Advanced / Exceeding',
}

export const LMS_TIER_COLORS: Record<LmsModuleTier, { bg: string; text: string }> = {
  mandatory: { bg: '#fdf0f0', text: '#d9534f' },
  core: { bg: '#edf8fc', text: '#5bc0de' },
  advanced: { bg: '#f3e8fa', text: '#7b2d8e' },
}

export const LMS_ENROLLMENT_STATUS_LABELS: Record<LmsEnrollmentStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  expired: 'Expired',
}

export const LMS_CATEGORY_LABELS: Record<string, string> = {
  first_aid: 'First Aid & Emergency',
  child_safety: 'Child Safety',
  health_hygiene: 'Health & Hygiene',
  whs: 'Work Health & Safety',
  curriculum: 'Curriculum & Programming',
  behaviour: 'Behaviour & Wellbeing',
  families: 'Families & Community',
  inclusion: 'Inclusion & Diversity',
  leadership: 'Leadership & Governance',
  compliance: 'Compliance & Regulations',
  professional: 'Professional Practice',
  environment: 'Environment & Sustainability',
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

export const ALL_APP_PAGES: { href: string; label: string; section: string }[] = [
  // Main
  { href: '/ap-dashboard', label: 'AP Dashboard', section: 'Main' },
  { href: '/hub', label: 'Centre Hub', section: 'Main' },
  { href: '/dashboard', label: 'Dashboard', section: 'Main' },
  { href: '/elements', label: 'QA Elements', section: 'Main' },
  { href: '/tasks', label: 'Task Board', section: 'Main' },
  { href: '/checklists', label: 'Checklists', section: 'Main' },
  { href: '/rostering', label: 'Rostering', section: 'Main' },
  { href: '/policies', label: 'Policies', section: 'Main' },
  { href: '/registers', label: 'Registers', section: 'Main' },
  { href: '/training', label: 'Training', section: 'Main' },
  // Learning & Development
  { href: '/learning', label: 'Learning Hub', section: 'Learning' },
  { href: '/learning/library', label: 'Module Library', section: 'Learning' },
  { href: '/learning/pathways', label: 'Learning Pathways', section: 'Learning' },
  { href: '/learning/pdp', label: 'My PDP', section: 'Learning' },
  { href: '/learning/matrix', label: 'Training Matrix', section: 'Learning' },
  { href: '/learning/certificates', label: 'Certificates', section: 'Learning' },
  { href: '/documents', label: 'Documents', section: 'Main' },
  { href: '/compliance', label: 'Compliance', section: 'Main' },
  { href: '/forms', label: 'Forms', section: 'Main' },
  { href: '/resources', label: 'Resources', section: 'Main' },
  { href: '/activity', label: 'Activity', section: 'Main' },
  { href: '/reports', label: 'Reports', section: 'Main' },
  { href: '/guide', label: 'User Guide', section: 'Main' },
  // OWNA Integration
  { href: '/owna/children', label: 'Children & Rooms', section: 'OWNA Integration' },
  { href: '/owna/attendance', label: 'Attendance', section: 'OWNA Integration' },
  { href: '/owna/staff', label: 'Staff', section: 'OWNA Integration' },
  { href: '/owna/families', label: 'Families & Billing', section: 'OWNA Integration' },
  { href: '/owna/enrolments', label: 'Enrolment Pipeline', section: 'OWNA Integration' },
  { href: '/owna/health', label: 'Health & Safety', section: 'OWNA Integration' },
  // Admin
  { href: '/admin/owna', label: 'OWNA API Testing', section: 'Admin' },
  { href: '/admin/users', label: 'User Management', section: 'Admin' },
  { href: '/admin/notifications', label: 'Notifications', section: 'Admin' },
  { href: '/admin/tags', label: 'Tags', section: 'Admin' },
  { href: '/admin/sharepoint', label: 'SharePoint Integration', section: 'Admin' },
]
