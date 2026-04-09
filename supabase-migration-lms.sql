-- ============================================
-- LEARNING MANAGEMENT SYSTEM (LMS)
-- Schema Migration for Kiros Quality Uplift Portal
-- ============================================

-- 1. MODULES
CREATE TABLE IF NOT EXISTS lms_modules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  tier text NOT NULL DEFAULT 'core' CHECK (tier IN ('mandatory', 'core', 'advanced')),
  related_qa integer[] DEFAULT '{}',
  related_element_codes text[] DEFAULT '{}',
  duration_minutes integer DEFAULT 15,
  category text,
  renewal_frequency text CHECK (renewal_frequency IN ('annual', 'biennial', 'triennial', 'once') OR renewal_frequency IS NULL),
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  thumbnail_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. MODULE SECTIONS
CREATE TABLE IF NOT EXISTS lms_module_sections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  section_type text NOT NULL CHECK (section_type IN ('content', 'video', 'quiz', 'reflection', 'action_step')),
  title text NOT NULL,
  content text,
  video_url text,
  estimated_minutes integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

-- 3. QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS lms_quiz_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id uuid NOT NULL REFERENCES lms_module_sections(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'scenario')),
  options jsonb NOT NULL DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. ENROLLMENTS
CREATE TABLE IF NOT EXISTS lms_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  assigned_by uuid REFERENCES profiles(id),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  score integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 5. SECTION PROGRESS
CREATE TABLE IF NOT EXISTS lms_section_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES lms_module_sections(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE(enrollment_id, section_id)
);

-- 6. QUIZ RESPONSES
CREATE TABLE IF NOT EXISTS lms_quiz_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES lms_quiz_questions(id) ON DELETE CASCADE,
  selected_option integer,
  is_correct boolean,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, question_id)
);

-- 7. REFLECTIONS
CREATE TABLE IF NOT EXISTS lms_reflections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES lms_enrollments(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES lms_module_sections(id) ON DELETE CASCADE,
  response text NOT NULL,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, section_id)
);

-- 8. PATHWAYS
CREATE TABLE IF NOT EXISTS lms_pathways (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  related_qa integer[] DEFAULT '{}',
  tier text CHECK (tier IN ('mandatory', 'core', 'advanced')),
  estimated_hours numeric(4,1),
  status text DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 9. PATHWAY MODULES
CREATE TABLE IF NOT EXISTS lms_pathway_modules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pathway_id uuid NOT NULL REFERENCES lms_pathways(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  UNIQUE(pathway_id, module_id)
);

-- 10. PATHWAY ENROLLMENTS
CREATE TABLE IF NOT EXISTS lms_pathway_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES lms_pathways(id) ON DELETE CASCADE,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, pathway_id)
);

-- 11. PDP GOALS
CREATE TABLE IF NOT EXISTS lms_pdp_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  related_qa integer[] DEFAULT '{}',
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deferred')),
  linked_module_ids uuid[] DEFAULT '{}',
  linked_pathway_ids uuid[] DEFAULT '{}',
  evidence_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. PDP REVIEWS
CREATE TABLE IF NOT EXISTS lms_pdp_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id),
  review_period text,
  goals_summary text,
  strengths text,
  areas_for_growth text,
  agreed_actions text,
  staff_signature text,
  reviewer_signature text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'acknowledged')),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 13. CERTIFICATES
CREATE TABLE IF NOT EXISTS lms_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  certificate_type text NOT NULL CHECK (certificate_type IN ('internal', 'external', 'qualification')),
  issuer text,
  issue_date date,
  expiry_date date,
  file_path text,
  module_id uuid REFERENCES lms_modules(id),
  related_qa integer[] DEFAULT '{}',
  status text DEFAULT 'current' CHECK (status IN ('current', 'expiring_soon', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE lms_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_module_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pathway_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pathway_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pdp_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_pdp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_lms_modules" ON lms_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_module_sections" ON lms_module_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_quiz_questions" ON lms_quiz_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_enrollments" ON lms_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_section_progress" ON lms_section_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_quiz_responses" ON lms_quiz_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_reflections" ON lms_reflections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_pathways" ON lms_pathways FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_pathway_modules" ON lms_pathway_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_pathway_enrollments" ON lms_pathway_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_pdp_goals" ON lms_pdp_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_pdp_reviews" ON lms_pdp_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_certificates" ON lms_certificates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_lms_module_sections_module ON lms_module_sections(module_id);
CREATE INDEX idx_lms_module_sections_sort ON lms_module_sections(module_id, sort_order);
CREATE INDEX idx_lms_quiz_questions_section ON lms_quiz_questions(section_id);
CREATE INDEX idx_lms_enrollments_user ON lms_enrollments(user_id);
CREATE INDEX idx_lms_enrollments_module ON lms_enrollments(module_id);
CREATE INDEX idx_lms_enrollments_status ON lms_enrollments(status);
CREATE INDEX idx_lms_section_progress_enrollment ON lms_section_progress(enrollment_id);
CREATE INDEX idx_lms_quiz_responses_enrollment ON lms_quiz_responses(enrollment_id);
CREATE INDEX idx_lms_reflections_enrollment ON lms_reflections(enrollment_id);
CREATE INDEX idx_lms_pathway_modules_pathway ON lms_pathway_modules(pathway_id);
CREATE INDEX idx_lms_pathway_enrollments_user ON lms_pathway_enrollments(user_id);
CREATE INDEX idx_lms_pdp_goals_user ON lms_pdp_goals(user_id);
CREATE INDEX idx_lms_pdp_reviews_user ON lms_pdp_reviews(user_id);
CREATE INDEX idx_lms_certificates_user ON lms_certificates(user_id);
CREATE INDEX idx_lms_certificates_expiry ON lms_certificates(expiry_date);
