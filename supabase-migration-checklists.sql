-- ============================================
-- MIGRATION: Operational Checklists System
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- CHECKLIST CATEGORIES (organizational grouping)
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_categories (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT '📋',
  color text DEFAULT '#470DA8',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CHECKLIST TEMPLATES (the blueprint/definition)
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category_id integer REFERENCES public.checklist_categories(id),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'event_triggered')),
  -- Which days of week for daily (0=Sun..6=Sat), null = every day
  frequency_days integer[] DEFAULT NULL,
  -- Day of month for monthly, month+day for annual
  frequency_day_of_month integer DEFAULT NULL,
  frequency_month integer DEFAULT NULL,
  -- Items definition as JSONB array
  -- Each item: { id, title, type, required, options, conditional_on, conditional_value, section, sort_order }
  -- Types: yes_no, text, number, photo, dropdown, signature, heading, date, time, checklist
  items jsonb NOT NULL DEFAULT '[]',
  -- Related NQS quality areas
  related_qa integer[] DEFAULT '{}',
  -- Who can be assigned
  assignable_roles text[] DEFAULT '{admin,manager,ns,el,educator}',
  -- Is this a system template or user-created
  is_system_template boolean DEFAULT false,
  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- CHECKLIST SCHEDULES (recurring assignments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_schedules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE CASCADE NOT NULL,
  -- Who is assigned (null = any staff member can complete)
  assigned_to uuid REFERENCES public.profiles(id),
  -- Assigned role (if not specific person)
  assigned_role text CHECK (assigned_role IN ('admin', 'manager', 'ns', 'el', 'educator') OR assigned_role IS NULL),
  -- Time window for completion
  due_time time DEFAULT NULL,
  -- Whether to auto-create instances
  auto_create boolean DEFAULT true,
  -- Active or paused
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- CHECKLIST INSTANCES (a specific occurrence)
-- ============================================
CREATE TABLE IF NOT EXISTS public.checklist_instances (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.checklist_schedules(id) ON DELETE SET NULL,
  -- Snapshot of template name at creation time
  name text NOT NULL,
  -- Due date/time for this instance
  due_date date NOT NULL,
  due_time time DEFAULT NULL,
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'skipped')),
  -- Assignment
  assigned_to uuid REFERENCES public.profiles(id),
  completed_by uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  -- Responses stored as JSONB: { item_id: { value, notes, photo_url, timestamp } }
  responses jsonb DEFAULT '{}',
  -- Snapshot of items at completion time (so template changes don't affect history)
  items_snapshot jsonb DEFAULT '[]',
  -- Overall notes
  notes text,
  -- Scoring: number of passed / total applicable items
  total_items integer DEFAULT 0,
  completed_items integer DEFAULT 0,
  failed_items integer DEFAULT 0,
  -- Related to a specific event (for event-triggered checklists)
  event_type text,
  event_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- SMART TICKETS (auto-generated from failed items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.smart_tickets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Source
  checklist_instance_id uuid REFERENCES public.checklist_instances(id) ON DELETE SET NULL,
  checklist_item_id text, -- References the item ID within the checklist JSONB
  -- Ticket details
  title text NOT NULL,
  description text,
  -- Severity based on the checklist item importance
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  -- Status workflow
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  -- Assignment
  assigned_to uuid REFERENCES public.profiles(id),
  -- Resolution
  resolution_notes text,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  -- Evidence of fix
  evidence_photos text[] DEFAULT '{}',
  -- Related QA area
  related_qa integer,
  -- Dates
  due_date date,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_checklist_templates_category ON public.checklist_templates(category_id);
CREATE INDEX idx_checklist_templates_frequency ON public.checklist_templates(frequency);
CREATE INDEX idx_checklist_templates_status ON public.checklist_templates(status);
CREATE INDEX idx_checklist_schedules_template ON public.checklist_schedules(template_id);
CREATE INDEX idx_checklist_schedules_assigned ON public.checklist_schedules(assigned_to);
CREATE INDEX idx_checklist_instances_template ON public.checklist_instances(template_id);
CREATE INDEX idx_checklist_instances_status ON public.checklist_instances(status);
CREATE INDEX idx_checklist_instances_due_date ON public.checklist_instances(due_date);
CREATE INDEX idx_checklist_instances_assigned ON public.checklist_instances(assigned_to);
CREATE INDEX idx_smart_tickets_instance ON public.smart_tickets(checklist_instance_id);
CREATE INDEX idx_smart_tickets_status ON public.smart_tickets(status);
CREATE INDEX idx_smart_tickets_assigned ON public.smart_tickets(assigned_to);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.checklist_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_tickets ENABLE ROW LEVEL SECURITY;

-- Categories: all can read, admin/manager can manage
CREATE POLICY "Checklist categories viewable by all" ON public.checklist_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Checklist categories manageable by privileged" ON public.checklist_categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Checklist categories updatable by privileged" ON public.checklist_categories FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Checklist categories deletable by privileged" ON public.checklist_categories FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Templates: all can read, admin/manager/ns can manage
CREATE POLICY "Checklist templates viewable by all" ON public.checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Checklist templates insertable by privileged" ON public.checklist_templates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Checklist templates updatable by privileged" ON public.checklist_templates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Checklist templates deletable by privileged" ON public.checklist_templates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Schedules: all can read, admin/manager/ns can manage
CREATE POLICY "Checklist schedules viewable by all" ON public.checklist_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Checklist schedules insertable by privileged" ON public.checklist_schedules FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Checklist schedules updatable by privileged" ON public.checklist_schedules FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Checklist schedules deletable by privileged" ON public.checklist_schedules FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Instances: all can read and create, all can update (for completing assigned checklists)
CREATE POLICY "Checklist instances viewable by all" ON public.checklist_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Checklist instances creatable by all" ON public.checklist_instances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Checklist instances updatable by all" ON public.checklist_instances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Checklist instances deletable by privileged" ON public.checklist_instances FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- Smart tickets: all can read, all can create (auto-generated), all can update (for resolution)
CREATE POLICY "Smart tickets viewable by all" ON public.smart_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Smart tickets creatable by all" ON public.smart_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Smart tickets updatable by all" ON public.smart_tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Smart tickets deletable by privileged" ON public.smart_tickets FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- ============================================
-- TRIGGERS: updated_at
-- ============================================
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_checklist_schedules_updated_at BEFORE UPDATE ON public.checklist_schedules FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_checklist_instances_updated_at BEFORE UPDATE ON public.checklist_instances FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_smart_tickets_updated_at BEFORE UPDATE ON public.smart_tickets FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_tickets;

-- ============================================
-- SEED: Default Categories
-- ============================================
INSERT INTO public.checklist_categories (name, description, icon, color, sort_order) VALUES
  ('Safety & Security', 'Daily safety inspections, playground checks, emergency equipment', '🛡️', '#e74c3c', 1),
  ('Cleaning & Hygiene', 'Cleaning schedules, sanitisation, hygiene compliance', '🧹', '#3498db', 2),
  ('Health & Wellbeing', 'Medication, sleep checks, food safety, illness management', '❤️', '#e91e63', 3),
  ('Operations', 'Opening/closing procedures, attendance, ratio verification', '⚙️', '#ff9800', 4),
  ('Compliance & Regulatory', 'NQS compliance, regulatory requirements, audit prep', '⚖️', '#9c27b0', 5),
  ('Maintenance', 'Equipment maintenance, repairs, facility upkeep', '🔧', '#795548', 6),
  ('Emergency', 'Emergency drills, evacuation, lockdown procedures', '🚨', '#f44336', 7),
  ('Enrolment & Families', 'New enrolment, family communication, excursions', '👨‍👩‍👧‍👦', '#009688', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED: System Checklist Templates
-- ============================================

-- 1. Centre Opening Checklist
INSERT INTO public.checklist_templates (name, description, category_id, frequency, items, related_qa, is_system_template, status) VALUES
(
  'Centre Opening Checklist',
  'Daily opening procedure — complete before children arrive',
  (SELECT id FROM public.checklist_categories WHERE name = 'Operations'),
  'daily',
  '[
    {"id": "open_1", "title": "Premises & Access", "type": "heading", "sort_order": 1},
    {"id": "open_2", "title": "Premises unlocked, lights and HVAC turned on", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "open_3", "title": "Reception and sign-in area set up and accessible", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "open_4", "title": "Operating telephone/communication device functional", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "open_5", "title": "Staffing & Compliance", "type": "heading", "sort_order": 5},
    {"id": "open_6", "title": "Staffing roster verified — ratios met for expected attendance", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "open_7", "title": "Responsible Person present and signed in", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "open_8", "title": "Staff member with current first aid qualification on premises", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "open_9", "title": "Safety Checks", "type": "heading", "sort_order": 9},
    {"id": "open_10", "title": "Emergency exits clear and accessible", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "open_11", "title": "Fire equipment (extinguishers, blankets) accessible and undamaged", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "open_12", "title": "First aid kits stocked and accessible in all rooms", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "open_13", "title": "Floors, windows, gates, and fences inspected for safety", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "open_14", "title": "Environment", "type": "heading", "sort_order": 14},
    {"id": "open_15", "title": "Indoor rooms ventilated and at comfortable temperature", "type": "yes_no", "required": true, "sort_order": 15},
    {"id": "open_16", "title": "Outdoor areas inspected (sandpit uncovered, equipment checked)", "type": "yes_no", "required": true, "sort_order": 16},
    {"id": "open_17", "title": "Children''s allergy/medical/custody info reviewed for the day", "type": "yes_no", "required": true, "sort_order": 17},
    {"id": "open_18", "title": "Photo evidence of setup", "type": "photo", "required": false, "sort_order": 18},
    {"id": "open_19", "title": "Additional notes", "type": "text", "required": false, "sort_order": 19}
  ]'::jsonb,
  '{2, 3, 4, 7}',
  true,
  'active'
),

-- 2. Centre Closing Checklist
(
  'Centre Closing Checklist',
  'Daily closing procedure — complete after all children have departed',
  (SELECT id FROM public.checklist_categories WHERE name = 'Operations'),
  'daily',
  '[
    {"id": "close_1", "title": "Children & Families", "type": "heading", "sort_order": 1},
    {"id": "close_2", "title": "All children signed out and collected by authorised persons", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "close_3", "title": "All rooms checked — no children remaining anywhere on premises", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "close_4", "title": "Outdoor areas secured and checked for any remaining persons", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "close_5", "title": "Cleaning & Reset", "type": "heading", "sort_order": 5},
    {"id": "close_6", "title": "Kitchen and food areas cleaned and secured", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "close_7", "title": "Toilets and nappy change areas sanitised", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "close_8", "title": "All rooms reset and tidied", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "close_9", "title": "Waste removed from all areas", "type": "yes_no", "required": true, "sort_order": 9},
    {"id": "close_10", "title": "Vacuuming and mopping completed", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "close_11", "title": "Security", "type": "heading", "sort_order": 11},
    {"id": "close_12", "title": "All devices and medication cabinets locked", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "close_13", "title": "All doors and windows secured", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "close_14", "title": "Lights and appliances turned off", "type": "yes_no", "required": true, "sort_order": 14},
    {"id": "close_15", "title": "Alarm system activated", "type": "yes_no", "required": true, "sort_order": 15},
    {"id": "close_16", "title": "Staff sign-out completed", "type": "yes_no", "required": true, "sort_order": 16},
    {"id": "close_17", "title": "Additional notes", "type": "text", "required": false, "sort_order": 17}
  ]'::jsonb,
  '{2, 3, 7}',
  true,
  'active'
),

-- 3. Daily Indoor Safety Check
(
  'Daily Indoor Safety Inspection',
  'Inspect all indoor areas for safety hazards before children arrive',
  (SELECT id FROM public.checklist_categories WHERE name = 'Safety & Security'),
  'daily',
  '[
    {"id": "indoor_1", "title": "Furniture stable and undamaged (tables, chairs, shelving)", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "indoor_2", "title": "Electrical outlets have safety covers where required", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "indoor_3", "title": "Safety gates and barriers secure and functioning", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "indoor_4", "title": "No choking hazards, small objects, or broken toys accessible", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "indoor_5", "title": "Cleaning chemicals/hazardous materials locked away", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "indoor_6", "title": "Floor surfaces free from slip/trip hazards", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "indoor_7", "title": "Adequate lighting in all rooms and corridors", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "indoor_8", "title": "Room temperature comfortable and safe", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "indoor_9", "title": "Issues found (describe if any)", "type": "text", "required": false, "sort_order": 9},
    {"id": "indoor_10", "title": "Photo of any hazards identified", "type": "photo", "required": false, "sort_order": 10}
  ]'::jsonb,
  '{2, 3}',
  true,
  'active'
),

-- 4. Daily Outdoor/Playground Safety Check
(
  'Daily Outdoor/Playground Safety Inspection',
  'Inspect all outdoor areas and playground equipment before use',
  (SELECT id FROM public.checklist_categories WHERE name = 'Safety & Security'),
  'daily',
  '[
    {"id": "outdoor_1", "title": "Playground equipment inspected for damage, sharp edges, loose parts", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "outdoor_2", "title": "Fencing and gates secure with childproof locks functioning", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "outdoor_3", "title": "Ground surfaces (soft fall) safe and well-maintained", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "outdoor_4", "title": "No hazards present (broken glass, animal faeces, insects, toxic plants)", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "outdoor_5", "title": "Water features/hazards fenced or covered", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "outdoor_6", "title": "Shade structures intact and adequate", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "outdoor_7", "title": "Sandpit inspected for contamination", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "outdoor_8", "title": "Outdoor furniture stable and safe", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "outdoor_9", "title": "Issues found (describe if any)", "type": "text", "required": false, "sort_order": 9},
    {"id": "outdoor_10", "title": "Photo of any hazards identified", "type": "photo", "required": false, "sort_order": 10}
  ]'::jsonb,
  '{2, 3}',
  true,
  'active'
),

-- 5. Daily Cleaning & Hygiene
(
  'Daily Cleaning & Hygiene Checklist',
  'Cleaning and sanitisation tasks to be completed throughout the day',
  (SELECT id FROM public.checklist_categories WHERE name = 'Cleaning & Hygiene'),
  'daily',
  '[
    {"id": "clean_1", "title": "High-touch surfaces disinfected (door handles, light switches, taps)", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "clean_2", "title": "Nappy change areas cleaned and sanitised after each use", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "clean_3", "title": "Bathroom/toilet areas cleaned and sanitised", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "clean_4", "title": "Eating/food surfaces sanitised before and after each meal", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "clean_5", "title": "Toys used during the day washed and sanitised", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "clean_6", "title": "Sleep/rest mats and bedding cleaned", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "clean_7", "title": "Handwashing compliance monitored throughout the day", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "clean_8", "title": "Rubbish and soiled items removed", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "clean_9", "title": "Additional cleaning notes", "type": "text", "required": false, "sort_order": 9}
  ]'::jsonb,
  '{2, 3}',
  true,
  'active'
),

-- 6. Daily Food Safety
(
  'Daily Food Safety Checklist',
  'Food preparation, storage, and service safety checks',
  (SELECT id FROM public.checklist_categories WHERE name = 'Health & Wellbeing'),
  'daily',
  '[
    {"id": "food_1", "title": "Temperature Monitoring", "type": "heading", "sort_order": 1},
    {"id": "food_2", "title": "Fridge temperature (must be 5°C or below)", "type": "number", "required": true, "sort_order": 2},
    {"id": "food_3", "title": "Freezer temperature (must be -18°C or below)", "type": "number", "required": true, "sort_order": 3},
    {"id": "food_4", "title": "Food Storage & Preparation", "type": "heading", "sort_order": 4},
    {"id": "food_5", "title": "All food correctly stored and labelled (including children''s individual food)", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "food_6", "title": "Allergen records checked against children''s allergy/medical profiles", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "food_7", "title": "Meals meet nutritional guidelines and dietary requirements", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "food_8", "title": "Food served at safe temperatures", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "food_9", "title": "Food handling hygiene maintained (gloves, handwashing)", "type": "yes_no", "required": true, "sort_order": 9},
    {"id": "food_10", "title": "Kitchen cleaned after each meal service", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "food_11", "title": "Notes (any issues or concerns)", "type": "text", "required": false, "sort_order": 11}
  ]'::jsonb,
  '{2}',
  true,
  'active'
),

-- 7. Sleep/Rest Safety Check
(
  'Sleep/Rest Safety Check',
  'Safe sleeping environment and monitoring checks during rest time',
  (SELECT id FROM public.checklist_categories WHERE name = 'Health & Wellbeing'),
  'daily',
  '[
    {"id": "sleep_1", "title": "Individual sleep/rest plans reviewed for each child", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "sleep_2", "title": "SUDI risk factors checked (safe sleeping position, firm mattress)", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "sleep_3", "title": "No loose bedding, toys, or pillows for infants under 12 months", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "sleep_4", "title": "Room temperature comfortable and ventilation adequate", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "sleep_5", "title": "Physical checks of sleeping children at 10-minute intervals", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "sleep_6", "title": "Sleep times recorded for each child", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "sleep_7", "title": "Number of children resting", "type": "number", "required": true, "sort_order": 7},
    {"id": "sleep_8", "title": "Educator supervising (name)", "type": "text", "required": true, "sort_order": 8},
    {"id": "sleep_9", "title": "Additional observations", "type": "text", "required": false, "sort_order": 9}
  ]'::jsonb,
  '{2}',
  true,
  'active'
),

-- 8. Medication Administration Record
(
  'Medication Administration Record',
  'Record all medication administration with two-person verification',
  (SELECT id FROM public.checklist_categories WHERE name = 'Health & Wellbeing'),
  'event_triggered',
  '[
    {"id": "med_1", "title": "Child''s name", "type": "text", "required": true, "sort_order": 1},
    {"id": "med_2", "title": "Written authorisation from parent/guardian obtained", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "med_3", "title": "Medication name", "type": "text", "required": true, "sort_order": 3},
    {"id": "med_4", "title": "Dose", "type": "text", "required": true, "sort_order": 4},
    {"id": "med_5", "title": "Route (oral, topical, inhaler, etc.)", "type": "dropdown", "required": true, "options": ["Oral", "Topical", "Inhaler", "Injection", "Eye drops", "Ear drops", "Other"], "sort_order": 5},
    {"id": "med_6", "title": "Time administered", "type": "time", "required": true, "sort_order": 6},
    {"id": "med_7", "title": "Medication within expiry date and correctly labelled", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "med_8", "title": "Medication stored securely (locked/refrigerated as required)", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "med_9", "title": "Administering educator signature", "type": "signature", "required": true, "sort_order": 9},
    {"id": "med_10", "title": "Witness educator signature (two-person verification)", "type": "signature", "required": true, "sort_order": 10},
    {"id": "med_11", "title": "Parent notified of administration", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "med_12", "title": "Additional notes", "type": "text", "required": false, "sort_order": 12}
  ]'::jsonb,
  '{2}',
  true,
  'active'
),

-- 9. Educator-to-Child Ratio Verification
(
  'Educator-to-Child Ratio Verification',
  'Verify ratios meet National Regulations at key transition points throughout the day',
  (SELECT id FROM public.checklist_categories WHERE name = 'Operations'),
  'daily',
  '[
    {"id": "ratio_1", "title": "Morning Arrival (7:00-9:00)", "type": "heading", "sort_order": 1},
    {"id": "ratio_2", "title": "Number of children present", "type": "number", "required": true, "sort_order": 2},
    {"id": "ratio_3", "title": "Number of educators on floor", "type": "number", "required": true, "sort_order": 3},
    {"id": "ratio_4", "title": "Ratio compliant for all age groups", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "ratio_5", "title": "Midday (11:00-13:00)", "type": "heading", "sort_order": 5},
    {"id": "ratio_6", "title": "Number of children present", "type": "number", "required": true, "sort_order": 6},
    {"id": "ratio_7", "title": "Number of educators on floor", "type": "number", "required": true, "sort_order": 7},
    {"id": "ratio_8", "title": "Ratio maintained during staff breaks", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "ratio_9", "title": "Afternoon (15:00-17:00)", "type": "heading", "sort_order": 9},
    {"id": "ratio_10", "title": "Number of children present", "type": "number", "required": true, "sort_order": 10},
    {"id": "ratio_11", "title": "Number of educators on floor", "type": "number", "required": true, "sort_order": 11},
    {"id": "ratio_12", "title": "Ratio compliant during pickup period", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "ratio_13", "title": "Any periods of non-compliance today?", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "ratio_14", "title": "If non-compliant, describe and remediation taken", "type": "text", "required": false, "conditional_on": "ratio_13", "conditional_value": true, "sort_order": 14}
  ]'::jsonb,
  '{4}',
  true,
  'active'
),

-- 10. Weekly Deep Cleaning
(
  'Weekly Deep Cleaning Checklist',
  'Thorough weekly cleaning tasks beyond daily routine',
  (SELECT id FROM public.checklist_categories WHERE name = 'Cleaning & Hygiene'),
  'weekly',
  '[
    {"id": "wclean_1", "title": "Soft furnishings washed (cushions, dress-up clothes, fabric items)", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "wclean_2", "title": "Bathroom fixtures deep cleaned", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "wclean_3", "title": "Inside of fridges and microwaves cleaned", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "wclean_4", "title": "All bedding and sleep mats washed", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "wclean_5", "title": "Windows and glass surfaces cleaned", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "wclean_6", "title": "Sandpit equipment scrubbed", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "wclean_7", "title": "Bins and waste areas deep cleaned", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "wclean_8", "title": "Spider/pest check of outdoor areas", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "wclean_9", "title": "Notes", "type": "text", "required": false, "sort_order": 9}
  ]'::jsonb,
  '{2, 3}',
  true,
  'active'
),

-- 11. Weekly Safety & Maintenance Review
(
  'Weekly Safety & Maintenance Review',
  'Weekly review of safety equipment and outstanding maintenance',
  (SELECT id FROM public.checklist_categories WHERE name = 'Safety & Security'),
  'weekly',
  '[
    {"id": "wsafe_1", "title": "Smoke detectors and carbon monoxide alarms tested", "type": "yes_no", "required": true, "sort_order": 1},
    {"id": "wsafe_2", "title": "Emergency lighting inspected", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "wsafe_3", "title": "Maintenance request log reviewed — outstanding items followed up", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "wsafe_4", "title": "Outdoor garden/landscaping checked for hazards", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "wsafe_5", "title": "Staff qualification currency verified (WWCC, first aid)", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "wsafe_6", "title": "Staff training schedule reviewed", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "wsafe_7", "title": "Outstanding issues from this week", "type": "text", "required": false, "sort_order": 7}
  ]'::jsonb,
  '{2, 3, 4}',
  true,
  'active'
),

-- 12. Monthly Safety & Compliance
(
  'Monthly Safety & Compliance Audit',
  'Comprehensive monthly safety and operational compliance review',
  (SELECT id FROM public.checklist_categories WHERE name = 'Compliance & Regulatory'),
  'monthly',
  '[
    {"id": "mcomp_1", "title": "Safety Equipment", "type": "heading", "sort_order": 1},
    {"id": "mcomp_2", "title": "Fire extinguisher visual inspection and pressure gauge check", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "mcomp_3", "title": "First aid kits fully inventoried and restocked", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "mcomp_4", "title": "Emergency evacuation/lockdown drill conducted this month", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "mcomp_5", "title": "Emergency contact information reviewed and updated", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "mcomp_6", "title": "Operational Compliance", "type": "heading", "sort_order": 6},
    {"id": "mcomp_7", "title": "WHS hazard register reviewed", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "mcomp_8", "title": "Incident/injury/illness trends reviewed", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "mcomp_9", "title": "Educator-to-child ratio compliance audit completed", "type": "yes_no", "required": true, "sort_order": 9},
    {"id": "mcomp_10", "title": "Policy and procedure review schedule on track", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "mcomp_11", "title": "Food safety audit completed", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "mcomp_12", "title": "Insurance currency confirmed", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "mcomp_13", "title": "Child enrolment records reviewed for completeness", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "mcomp_14", "title": "Summary of findings", "type": "text", "required": true, "sort_order": 14},
    {"id": "mcomp_15", "title": "Evidence photo", "type": "photo", "required": false, "sort_order": 15}
  ]'::jsonb,
  '{2, 3, 4, 7}',
  true,
  'active'
),

-- 13. Quarterly Emergency Drill & Review
(
  'Quarterly Emergency Drill & Review',
  'Emergency evacuation and lockdown drill with full review',
  (SELECT id FROM public.checklist_categories WHERE name = 'Emergency'),
  'quarterly',
  '[
    {"id": "drill_1", "title": "Drill Details", "type": "heading", "sort_order": 1},
    {"id": "drill_2", "title": "Type of drill conducted", "type": "dropdown", "required": true, "options": ["Evacuation", "Lockdown", "Shelter-in-place", "Bushfire", "Flood"], "sort_order": 2},
    {"id": "drill_3", "title": "Date and time of drill", "type": "date", "required": true, "sort_order": 3},
    {"id": "drill_4", "title": "All children participated", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "drill_5", "title": "All staff participated", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "drill_6", "title": "All volunteers/visitors included", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "drill_7", "title": "Time to complete evacuation/lockdown (minutes)", "type": "number", "required": true, "sort_order": 7},
    {"id": "drill_8", "title": "Review", "type": "heading", "sort_order": 8},
    {"id": "drill_9", "title": "Communication systems tested and functional", "type": "yes_no", "required": true, "sort_order": 9},
    {"id": "drill_10", "title": "Emergency supplies and equipment checked", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "drill_11", "title": "Emergency Management Plan reviewed and updated if needed", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "drill_12", "title": "Areas for improvement identified", "type": "text", "required": true, "sort_order": 12},
    {"id": "drill_13", "title": "Photo evidence of drill", "type": "photo", "required": false, "sort_order": 13},
    {"id": "drill_14", "title": "Responsible Person signature", "type": "signature", "required": true, "sort_order": 14}
  ]'::jsonb,
  '{2, 7}',
  true,
  'active'
),

-- 14. Annual Regulatory Compliance
(
  'Annual Regulatory Compliance Review',
  'Annual review of all regulatory requirements, approvals, and insurance',
  (SELECT id FROM public.checklist_categories WHERE name = 'Compliance & Regulatory'),
  'annual',
  '[
    {"id": "annual_1", "title": "Approvals & Registration", "type": "heading", "sort_order": 1},
    {"id": "annual_2", "title": "Service approval current and details up to date", "type": "yes_no", "required": true, "sort_order": 2},
    {"id": "annual_3", "title": "Provider approval current", "type": "yes_no", "required": true, "sort_order": 3},
    {"id": "annual_4", "title": "Nominated supervisor details current with regulatory authority", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "annual_5", "title": "Insurance", "type": "heading", "sort_order": 5},
    {"id": "annual_6", "title": "Public liability insurance renewed", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "annual_7", "title": "Professional indemnity insurance renewed", "type": "yes_no", "required": true, "sort_order": 7},
    {"id": "annual_8", "title": "Workers compensation insurance renewed", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "annual_9", "title": "Building & Safety", "type": "heading", "sort_order": 9},
    {"id": "annual_10", "title": "Building compliance certificate current (fire safety, occupancy)", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "annual_11", "title": "Fire safety equipment professionally serviced and certified", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "annual_12", "title": "Electrical test and tag completed", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "annual_13", "title": "Playground annual safety audit (AS 4685) completed", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "annual_14", "title": "Quality Improvement", "type": "heading", "sort_order": 14},
    {"id": "annual_15", "title": "Quality Improvement Plan (QIP) reviewed and updated", "type": "yes_no", "required": true, "sort_order": 15},
    {"id": "annual_16", "title": "Self-assessment against NQS completed", "type": "yes_no", "required": true, "sort_order": 16},
    {"id": "annual_17", "title": "Staff performance reviews completed", "type": "yes_no", "required": true, "sort_order": 17},
    {"id": "annual_18", "title": "Family satisfaction survey conducted", "type": "yes_no", "required": true, "sort_order": 18},
    {"id": "annual_19", "title": "All policies and procedures reviewed", "type": "yes_no", "required": true, "sort_order": 19},
    {"id": "annual_20", "title": "Philosophy statement reviewed", "type": "yes_no", "required": true, "sort_order": 20},
    {"id": "annual_21", "title": "Summary and action items", "type": "text", "required": true, "sort_order": 21},
    {"id": "annual_22", "title": "Approved Provider / Director signature", "type": "signature", "required": true, "sort_order": 22}
  ]'::jsonb,
  '{1, 2, 3, 4, 5, 6, 7}',
  true,
  'active'
),

-- 15. Excursion Checklist
(
  'Excursion/Field Trip Checklist',
  'Pre-excursion safety and compliance checklist',
  (SELECT id FROM public.checklist_categories WHERE name = 'Enrolment & Families'),
  'event_triggered',
  '[
    {"id": "excur_1", "title": "Planning", "type": "heading", "sort_order": 1},
    {"id": "excur_2", "title": "Excursion destination", "type": "text", "required": true, "sort_order": 2},
    {"id": "excur_3", "title": "Excursion date", "type": "date", "required": true, "sort_order": 3},
    {"id": "excur_4", "title": "Risk assessment completed and documented", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "excur_5", "title": "Written parent/guardian authorisation obtained for all children", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "excur_6", "title": "Educator-to-child ratios meet excursion requirements", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "excur_7", "title": "Number of children attending", "type": "number", "required": true, "sort_order": 7},
    {"id": "excur_8", "title": "Number of educators attending", "type": "number", "required": true, "sort_order": 8},
    {"id": "excur_9", "title": "Equipment", "type": "heading", "sort_order": 9},
    {"id": "excur_10", "title": "First aid kit packed", "type": "yes_no", "required": true, "sort_order": 10},
    {"id": "excur_11", "title": "Emergency contact list and children''s medical info carried", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "excur_12", "title": "Mobile phone/communication device carried and charged", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "excur_13", "title": "Children''s attendance roll for headcounts carried", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "excur_14", "title": "Sunscreen, hats, and water available", "type": "yes_no", "required": true, "sort_order": 14},
    {"id": "excur_15", "title": "Transport (if applicable)", "type": "heading", "sort_order": 15},
    {"id": "excur_16", "title": "Vehicle safety checked (seatbelts, child restraints)", "type": "yes_no", "required": false, "sort_order": 16},
    {"id": "excur_17", "title": "Responsible Person signature", "type": "signature", "required": true, "sort_order": 17}
  ]'::jsonb,
  '{2, 6}',
  true,
  'active'
),

-- 16. Incident/Injury/Illness Record
(
  'Incident/Injury/Illness Record',
  'Document incidents, injuries, or illness — must be completed within 24 hours',
  (SELECT id FROM public.checklist_categories WHERE name = 'Health & Wellbeing'),
  'event_triggered',
  '[
    {"id": "inc_1", "title": "Child/Person Details", "type": "heading", "sort_order": 1},
    {"id": "inc_2", "title": "Name of child/person involved", "type": "text", "required": true, "sort_order": 2},
    {"id": "inc_3", "title": "Date of incident", "type": "date", "required": true, "sort_order": 3},
    {"id": "inc_4", "title": "Time of incident", "type": "time", "required": true, "sort_order": 4},
    {"id": "inc_5", "title": "Type of incident", "type": "dropdown", "required": true, "options": ["Injury", "Illness", "Near miss", "Behavioural incident", "Allergic reaction", "Other"], "sort_order": 5},
    {"id": "inc_6", "title": "Incident Details", "type": "heading", "sort_order": 6},
    {"id": "inc_7", "title": "Description of what happened", "type": "text", "required": true, "sort_order": 7},
    {"id": "inc_8", "title": "Location where incident occurred", "type": "text", "required": true, "sort_order": 8},
    {"id": "inc_9", "title": "Witnesses present", "type": "text", "required": false, "sort_order": 9},
    {"id": "inc_10", "title": "Action taken and treatment provided", "type": "text", "required": true, "sort_order": 10},
    {"id": "inc_11", "title": "Photo evidence (body location, scene)", "type": "photo", "required": false, "sort_order": 11},
    {"id": "inc_12", "title": "Notification", "type": "heading", "sort_order": 12},
    {"id": "inc_13", "title": "Parent/guardian notified", "type": "yes_no", "required": true, "sort_order": 13},
    {"id": "inc_14", "title": "Time parent/guardian notified", "type": "time", "required": true, "sort_order": 14},
    {"id": "inc_15", "title": "Is this a serious incident requiring regulatory notification?", "type": "yes_no", "required": true, "sort_order": 15},
    {"id": "inc_16", "title": "If serious, regulatory authority notified within required timeframe", "type": "yes_no", "required": false, "conditional_on": "inc_15", "conditional_value": true, "sort_order": 16},
    {"id": "inc_17", "title": "Educator signature", "type": "signature", "required": true, "sort_order": 17},
    {"id": "inc_18", "title": "Parent/guardian signature", "type": "signature", "required": false, "sort_order": 18}
  ]'::jsonb,
  '{2}',
  true,
  'active'
),

-- 17. New Child Enrolment Checklist
(
  'New Child Enrolment Checklist',
  'Ensure all enrolment requirements are met before a child commences',
  (SELECT id FROM public.checklist_categories WHERE name = 'Enrolment & Families'),
  'event_triggered',
  '[
    {"id": "enrol_1", "title": "Child''s name", "type": "text", "required": true, "sort_order": 1},
    {"id": "enrol_2", "title": "Expected start date", "type": "date", "required": true, "sort_order": 2},
    {"id": "enrol_3", "title": "Documentation", "type": "heading", "sort_order": 3},
    {"id": "enrol_4", "title": "Enrolment form completed with all mandatory fields", "type": "yes_no", "required": true, "sort_order": 4},
    {"id": "enrol_5", "title": "Immunisation history statement obtained", "type": "yes_no", "required": true, "sort_order": 5},
    {"id": "enrol_6", "title": "Medical conditions, allergies, dietary requirements recorded", "type": "yes_no", "required": true, "sort_order": 6},
    {"id": "enrol_7", "title": "Medical management plan obtained (asthma, anaphylaxis, diabetes, etc.)", "type": "yes_no", "required": false, "sort_order": 7},
    {"id": "enrol_8", "title": "Authorised persons list for collection completed", "type": "yes_no", "required": true, "sort_order": 8},
    {"id": "enrol_9", "title": "Emergency contact details obtained (minimum 2)", "type": "yes_no", "required": true, "sort_order": 9},
    {"id": "enrol_10", "title": "Court orders/custody arrangements documented (if applicable)", "type": "yes_no", "required": false, "sort_order": 10},
    {"id": "enrol_11", "title": "Priority of access documentation (CCS)", "type": "yes_no", "required": true, "sort_order": 11},
    {"id": "enrol_12", "title": "Centre orientation completed with family", "type": "yes_no", "required": true, "sort_order": 12},
    {"id": "enrol_13", "title": "Notes", "type": "text", "required": false, "sort_order": 13}
  ]'::jsonb,
  '{6}',
  true,
  'active'
),

-- 18. Hazard Identification & Risk Assessment
(
  'Hazard Identification & Risk Assessment',
  'Document identified hazards with risk level and control measures',
  (SELECT id FROM public.checklist_categories WHERE name = 'Safety & Security'),
  'event_triggered',
  '[
    {"id": "haz_1", "title": "Hazard description", "type": "text", "required": true, "sort_order": 1},
    {"id": "haz_2", "title": "Location of hazard", "type": "text", "required": true, "sort_order": 2},
    {"id": "haz_3", "title": "Date identified", "type": "date", "required": true, "sort_order": 3},
    {"id": "haz_4", "title": "Photo of hazard", "type": "photo", "required": false, "sort_order": 4},
    {"id": "haz_5", "title": "Risk Assessment", "type": "heading", "sort_order": 5},
    {"id": "haz_6", "title": "Likelihood", "type": "dropdown", "required": true, "options": ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"], "sort_order": 6},
    {"id": "haz_7", "title": "Consequence", "type": "dropdown", "required": true, "options": ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"], "sort_order": 7},
    {"id": "haz_8", "title": "Overall risk level", "type": "dropdown", "required": true, "options": ["Low", "Medium", "High", "Extreme"], "sort_order": 8},
    {"id": "haz_9", "title": "Control Measures", "type": "heading", "sort_order": 9},
    {"id": "haz_10", "title": "Control measures implemented", "type": "text", "required": true, "sort_order": 10},
    {"id": "haz_11", "title": "Responsible person for resolution", "type": "text", "required": true, "sort_order": 11},
    {"id": "haz_12", "title": "Follow-up date", "type": "date", "required": true, "sort_order": 12},
    {"id": "haz_13", "title": "Identified by (signature)", "type": "signature", "required": true, "sort_order": 13}
  ]'::jsonb,
  '{2, 3}',
  true,
  'active'
);
