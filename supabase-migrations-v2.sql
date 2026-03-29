-- ============================================
-- V2 MIGRATION: Tags, Element Actions, Acknowledgements
-- Run this in Supabase SQL Editor after the initial schema
-- ============================================

-- ============================================
-- TAGS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text DEFAULT '#470DA8',
  category text DEFAULT 'general' CHECK (category IN ('qa', 'priority', 'training', 'status', 'custom')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entity_tags (
  id serial PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('element', 'task', 'action', 'document', 'training')),
  entity_id text NOT NULL,
  tag_id integer REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags viewable by all" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tags manageable by admin" ON public.tags FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

CREATE POLICY "Entity tags viewable by all" ON public.entity_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Entity tags manageable by all" ON public.entity_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Entity tags deletable by all" ON public.entity_tags FOR DELETE TO authenticated USING (true);

-- Pre-populate tags
INSERT INTO public.tags (name, color, category) VALUES
('QA1', '#e74c3c', 'qa'),
('QA2', '#e67e22', 'qa'),
('QA3', '#2ecc71', 'qa'),
('QA4', '#3498db', 'qa'),
('QA5', '#9b59b6', 'qa'),
('QA6', '#1abc9c', 'qa'),
('QA7', '#34495e', 'qa'),
('Urgent', '#e74c3c', 'priority'),
('High Priority', '#e67e22', 'priority'),
('Medium Priority', '#EDC430', 'priority'),
('Low Priority', '#2ecc71', 'priority'),
('Training Required', '#B5179E', 'training'),
('Training Complete', '#2ecc71', 'training'),
('Compliance', '#e74c3c', 'status'),
('Documentation', '#3498db', 'status'),
('Environment', '#2ecc71', 'status'),
('Family Engagement', '#1abc9c', 'status'),
('Educator Practice', '#9b59b6', 'status'),
('Governance', '#34495e', 'status')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ELEMENT ACTIONS (checklist items per element)
-- ============================================
CREATE TABLE IF NOT EXISTS public.element_actions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  element_id integer REFERENCES public.qa_elements(id) NOT NULL,
  title text NOT NULL,
  description text,
  steps jsonb DEFAULT '[]',
  prerequisites text[] DEFAULT '{}',
  evidence_required text,
  evidence_files text[] DEFAULT '{}',
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed')),
  assigned_to uuid REFERENCES public.profiles(id),
  due_date date,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.element_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Element actions viewable by all" ON public.element_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Element actions insertable" ON public.element_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Element actions updatable" ON public.element_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Element actions deletable by privileged" ON public.element_actions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns'))
);

CREATE TRIGGER update_element_actions_updated_at BEFORE UPDATE ON public.element_actions FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- Realtime for element_actions
ALTER PUBLICATION supabase_realtime ADD TABLE public.element_actions;

-- ============================================
-- ACKNOWLEDGEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.acknowledgements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('comment', 'action', 'activity')),
  entity_id text NOT NULL,
  acknowledged_at timestamptz DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acknowledgements viewable by all" ON public.acknowledgements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Acknowledgements insertable" ON public.acknowledgements FOR INSERT TO authenticated WITH CHECK (true);
