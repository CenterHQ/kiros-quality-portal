-- ============================================
-- REPORT TEMPLATES - Saved extract configurations
-- ============================================

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_shared ON report_templates(is_shared);

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read shared templates + own templates
CREATE POLICY "report_templates_select"
  ON report_templates FOR SELECT
  TO authenticated
  USING (is_shared = true OR created_by = auth.uid());

-- Only admin/manager/ns can create
CREATE POLICY "report_templates_insert"
  ON report_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns')
    )
  );

-- Only the creator (admin/manager/ns) can update their own
CREATE POLICY "report_templates_update"
  ON report_templates FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns')
    )
  );

-- Only the creator (admin/manager/ns) can delete their own
CREATE POLICY "report_templates_delete"
  ON report_templates FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'ns')
    )
  );

-- Enable realtime for templates
ALTER PUBLICATION supabase_realtime ADD TABLE report_templates;
