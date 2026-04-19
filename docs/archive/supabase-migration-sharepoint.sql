-- ============================================
-- SHAREPOINT INTEGRATION & CENTRE CONTEXT
-- ============================================

-- Store SharePoint connection credentials
CREATE TABLE IF NOT EXISTS sharepoint_connection (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  site_id text,
  drive_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_by uuid REFERENCES profiles(id),
  site_url text,
  status text DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cached SharePoint documents
CREATE TABLE IF NOT EXISTS sharepoint_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sharepoint_item_id text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  content_hash text,
  extracted_text text,
  document_type text CHECK (document_type IN ('qip', 'philosophy', 'policy', 'handbook', 'programming', 'procedure', 'other')),
  is_monitored boolean DEFAULT false,
  last_modified_at timestamptz,
  last_synced_at timestamptz,
  last_processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sharepoint_item_id)
);

-- Extracted centre context from documents
CREATE TABLE IF NOT EXISTS centre_context (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES sharepoint_documents(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN (
    'qip_goal', 'qip_strategy', 'philosophy_principle',
    'policy_requirement', 'procedure_step', 'service_value',
    'teaching_approach', 'family_engagement', 'inclusion_practice',
    'safety_protocol', 'environment_feature', 'leadership_goal'
  )),
  title text NOT NULL,
  content text NOT NULL,
  related_qa integer[] DEFAULT '{}',
  related_element_codes text[] DEFAULT '{}',
  source_quote text,
  ai_generated boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Centre-specific additions to training modules
CREATE TABLE IF NOT EXISTS lms_module_centre_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES lms_modules(id) ON DELETE CASCADE,
  context_id uuid REFERENCES centre_context(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('application', 'reflection_prompt', 'quiz_question', 'action_step', 'case_study')),
  title text NOT NULL,
  content text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  generated_at timestamptz DEFAULT now(),
  UNIQUE(module_id, context_id, content_type)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sharepoint_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharepoint_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE centre_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_module_centre_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_sharepoint_connection" ON sharepoint_connection FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_sharepoint_documents" ON sharepoint_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_centre_context" ON centre_context FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_lms_module_centre_content" ON lms_module_centre_content FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sharepoint_docs_type ON sharepoint_documents(document_type);
CREATE INDEX idx_sharepoint_docs_monitored ON sharepoint_documents(is_monitored);
CREATE INDEX idx_centre_context_type ON centre_context(context_type);
CREATE INDEX idx_centre_context_document ON centre_context(document_id);
CREATE INDEX idx_centre_context_qa ON centre_context USING gin(related_qa);
CREATE INDEX idx_module_centre_content_module ON lms_module_centre_content(module_id);
