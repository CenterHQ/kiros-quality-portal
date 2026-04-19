-- ============================================
-- MIGRATION: Rostering & Staff Management System
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- ROOMS (centre rooms / age groups)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id serial PRIMARY KEY,
  name text NOT NULL,
  age_group text NOT NULL CHECK (age_group IN ('0-2', '2-3', '3-5', 'school_age', 'mixed')),
  licensed_capacity integer NOT NULL DEFAULT 20,
  -- Ratio requirement (children per educator)
  ratio_children integer NOT NULL DEFAULT 4,
  ratio_educators integer NOT NULL DEFAULT 1,
  -- Display
  color text DEFAULT '#470DA8',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STAFF QUALIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff_qualifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  qualification_type text NOT NULL CHECK (qualification_type IN (
    'cert_iii', 'diploma', 'ect_degree', 'working_towards_cert_iii', 'working_towards_diploma', 'working_towards_ect',
    'first_aid', 'cpr', 'anaphylaxis', 'asthma', 'child_protection',
    'wwcc', 'food_safety',
    'other'
  )),
  -- Details
  certificate_number text,
  issuing_body text,
  -- Dates
  issue_date date,
  expiry_date date,
  -- Status
  status text DEFAULT 'current' CHECK (status IN ('current', 'expiring_soon', 'expired', 'pending', 'not_applicable')),
  -- Document reference
  document_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, qualification_type)
);

-- ============================================
-- ROSTER TEMPLATES (reusable weekly patterns)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roster_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  -- Shifts stored as JSONB: array of { day_of_week, room_id, user_id, start_time, end_time, shift_type, role_required }
  shifts jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ROSTER SHIFTS (individual scheduled shifts)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roster_shifts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Date and time
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  -- Assignment
  user_id uuid REFERENCES public.profiles(id),
  room_id integer REFERENCES public.rooms(id),
  -- Shift classification
  shift_type text NOT NULL DEFAULT 'regular' CHECK (shift_type IN (
    'regular', 'programming_time', 'break_cover', 'casual', 'training', 'admin', 'excursion'
  )),
  -- Role requirements
  role_required text CHECK (role_required IN ('educator', 'ect', 'diploma', 'responsible_person', 'first_aid', 'any') OR role_required IS NULL),
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  -- Break info
  break_start time,
  break_end time,
  -- Notes
  notes text,
  -- Template reference (if created from template)
  template_id uuid REFERENCES public.roster_templates(id),
  -- Publishing
  is_published boolean DEFAULT false,
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PROGRAMMING TIME TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.programming_time (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Week reference (Monday of the week)
  week_starting date NOT NULL,
  -- Planned hours
  planned_hours numeric(4,2) DEFAULT 2.0,
  -- Actual hours
  actual_hours numeric(4,2) DEFAULT 0,
  -- Shifts covering this programming time
  covering_shift_ids uuid[] DEFAULT '{}',
  -- Status
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'completed', 'missed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_starting)
);

-- ============================================
-- LEAVE REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('annual', 'sick', 'personal', 'parental', 'unpaid', 'professional_development', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  -- Partial day leave
  is_partial boolean DEFAULT false,
  partial_start_time time,
  partial_end_time time,
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  reason text,
  -- Approval
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  decline_reason text,
  -- Coverage
  coverage_arranged boolean DEFAULT false,
  covering_user_id uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STAFF AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS public.staff_availability (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Day of week (0=Sun, 1=Mon..6=Sat)
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- Available time window
  start_time time NOT NULL,
  end_time time NOT NULL,
  -- Type
  availability_type text DEFAULT 'available' CHECK (availability_type IN ('available', 'preferred', 'unavailable')),
  -- Effective dates (null = ongoing)
  effective_from date,
  effective_until date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week, start_time, end_time)
);

-- ============================================
-- CASUAL/RELIEF POOL
-- ============================================
CREATE TABLE IF NOT EXISTS public.casual_pool (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Can reference an existing profile or be external
  user_id uuid REFERENCES public.profiles(id),
  -- External casual details (if not in profiles)
  full_name text NOT NULL,
  email text,
  phone text,
  -- Qualifications summary
  qualification_level text CHECK (qualification_level IN ('cert_iii', 'diploma', 'ect', 'unqualified', 'working_towards')),
  has_first_aid boolean DEFAULT false,
  has_wwcc boolean DEFAULT false,
  wwcc_expiry date,
  -- Preferences
  preferred_rooms text[] DEFAULT '{}',
  preferred_age_groups text[] DEFAULT '{}',
  -- Availability (JSONB: { day_of_week: { available: bool, start: time, end: time } })
  availability jsonb DEFAULT '{}',
  -- Performance
  rating numeric(2,1) DEFAULT 0,
  total_shifts integer DEFAULT 0,
  last_shift_date date,
  -- Agency info
  is_agency boolean DEFAULT false,
  agency_name text,
  hourly_rate numeric(6,2),
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- RATIO RULES (configurable by state)
-- ============================================
CREATE TABLE IF NOT EXISTS public.ratio_rules (
  id serial PRIMARY KEY,
  state text NOT NULL DEFAULT 'NSW',
  age_group text NOT NULL CHECK (age_group IN ('0-2', '2-3', '3-5', 'school_age')),
  children_per_educator integer NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(state, age_group)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_roster_shifts_date ON public.roster_shifts(shift_date);
CREATE INDEX idx_roster_shifts_user ON public.roster_shifts(user_id);
CREATE INDEX idx_roster_shifts_room ON public.roster_shifts(room_id);
CREATE INDEX idx_roster_shifts_status ON public.roster_shifts(status);
CREATE INDEX idx_staff_qualifications_user ON public.staff_qualifications(user_id);
CREATE INDEX idx_staff_qualifications_type ON public.staff_qualifications(qualification_type);
CREATE INDEX idx_staff_qualifications_expiry ON public.staff_qualifications(expiry_date);
CREATE INDEX idx_leave_requests_user ON public.leave_requests(user_id);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX idx_programming_time_user_week ON public.programming_time(user_id, week_starting);
CREATE INDEX idx_casual_pool_status ON public.casual_pool(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casual_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratio_rules ENABLE ROW LEVEL SECURITY;

-- Rooms: all can read, admin/manager can manage
CREATE POLICY "Rooms viewable by all" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rooms manageable by privileged" ON public.rooms FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Rooms updatable by privileged" ON public.rooms FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Rooms deletable by privileged" ON public.rooms FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Qualifications: all can read, user can update own, admin can manage all
CREATE POLICY "Qualifications viewable by all" ON public.staff_qualifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Qualifications insertable" ON public.staff_qualifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Qualifications updatable" ON public.staff_qualifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Qualifications deletable" ON public.staff_qualifications FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Roster templates: all can read, privileged can manage
CREATE POLICY "Roster templates viewable by all" ON public.roster_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Roster templates insertable" ON public.roster_templates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Roster templates updatable" ON public.roster_templates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Roster templates deletable" ON public.roster_templates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Shifts: all can read, privileged can manage
CREATE POLICY "Shifts viewable by all" ON public.roster_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shifts insertable by privileged" ON public.roster_shifts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Shifts updatable by privileged" ON public.roster_shifts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Shifts deletable by privileged" ON public.roster_shifts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Programming time: all can read, all can update own
CREATE POLICY "Programming time viewable by all" ON public.programming_time FOR SELECT TO authenticated USING (true);
CREATE POLICY "Programming time insertable" ON public.programming_time FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Programming time updatable" ON public.programming_time FOR UPDATE TO authenticated USING (true);

-- Leave requests: all can read, all can create own, privileged can approve
CREATE POLICY "Leave viewable by all" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leave creatable by all" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Leave updatable" ON public.leave_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Leave deletable" ON public.leave_requests FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Availability: all can read, users can manage own
CREATE POLICY "Availability viewable by all" ON public.staff_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Availability insertable" ON public.staff_availability FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Availability updatable" ON public.staff_availability FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Availability deletable" ON public.staff_availability FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Casual pool: all can read, privileged can manage
CREATE POLICY "Casual pool viewable by all" ON public.casual_pool FOR SELECT TO authenticated USING (true);
CREATE POLICY "Casual pool insertable" ON public.casual_pool FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Casual pool updatable" ON public.casual_pool FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Casual pool deletable" ON public.casual_pool FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Ratio rules: all can read, admin can manage
CREATE POLICY "Ratio rules viewable by all" ON public.ratio_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ratio rules manageable by admin" ON public.ratio_rules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_staff_qualifications_updated_at BEFORE UPDATE ON public.staff_qualifications FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_roster_templates_updated_at BEFORE UPDATE ON public.roster_templates FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_roster_shifts_updated_at BEFORE UPDATE ON public.roster_shifts FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_programming_time_updated_at BEFORE UPDATE ON public.programming_time FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_casual_pool_updated_at BEFORE UPDATE ON public.casual_pool FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.roster_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- ============================================
-- SEED: Default Ratio Rules (Australian states)
-- ============================================
INSERT INTO public.ratio_rules (state, age_group, children_per_educator, description) VALUES
  ('NSW', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('NSW', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('NSW', '3-5', 10, '36 months to preschool: 1 educator per 10 children'),
  ('NSW', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children'),
  ('VIC', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('VIC', '2-3', 4, '24 to 36 months: 1 educator per 4 children (VIC)'),
  ('VIC', '3-5', 11, '36 months to preschool: 1 educator per 11 children'),
  ('VIC', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children'),
  ('QLD', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('QLD', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('QLD', '3-5', 11, '36 months to preschool: 1 educator per 11 children'),
  ('QLD', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children'),
  ('SA', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('SA', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('SA', '3-5', 11, '36 months to preschool: 1 educator per 11 children'),
  ('SA', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children'),
  ('WA', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('WA', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('WA', '3-5', 10, '36 months to preschool: 1 educator per 10 children'),
  ('WA', 'school_age', 13, 'School age (OSHC): 1 educator per 13 children (WA)'),
  ('TAS', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('TAS', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('TAS', '3-5', 10, '36 months to preschool: 1 educator per 10 children'),
  ('TAS', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children'),
  ('ACT', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('ACT', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('ACT', '3-5', 11, '36 months to preschool: 1 educator per 11 children'),
  ('ACT', 'school_age', 11, 'School age (OSHC): 1 educator per 11 children (ACT)'),
  ('NT', '0-2', 4, 'Birth to 24 months: 1 educator per 4 children'),
  ('NT', '2-3', 5, '24 to 36 months: 1 educator per 5 children'),
  ('NT', '3-5', 11, '36 months to preschool: 1 educator per 11 children'),
  ('NT', 'school_age', 15, 'School age (OSHC): 1 educator per 15 children')
ON CONFLICT (state, age_group) DO NOTHING;

-- ============================================
-- SEED: Default Rooms (example)
-- ============================================
INSERT INTO public.rooms (name, age_group, licensed_capacity, ratio_children, ratio_educators, color, sort_order) VALUES
  ('Joeys', '0-2', 8, 4, 1, '#e74c3c', 1),
  ('Possums', '2-3', 10, 5, 1, '#e67e22', 2),
  ('Koalas', '3-5', 22, 10, 1, '#2ecc71', 3);
