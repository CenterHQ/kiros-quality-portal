-- ============================================
-- MIGRATION: Custom Registers System
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- REGISTER DEFINITIONS (the structure)
-- ============================================
CREATE TABLE IF NOT EXISTS public.register_definitions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT '📋',
  -- Column definitions as JSONB array
  -- Each column: { id, name, type, required, width, options, default_value, sort_order }
  -- Types: text, number, date, dropdown, checkbox, email, phone, file, currency, url, textarea
  columns jsonb NOT NULL DEFAULT '[]',
  is_system_template boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- REGISTER ENTRIES (the data rows)
-- ============================================
CREATE TABLE IF NOT EXISTS public.register_entries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  register_id uuid REFERENCES public.register_definitions(id) ON DELETE CASCADE NOT NULL,
  -- Row data as JSONB: { column_id: value }
  row_data jsonb NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_register_definitions_status ON public.register_definitions(status);
CREATE INDEX idx_register_entries_register ON public.register_entries(register_id);
CREATE INDEX idx_register_entries_sort ON public.register_entries(register_id, sort_order);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.register_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Register definitions viewable by all" ON public.register_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register definitions insertable by privileged" ON public.register_definitions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Register definitions updatable by privileged" ON public.register_definitions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);
CREATE POLICY "Register definitions deletable by privileged" ON public.register_definitions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Register entries viewable by all" ON public.register_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register entries insertable by all" ON public.register_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Register entries updatable by all" ON public.register_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Register entries deletable by privileged" ON public.register_entries FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_register_definitions_updated_at BEFORE UPDATE ON public.register_definitions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();
CREATE TRIGGER update_register_entries_updated_at BEFORE UPDATE ON public.register_entries FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.register_entries;

-- ============================================
-- SEED: Template Registers
-- ============================================
INSERT INTO public.register_definitions (name, description, icon, columns, is_system_template, status) VALUES
(
  'Device Register',
  'Register of all electronic devices and equipment at the service',
  '💻',
  '[
    {"id": "dev_name", "name": "Device Name", "type": "text", "required": true, "sort_order": 0},
    {"id": "dev_type", "name": "Type", "type": "dropdown", "required": true, "options": ["Laptop", "Tablet", "Phone", "Printer", "Camera", "Other"], "sort_order": 1},
    {"id": "dev_serial", "name": "Serial Number", "type": "text", "required": true, "sort_order": 2},
    {"id": "dev_make", "name": "Make/Model", "type": "text", "required": false, "sort_order": 3},
    {"id": "dev_purchase", "name": "Purchase Date", "type": "date", "required": false, "sort_order": 4},
    {"id": "dev_cost", "name": "Purchase Cost", "type": "currency", "required": false, "sort_order": 5},
    {"id": "dev_assigned", "name": "Assigned To", "type": "text", "required": false, "sort_order": 6},
    {"id": "dev_location", "name": "Location/Room", "type": "text", "required": false, "sort_order": 7},
    {"id": "dev_condition", "name": "Condition", "type": "dropdown", "required": false, "options": ["New", "Good", "Fair", "Poor", "Needs Repair", "Retired"], "sort_order": 8},
    {"id": "dev_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 9}
  ]'::jsonb,
  true,
  'active'
),
(
  'Visitor Register',
  'Log of all visitors to the service',
  '👤',
  '[
    {"id": "vis_date", "name": "Date", "type": "date", "required": true, "sort_order": 0},
    {"id": "vis_name", "name": "Visitor Name", "type": "text", "required": true, "sort_order": 1},
    {"id": "vis_company", "name": "Company/Organisation", "type": "text", "required": false, "sort_order": 2},
    {"id": "vis_purpose", "name": "Purpose of Visit", "type": "text", "required": true, "sort_order": 3},
    {"id": "vis_time_in", "name": "Time In", "type": "text", "required": true, "sort_order": 4},
    {"id": "vis_time_out", "name": "Time Out", "type": "text", "required": false, "sort_order": 5},
    {"id": "vis_wwcc", "name": "WWCC Sighted", "type": "checkbox", "required": false, "sort_order": 6},
    {"id": "vis_host", "name": "Host/Approved By", "type": "text", "required": true, "sort_order": 7}
  ]'::jsonb,
  true,
  'active'
),
(
  'Chemical Register',
  'Register of all chemicals and hazardous substances stored at the service',
  '🧪',
  '[
    {"id": "chem_name", "name": "Product Name", "type": "text", "required": true, "sort_order": 0},
    {"id": "chem_type", "name": "Type", "type": "dropdown", "required": true, "options": ["Cleaning", "Disinfectant", "Laundry", "Garden", "Art Supplies", "Other"], "sort_order": 1},
    {"id": "chem_manufacturer", "name": "Manufacturer", "type": "text", "required": false, "sort_order": 2},
    {"id": "chem_sds", "name": "SDS Available", "type": "checkbox", "required": true, "sort_order": 3},
    {"id": "chem_location", "name": "Storage Location", "type": "text", "required": true, "sort_order": 4},
    {"id": "chem_locked", "name": "Stored Securely (Locked)", "type": "checkbox", "required": true, "sort_order": 5},
    {"id": "chem_expiry", "name": "Expiry Date", "type": "date", "required": false, "sort_order": 6},
    {"id": "chem_quantity", "name": "Quantity", "type": "text", "required": false, "sort_order": 7},
    {"id": "chem_risk", "name": "Risk Level", "type": "dropdown", "required": false, "options": ["Low", "Medium", "High"], "sort_order": 8},
    {"id": "chem_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 9}
  ]'::jsonb,
  true,
  'active'
),
(
  'Maintenance Register',
  'Track maintenance requests, repairs, and inspections',
  '🔧',
  '[
    {"id": "mnt_date", "name": "Date Reported", "type": "date", "required": true, "sort_order": 0},
    {"id": "mnt_item", "name": "Item/Area", "type": "text", "required": true, "sort_order": 1},
    {"id": "mnt_desc", "name": "Description of Issue", "type": "textarea", "required": true, "sort_order": 2},
    {"id": "mnt_priority", "name": "Priority", "type": "dropdown", "required": true, "options": ["Low", "Medium", "High", "Urgent"], "sort_order": 3},
    {"id": "mnt_reported", "name": "Reported By", "type": "text", "required": true, "sort_order": 4},
    {"id": "mnt_assigned", "name": "Assigned To", "type": "text", "required": false, "sort_order": 5},
    {"id": "mnt_status", "name": "Status", "type": "dropdown", "required": true, "options": ["Open", "In Progress", "Awaiting Parts", "Completed", "Cancelled"], "sort_order": 6},
    {"id": "mnt_completed", "name": "Date Completed", "type": "date", "required": false, "sort_order": 7},
    {"id": "mnt_cost", "name": "Cost", "type": "currency", "required": false, "sort_order": 8},
    {"id": "mnt_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 9}
  ]'::jsonb,
  true,
  'active'
),
(
  'Medication Register',
  'Register of all medications stored at the service for children',
  '💊',
  '[
    {"id": "med_child", "name": "Child Name", "type": "text", "required": true, "sort_order": 0},
    {"id": "med_name", "name": "Medication Name", "type": "text", "required": true, "sort_order": 1},
    {"id": "med_dose", "name": "Dosage", "type": "text", "required": true, "sort_order": 2},
    {"id": "med_freq", "name": "Frequency", "type": "text", "required": true, "sort_order": 3},
    {"id": "med_start", "name": "Start Date", "type": "date", "required": true, "sort_order": 4},
    {"id": "med_end", "name": "End Date", "type": "date", "required": false, "sort_order": 5},
    {"id": "med_expiry", "name": "Medication Expiry", "type": "date", "required": true, "sort_order": 6},
    {"id": "med_auth", "name": "Parent Authorisation", "type": "checkbox", "required": true, "sort_order": 7},
    {"id": "med_storage", "name": "Storage Requirements", "type": "dropdown", "required": true, "options": ["Room Temperature", "Refrigerated", "Locked Cabinet", "Other"], "sort_order": 8},
    {"id": "med_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 9}
  ]'::jsonb,
  true,
  'active'
),
(
  'Vehicle Register',
  'Register of vehicles used by the service for excursions or transport',
  '🚗',
  '[
    {"id": "veh_rego", "name": "Registration Number", "type": "text", "required": true, "sort_order": 0},
    {"id": "veh_make", "name": "Make/Model", "type": "text", "required": true, "sort_order": 1},
    {"id": "veh_year", "name": "Year", "type": "number", "required": false, "sort_order": 2},
    {"id": "veh_capacity", "name": "Seating Capacity", "type": "number", "required": true, "sort_order": 3},
    {"id": "veh_restraints", "name": "Child Restraints Available", "type": "number", "required": false, "sort_order": 4},
    {"id": "veh_rego_exp", "name": "Registration Expiry", "type": "date", "required": true, "sort_order": 5},
    {"id": "veh_insurance_exp", "name": "Insurance Expiry", "type": "date", "required": true, "sort_order": 6},
    {"id": "veh_service_date", "name": "Last Service Date", "type": "date", "required": false, "sort_order": 7},
    {"id": "veh_condition", "name": "Condition", "type": "dropdown", "required": false, "options": ["Excellent", "Good", "Fair", "Needs Attention"], "sort_order": 8},
    {"id": "veh_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 9}
  ]'::jsonb,
  true,
  'active'
),
(
  'Key Register',
  'Register of all keys issued to staff members',
  '🔑',
  '[
    {"id": "key_number", "name": "Key Number/Code", "type": "text", "required": true, "sort_order": 0},
    {"id": "key_type", "name": "Key Type", "type": "dropdown", "required": true, "options": ["Front Door", "Back Door", "Office", "Storage", "Medication Cabinet", "Alarm", "Master", "Other"], "sort_order": 1},
    {"id": "key_issued", "name": "Issued To", "type": "text", "required": true, "sort_order": 2},
    {"id": "key_date_issued", "name": "Date Issued", "type": "date", "required": true, "sort_order": 3},
    {"id": "key_returned", "name": "Returned", "type": "checkbox", "required": false, "sort_order": 4},
    {"id": "key_date_returned", "name": "Date Returned", "type": "date", "required": false, "sort_order": 5},
    {"id": "key_notes", "name": "Notes", "type": "textarea", "required": false, "sort_order": 6}
  ]'::jsonb,
  true,
  'active'
);
