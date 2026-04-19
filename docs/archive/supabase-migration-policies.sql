-- ============================================
-- MIGRATION: Policy Management System
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- POLICY CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.policy_categories (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT '📄',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- POLICIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  category_id integer REFERENCES public.policy_categories(id),
  -- Content
  content text NOT NULL DEFAULT '',
  summary text,
  -- Version tracking
  version integer NOT NULL DEFAULT 1,
  -- Status workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'archived')),
  -- Review schedule
  review_frequency text DEFAULT 'annual' CHECK (review_frequency IN ('monthly', 'quarterly', 'biannual', 'annual', 'biennial')),
  next_review_date date,
  last_reviewed_at timestamptz,
  last_reviewed_by uuid REFERENCES public.profiles(id),
  -- Approval
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  published_at timestamptz,
  -- Metadata
  related_qa integer[] DEFAULT '{}',
  related_regulations text,
  -- Who created/owns this policy
  created_by uuid REFERENCES public.profiles(id),
  owner_id uuid REFERENCES public.profiles(id),
  -- Whether families should see this policy
  is_family_facing boolean DEFAULT false,
  -- Tags for search
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- POLICY VERSIONS (change history)
-- ============================================
CREATE TABLE IF NOT EXISTS public.policy_versions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  content text NOT NULL,
  change_summary text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- POLICY ACKNOWLEDGEMENTS (staff sign-off)
-- ============================================
CREATE TABLE IF NOT EXISTS public.policy_acknowledgements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  policy_id uuid REFERENCES public.policies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  version_acknowledged integer NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  signature_data text,
  UNIQUE(policy_id, user_id, version_acknowledged)
);

-- ============================================
-- SERVICE DETAILS (for auto-population in policies)
-- ============================================
CREATE TABLE IF NOT EXISTS public.service_details (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  label text NOT NULL,
  category text DEFAULT 'general',
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_policies_category ON public.policies(category_id);
CREATE INDEX idx_policies_status ON public.policies(status);
CREATE INDEX idx_policies_review ON public.policies(next_review_date);
CREATE INDEX idx_policy_versions_policy ON public.policy_versions(policy_id);
CREATE INDEX idx_policy_acks_policy ON public.policy_acknowledgements(policy_id);
CREATE INDEX idx_policy_acks_user ON public.policy_acknowledgements(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.policy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policy categories viewable by all" ON public.policy_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Policy categories manageable by privileged" ON public.policy_categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Policy categories updatable by privileged" ON public.policy_categories FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Policies viewable by all" ON public.policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Policies insertable by privileged" ON public.policies FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Policies updatable by privileged" ON public.policies FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Policies deletable by admin" ON public.policies FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Policy versions viewable by all" ON public.policy_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Policy versions insertable" ON public.policy_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Acknowledgements viewable by all" ON public.policy_acknowledgements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acknowledgements insertable by all" ON public.policy_acknowledgements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service details viewable by all" ON public.service_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service details manageable by admin" ON public.service_details FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Service details updatable by admin" ON public.service_details FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================
-- SEED: Policy Categories
-- ============================================
INSERT INTO public.policy_categories (name, description, icon, sort_order) VALUES
  ('Governance & Management', 'Governance structure, roles, responsibilities, complaints management', '🏛️', 1),
  ('Health & Safety', 'Health, hygiene, illness, medication, infection control, sun safety', '🏥', 2),
  ('Emergency & Risk', 'Emergency management, evacuation, lockdown, risk assessment, WHS', '🚨', 3),
  ('Child Safety & Wellbeing', 'Child protection, safeguarding, behaviour guidance, inclusion', '🛡️', 4),
  ('Educational Program', 'Curriculum, programming, assessment, transitions, excursions', '📚', 5),
  ('Staffing & HR', 'Recruitment, induction, code of conduct, performance, professional development', '👥', 6),
  ('Family & Community', 'Enrolment, orientation, communication, partnerships, complaints', '👨‍👩‍👧‍👦', 7),
  ('Nutrition & Food', 'Nutrition, food safety, dietary requirements, breastfeeding, bottle feeding', '🍎', 8),
  ('Sleep & Rest', 'Safe sleep, rest policies, SUDI prevention', '😴', 9),
  ('Environment', 'Physical environment, sustainability, animals, water safety', '🌿', 10),
  ('Privacy & Records', 'Privacy, confidentiality, record keeping, data management', '🔒', 11),
  ('Transport & Excursions', 'Transport safety, excursion procedures, risk assessment', '🚌', 12)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED: Service Details (template placeholders)
-- ============================================
INSERT INTO public.service_details (key, value, label, category) VALUES
  ('service_name', 'Kiro''s Early Education Centre', 'Service Name', 'general'),
  ('service_address', '', 'Service Address', 'general'),
  ('service_phone', '', 'Service Phone', 'general'),
  ('service_email', '', 'Service Email', 'general'),
  ('provider_name', '', 'Approved Provider Name', 'general'),
  ('provider_number', '', 'Provider Approval Number', 'general'),
  ('service_approval_number', '', 'Service Approval Number', 'general'),
  ('nominated_supervisor', '', 'Nominated Supervisor', 'general'),
  ('educational_leader', '', 'Educational Leader', 'general'),
  ('state', 'NSW', 'State/Territory', 'general'),
  ('regulatory_authority', 'NSW Department of Education', 'Regulatory Authority', 'regulatory'),
  ('ccs_provider', '', 'CCS Software Provider', 'systems')
ON CONFLICT (key) DO NOTHING;
