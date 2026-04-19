-- ============================================================================
-- Migration: AI Configuration Tables
-- Created: 2026-04-13
-- Description: Creates ai_config, ai_tool_permissions, ai_document_styles
--              tables and seeds them with all current hardcoded values.
-- Idempotent: All CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING
-- ============================================================================

-- ============================================================================
-- TABLE 1: ai_config — centralised key-value store for all operational parameters
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_config (
  id serial PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  value_type text NOT NULL DEFAULT 'string' CHECK (value_type IN ('string','int','float','json','bool','text')),
  category text NOT NULL,
  label text NOT NULL,
  description text,
  validation_min numeric,
  validation_max numeric,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_config_category ON ai_config(category);
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'read_ai_config') THEN
    CREATE POLICY "read_ai_config" ON ai_config FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'admin_write_ai_config') THEN
    CREATE POLICY "admin_write_ai_config" ON ai_config FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'admin_update_ai_config') THEN
    CREATE POLICY "admin_update_ai_config" ON ai_config FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_config' AND policyname = 'admin_delete_ai_config') THEN
    CREATE POLICY "admin_delete_ai_config" ON ai_config FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;


-- ============================================================================
-- TABLE 2: ai_tool_permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_tool_permissions (
  id serial PRIMARY KEY,
  tool_name text NOT NULL UNIQUE,
  tool_type text NOT NULL DEFAULT 'main' CHECK (tool_type IN ('main','marketing')),
  allowed_roles text[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_tool_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_tool_permissions' AND policyname = 'read_tool_permissions') THEN
    CREATE POLICY "read_tool_permissions" ON ai_tool_permissions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_tool_permissions' AND policyname = 'admin_write_tool_permissions') THEN
    CREATE POLICY "admin_write_tool_permissions" ON ai_tool_permissions FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_tool_permissions' AND policyname = 'admin_update_tool_permissions') THEN
    CREATE POLICY "admin_update_tool_permissions" ON ai_tool_permissions FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_tool_permissions' AND policyname = 'admin_delete_tool_permissions') THEN
    CREATE POLICY "admin_delete_tool_permissions" ON ai_tool_permissions FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;


-- ============================================================================
-- TABLE 3: ai_document_styles
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_document_styles (
  id serial PRIMARY KEY,
  format text NOT NULL UNIQUE CHECK (format IN ('pdf','word','excel','html','report_pdf','report_html','report_excel')),
  styles jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

ALTER TABLE ai_document_styles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_document_styles' AND policyname = 'read_doc_styles') THEN
    CREATE POLICY "read_doc_styles" ON ai_document_styles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_document_styles' AND policyname = 'admin_write_doc_styles') THEN
    CREATE POLICY "admin_write_doc_styles" ON ai_document_styles FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_document_styles' AND policyname = 'admin_update_doc_styles') THEN
    CREATE POLICY "admin_update_doc_styles" ON ai_document_styles FOR UPDATE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_document_styles' AND policyname = 'admin_delete_doc_styles') THEN
    CREATE POLICY "admin_delete_doc_styles" ON ai_document_styles FOR DELETE TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;


-- ============================================================================
-- SEED DATA: ai_config (~70 keys)
-- ============================================================================

INSERT INTO ai_config (config_key, config_value, value_type, category, label, description, validation_min, validation_max) VALUES

-- Model & Thinking
('model.opus_id', 'claude-opus-4-20250514', 'string', 'model', 'Opus Model ID', 'Claude Opus model identifier', NULL, NULL),
('model.sonnet_id', 'claude-sonnet-4-20250514', 'string', 'model', 'Sonnet Model ID', 'Claude Sonnet model identifier', NULL, NULL),
('model.default', 'opus', 'string', 'model', 'Default Model', 'Which model to use by default (opus or sonnet)', NULL, NULL),
('model.simple_signals_regex', '^(hi|hello|hey|thanks|thank you|ok|yes|no|sure|got it|cheers|bye|good morning|good afternoon)\b', 'string', 'model', 'Simple Message Regex', 'Regex pattern to detect trivial messages that use Sonnet instead of Opus', NULL, NULL),
('model.simple_message_max_length', '50', 'int', 'model', 'Simple Message Max Length', 'Maximum message length (chars) for Sonnet routing', 10, 200),
('model.thinking_enabled', 'true', 'bool', 'model', 'Extended Thinking', 'Enable extended thinking for Opus model', NULL, NULL),
('model.thinking_budget_tokens', '10000', 'int', 'model', 'Thinking Budget', 'Max tokens for extended thinking', 1024, 100000),
('model.chat_max_tokens', '16384', 'int', 'model', 'Chat Max Tokens', 'Max output tokens per chat response', 4096, 32768),

-- Chat Parameters
('chat.max_iterations', '5', 'int', 'chat', 'Max Tool Iterations', 'Max tool-use loop iterations per message', 1, 20),
('chat.history_limit', '60', 'int', 'chat', 'History Limit', 'Max messages loaded from conversation history', 10, 200),
('chat.context_types', '["qip_goal","qip_strategy","philosophy_principle","service_value","leadership_goal"]', 'json', 'chat', 'Context Types in Prompt', 'Centre context types loaded into system prompt', NULL, NULL),
('chat.title_generation_enabled', 'true', 'bool', 'chat', 'AI Title Generation', 'Generate intelligent conversation titles using AI', NULL, NULL),
('chat.title_max_tokens', '30', 'int', 'chat', 'Title Max Tokens', 'Max tokens for title generation', 10, 100),
('chat.suggestions_limit', '20', 'int', 'chat', 'Suggestions Limit', 'Max AI suggestions returned per query', 5, 50),
('chat.prompt_size_warning', '100000', 'int', 'chat', 'Prompt Size Warning', 'Character count threshold for system prompt size warning', 50000, 500000),

-- Agent Defaults
('agent.default_model', 'sonnet', 'string', 'agent', 'Default Agent Model', 'Default model for new specialist agents', NULL, NULL),
('agent.default_max_iterations', '5', 'int', 'agent', 'Default Max Iterations', 'Default tool iterations for new agents', 1, 20),
('agent.default_token_budget', '8192', 'int', 'agent', 'Default Token Budget', 'Default output token budget for new agents', 512, 32768),
('agent.default_tools', '["search_centre_context","get_qa_progress","get_overdue_items","get_policies","get_policy_detail","get_checklists","get_checklist_detail","get_documents","read_document_content","get_room_data"]', 'json', 'agent', 'Default Agent Tools', 'Default tools assigned to newly created agents', NULL, NULL),

-- Upload
('upload.max_file_size_mb', '10', 'int', 'upload', 'Max File Size (MB)', 'Maximum file size per upload in megabytes', 1, 50),
('upload.max_files', '10', 'int', 'upload', 'Max Files Per Upload', 'Maximum number of files per upload request', 1, 20),
('upload.text_truncation_limit', '50000', 'int', 'upload', 'Text Truncation Limit', 'Max characters extracted from uploaded documents', 10000, 200000),
('upload.signed_url_expiry', '3600', 'int', 'upload', 'Signed URL Expiry (seconds)', 'Expiry time for file download URLs', 300, 86400),

-- Learning System
('learning.max_in_prompt', '30', 'int', 'learning', 'Max Learnings in Prompt', 'Maximum learnings injected into system prompt', 5, 100),
('learning.default_confidence', '0.8', 'float', 'learning', 'Default Confidence', 'Default confidence for new learnings', 0.1, 1.0),
('learning.reinforcement_increment', '0.05', 'float', 'learning', 'Reinforcement Increment', 'Confidence increase per reinforcement', 0.01, 0.2),
('learning.correction_confidence', '0.9', 'float', 'learning', 'Correction Confidence', 'Confidence for agent feedback corrections', 0.5, 1.0),

-- Brand Identity
('brand.centre_name', 'Kiros Early Education', 'string', 'brand', 'Centre Name', 'Display name of the centre', NULL, NULL),
('brand.centre_name_upper', 'KIROS EARLY EDUCATION', 'string', 'brand', 'Centre Name (Uppercase)', 'Uppercase centre name for document headers', NULL, NULL),
('brand.entity_name', 'HWAW Kirollos Childcare Pty Ltd', 'string', 'brand', 'Entity Name', 'Legal entity name', NULL, NULL),
('brand.se_number', 'SE-00017066', 'string', 'brand', 'SE Number', 'Service Establishment number', NULL, NULL),
('brand.location', 'Blackett, NSW', 'string', 'brand', 'Location', 'Centre location', NULL, NULL),
('brand.tagline', 'Generated by Kiros AI Assistant', 'string', 'brand', 'Document Tagline', 'Footer text on generated documents', NULL, NULL),
('brand.primary_colour', '#470DA8', 'string', 'brand', 'Primary Colour', 'Primary brand colour (hex)', NULL, NULL),
('brand.gold_colour', '#EDC430', 'string', 'brand', 'Gold/Accent Colour', 'Gold accent colour (hex)', NULL, NULL),
('brand.qa_colours', '["#e74c3c","#e67e22","#2ecc71","#3498db","#9b59b6","#1abc9c","#34495e"]', 'json', 'brand', 'QA Area Colours', 'Colours for QA1-QA7 badges (hex array)', NULL, NULL),

-- Display/Preview
('display.doc_preview_length', '500', 'int', 'display', 'Document Preview Length', 'Characters shown in document text preview', 100, 2000),
('display.context_snippet_length', '150', 'int', 'display', 'Context Snippet Length', 'Characters shown in search result snippets', 50, 500),
('display.agent_summary_length', '300', 'int', 'display', 'Agent Summary Length', 'Characters shown in agent result summaries', 100, 1000),

-- Marketing
('marketing.default_ad_variations', '3', 'int', 'marketing', 'Default Ad Variations', 'Number of ad copy variations generated', 1, 10),
('marketing.default_review_tone', 'empathetic', 'string', 'marketing', 'Default Review Tone', 'Default tone for review responses', NULL, NULL),
('marketing.analytics_lookback_days', '30', 'int', 'marketing', 'Analytics Lookback Days', 'Default days for analytics queries', 7, 365),
('marketing.comments_sync_limit', '25', 'int', 'marketing', 'Comments Sync Limit', 'Max posts to sync comments from', 5, 100),
('marketing.feed_sync_limit', '30', 'int', 'marketing', 'Feed Sync Limit', 'Max content items for engagement sync', 5, 100),
('marketing.analytics_results_limit', '100', 'int', 'marketing', 'Analytics Results Limit', 'Max analytics records per query', 10, 500),

-- Widget
('widget.max_stored_messages', '20', 'int', 'widget', 'Widget Max Messages', 'Max messages stored in widget localStorage', 5, 50),
('widget.width_px', '420', 'int', 'widget', 'Widget Width (px)', 'Floating chat widget width in pixels', 300, 600),
('widget.height_px', '550', 'int', 'widget', 'Widget Height (px)', 'Floating chat widget height in pixels', 400, 800),
('widget.speech_language', 'en-AU', 'string', 'widget', 'Speech Language', 'Language code for voice recognition', NULL, NULL),

-- Reports
('report.max_export_rows', '10000', 'int', 'report', 'Max Export Rows', 'Maximum rows in data extract exports', 100, 100000),
('report.preview_row_limit', '50', 'int', 'report', 'Preview Row Limit', 'Rows shown in data extract preview', 10, 200),

-- Cron Thresholds
('cron.qualification_warning_days', '30', 'int', 'cron', 'Qualification Warning Days', 'Days before expiry to flag qualifications', 7, 90),
('cron.marketing_publish_batch', '10', 'int', 'cron', 'Publish Batch Size', 'Max items per marketing publish run', 1, 50),
('cron.marketing_token_threshold_days', '7', 'int', 'cron', 'Token Refresh Threshold', 'Days before expiry to refresh tokens', 1, 30),
('cron.marketing_analytics_cache_hours', '6', 'int', 'cron', 'Analytics Cache Hours', 'Hours before analytics cache expires', 1, 48),
('cron.document_retry_limit', '5', 'int', 'cron', 'Document Retry Limit', 'Max pending documents to retry per cron run', 1, 20),

-- SharePoint
('sharepoint.token_expiry_seconds', '3600', 'int', 'sharepoint', 'Token Expiry (seconds)', 'SharePoint access token lifetime', 300, 7200),

-- Dashboard
('dashboard.qip_weight_elements', '0.4', 'float', 'dashboard', 'QIP Weight: Elements', 'Weight of QA element scores in QIP progress', 0, 1),
('dashboard.qip_weight_tasks', '0.3', 'float', 'dashboard', 'QIP Weight: Tasks', 'Weight of task completion in QIP progress', 0, 1),
('dashboard.qip_weight_compliance', '0.2', 'float', 'dashboard', 'QIP Weight: Compliance', 'Weight of compliance status in QIP progress', 0, 1),
('dashboard.qip_weight_training', '0.1', 'float', 'dashboard', 'QIP Weight: Training', 'Weight of training completion in QIP progress', 0, 1),

-- Compliance
('compliance.mandatory_qualifications', '["first_aid","cpr","anaphylaxis","asthma","child_protection","wwcc","food_safety"]', 'json', 'compliance', 'Mandatory Qualifications', 'List of qualification types required for all staff', NULL, NULL),

-- Integrations
('integration.graph_api_version', 'v1.0', 'string', 'integration', 'Graph API Version', 'Microsoft Graph API version', NULL, NULL),
('integration.owna_api_url', 'https://api.owna.com.au', 'string', 'integration', 'OWNA API URL', 'OWNA API base URL', NULL, NULL),
('integration.owna_centre_id', '580583630ead9d0af4be45f7', 'string', 'integration', 'OWNA Centre ID', 'OWNA centre/demo identifier', NULL, NULL)

ON CONFLICT (config_key) DO NOTHING;


-- ============================================================================
-- SEED DATA: ai_tool_permissions (31 main + 11 marketing)
-- ============================================================================

INSERT INTO ai_tool_permissions (tool_name, tool_type, allowed_roles, description) VALUES

-- Main chat tools
('search_centre_context', 'main', '{admin,manager,ns,el,educator}', 'Search QIP goals, policies, procedures, philosophy'),
('create_task', 'main', '{admin,ns,manager}', 'Create a new task (requires confirmation)'),
('assign_training', 'main', '{admin,ns,manager,el}', 'Assign training to staff (requires confirmation)'),
('get_overdue_items', 'main', '{admin,manager,ns,el,educator}', 'Get overdue tasks, training, and checklists'),
('get_qa_progress', 'main', '{admin,manager,ns,el,educator}', 'Get QA1-7 progress and element ratings'),
('get_staff_training_status', 'main', '{admin,manager,ns,el}', 'Get staff training and qualifications'),
('get_dashboard_summary', 'main', '{admin}', 'Get comprehensive dashboard metrics (admin only)'),
('suggest_improvement', 'main', '{manager,el,educator}', 'Submit improvement suggestion for review'),
('generate_document', 'main', '{admin,manager,ns,el,educator}', 'Generate and upload documents'),
('get_policies', 'main', '{admin,manager,ns,el,educator}', 'List policies with summary and review status'),
('get_policy_detail', 'main', '{admin,manager,ns,el,educator}', 'Get full policy content by ID'),
('get_checklists', 'main', '{admin,manager,ns,el,educator}', 'Get checklist templates and instances'),
('get_checklist_detail', 'main', '{admin,manager,ns,el,educator}', 'Get full checklist instance with responses'),
('get_roster_data', 'main', '{admin,manager,ns}', 'Get roster shifts, leave, and programming time'),
('get_registers', 'main', '{admin,ns,manager}', 'Get register definitions and entries'),
('get_forms', 'main', '{admin,ns,manager,el}', 'Get form submissions'),
('get_learning_data', 'main', '{admin,manager,ns,el,educator}', 'Get LMS pathways, PDP goals, certificates'),
('get_compliance_items', 'main', '{admin,manager,ns,el,educator}', 'Get compliance items and status'),
('get_activity_log', 'main', '{admin,ns}', 'Get activity log entries'),
('get_documents', 'main', '{admin,manager,ns,el,educator}', 'List uploaded and SharePoint documents'),
('read_document_content', 'main', '{admin,manager,ns,el,educator}', 'Read full document content by ID'),
('get_room_data', 'main', '{admin,manager,ns,el,educator}', 'Get room information and ratio rules'),
('search_platform', 'main', '{admin,manager,ns,el,educator}', 'Search across all platform data'),
('update_item', 'main', '{admin,ns,manager}', 'Update task/compliance/QA element (requires confirmation)'),
('create_checklist_instance', 'main', '{admin,ns,manager}', 'Create checklist instance (requires confirmation)'),
('export_document', 'main', '{admin,manager,ns,el,educator}', 'Export document information'),
('run_deep_analysis', 'main', '{admin,manager,ns,el}', 'Run multi-agent deep analysis'),
('delegate_to_agents', 'main', '{admin,manager,ns,el,educator}', 'Delegate to specialist agents'),
('save_learning', 'main', '{admin,manager,ns,el,educator}', 'Save a learning for future conversations'),
('get_learnings', 'main', '{admin,manager,ns,el,educator}', 'Retrieve past learnings'),
('record_agent_feedback', 'main', '{admin,manager,ns,el,educator}', 'Record feedback on agent performance'),

-- Marketing tools
('generate_social_post', 'marketing', '{admin,manager,ns}', 'Generate social media post content'),
('generate_ad_copy', 'marketing', '{admin,manager,ns}', 'Generate advertising copy'),
('respond_to_review', 'marketing', '{admin,manager,ns}', 'Generate review response'),
('generate_analytics_report', 'marketing', '{admin,manager,ns}', 'Generate marketing analytics report'),
('get_marketing_performance', 'marketing', '{admin,manager,ns}', 'Get marketing performance metrics'),
('get_content_calendar', 'marketing', '{admin,manager,ns}', 'Get content calendar'),
('generate_content_ideas', 'marketing', '{admin,manager,ns}', 'Generate content ideas'),
('get_reviews_summary', 'marketing', '{admin,manager,ns}', 'Get reviews summary'),
('search_centre_info', 'marketing', '{admin,manager,ns}', 'Search centre information for marketing'),
('schedule_content', 'marketing', '{admin}', 'Schedule content for publishing (admin only)'),
('get_competitor_insights', 'marketing', '{admin,manager,ns}', 'Get competitor analysis insights')

ON CONFLICT (tool_name) DO NOTHING;


-- ============================================================================
-- SEED DATA: ai_document_styles (4 formats)
-- ============================================================================

INSERT INTO ai_document_styles (format, styles) VALUES
('pdf', '{
  "page": {"paddingTop": 80, "paddingBottom": 60, "paddingHorizontal": 50, "fontFamily": "Helvetica", "fontSize": 11, "lineHeight": 1.5, "color": "#1a1a1a"},
  "header": {"top": 15, "height": 30, "borderBottomWidth": 1, "borderBottomColor": "#dddddd", "paddingBottom": 6, "fontSize": 14, "fontWeight": "bold", "color": "#470DA8", "separatorColor": "#EDC430", "separatorFontSize": 10, "titleFontSize": 11, "titleColor": "#470DA8"},
  "title": {"fontSize": 22, "fontWeight": "bold", "color": "#470DA8", "marginBottom": 4, "textAlign": "center"},
  "subtitle": {"fontSize": 16, "color": "#470DA8", "marginBottom": 4, "textAlign": "center"},
  "date": {"fontSize": 13, "fontWeight": "bold", "color": "#EDC430", "textAlign": "center"},
  "heading1": {"fontSize": 16, "fontWeight": "bold", "color": "#470DA8", "marginTop": 18, "marginBottom": 6},
  "heading2": {"fontSize": 16, "fontWeight": "bold", "color": "#470DA8", "marginTop": 14, "marginBottom": 4},
  "heading3": {"fontSize": 11, "fontWeight": "bold", "color": "#470DA8", "marginTop": 10, "marginBottom": 4},
  "paragraph": {"fontSize": 11, "marginBottom": 8, "lineHeight": 1.6},
  "listItem": {"fontSize": 11, "marginBottom": 4, "paddingLeft": 16, "lineHeight": 1.5},
  "blockquote": {"fontSize": 10, "fontStyle": "italic", "color": "#666666", "marginBottom": 8, "paddingLeft": 16, "borderLeftWidth": 3, "borderLeftColor": "#470DA8"},
  "codeBlock": {"fontSize": 9, "fontFamily": "Courier", "backgroundColor": "#f5f5f5", "padding": 10, "marginBottom": 8, "borderRadius": 3},
  "table": {"headerBg": "#470DA8", "headerColor": "#ffffff", "headerFontSize": 9, "headerFontWeight": "bold", "cellPadding": 6, "cellFontSize": 9, "rowBorderWidth": 1, "rowBorderColor": "#dddddd"},
  "footer": {"bottom": 20, "borderTopWidth": 1, "borderTopColor": "#dddddd", "paddingTop": 8, "fontSize": 8, "color": "#666666"}
}'::jsonb),

('word', '{
  "page": {"width": 11906, "height": 16838, "marginTop": 1440, "marginRight": 1080, "marginBottom": 1440, "marginLeft": 1080},
  "header": {"fontSize": 28, "fontWeight": "bold", "color": "470DA8", "separatorColor": "EDC430", "separatorFontSize": 20, "titleFontSize": 22, "titleColor": "470DA8"},
  "title": {"fontSize": 44, "fontWeight": "bold", "color": "470DA8", "spacingAfter": 60},
  "subtitle": {"fontSize": 32, "color": "470DA8", "spacingAfter": 60},
  "date": {"fontSize": 26, "fontWeight": "bold", "color": "EDC430", "spacingAfter": 120},
  "heading1": {"fontSize": 32, "fontWeight": "bold", "color": "470DA8", "spacingBefore": 240, "spacingAfter": 120},
  "heading2": {"fontSize": 32, "fontWeight": "bold", "color": "470DA8", "spacingBefore": 240, "spacingAfter": 120},
  "heading3": {"fontSize": 22, "fontWeight": "bold", "color": "470DA8", "spacingBefore": 240, "spacingAfter": 120},
  "paragraph": {"spacingAfter": 120},
  "listItem": {"spacingAfter": 60, "indentLeft": 360},
  "blockquote": {"fontSize": 20, "fontStyle": "italic", "color": "666666", "spacingAfter": 120, "indentLeft": 480, "borderLeftColor": "470DA8", "borderLeftSize": 6},
  "codeBlock": {"font": "Courier New", "fontSize": 18, "spacingAfter": 120, "shadingFill": "f5f5f5"},
  "table": {"headerFill": "470DA8", "headerColor": "ffffff", "headerFontSize": 20, "cellFontSize": 20, "cellColor": "1a1a1a"},
  "footer": {"fontSize": 16, "color": "666666"},
  "meta": {"fontSize": 20, "color": "666666"}
}'::jsonb),

('excel', '{
  "headerRow": {"height": 30, "fontSize": 14, "fontWeight": "bold", "fontColor": "FFFFFFFF", "fillColor": "FF470DA8", "alignment": "middle"},
  "heading": {"fontWeight": "bold", "h1FontSize": 14, "h2FontSize": 12, "h3FontSize": 11, "fontColor": "FF470DA8"},
  "tableHeader": {"fontWeight": "bold", "fontSize": 10, "fontColor": "FFFFFFFF", "fillColor": "FF470DA8", "borderColor": "FF470DA8"},
  "tableData": {"borderStyle": "thin", "borderColor": "FFDDDDDD"},
  "meta": {"fontSize": 10, "fontStyle": "italic", "fontColor": "FF666666"},
  "footer": {"fontSize": 8, "fontStyle": "italic", "fontColor": "FF666666"},
  "column": {"minWidth": 10, "maxWidth": 80}
}'::jsonb),

('html', '{
  "variables": {"brandPrimary": "#470DA8", "brandPrimaryLight": "#6b3fbf", "brandGold": "#EDC430", "textColor": "#1a1a1a", "textMuted": "#666666", "borderColor": "#e0e0e0", "bgLight": "#f8f7fc"},
  "body": {"fontFamily": "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif", "lineHeight": 1.7, "maxWidth": "900px", "padding": "0 24px"},
  "header": {"padding": "16px 40px", "borderBottom": "1px solid #e0e0e0"},
  "title": {"fontSize": "22px", "fontWeight": 700, "color": "#470DA8"},
  "heading1": {"fontSize": "20px", "fontWeight": 700, "color": "#470DA8", "margin": "28px 0 12px"},
  "heading2": {"fontSize": "16px", "fontWeight": 700, "color": "#470DA8", "margin": "24px 0 10px"},
  "heading3": {"fontSize": "13px", "fontWeight": 700, "color": "#470DA8", "margin": "20px 0 8px"},
  "paragraph": {"fontSize": "15px", "marginBottom": "14px"},
  "blockquote": {"borderLeft": "4px solid #470DA8", "padding": "12px 20px", "background": "#f8f7fc", "color": "#666666", "fontSize": "12px", "fontStyle": "italic", "borderRadius": "0 4px 4px 0"},
  "table": {"headerBg": "#470DA8", "headerColor": "#ffffff", "headerPadding": "10px 14px", "cellPadding": "10px 14px", "cellBorder": "1px solid #e0e0e0", "alternateRowBg": "#f8f7fc"},
  "codeBlock": {"background": "#f4f4f4", "padding": "16px", "borderRadius": "6px", "fontSize": "13px"},
  "link": {"color": "#470DA8", "textDecoration": "none"},
  "footer": {"marginTop": "48px", "borderTop": "1px solid #e0e0e0", "fontSize": "12px", "color": "#666666"}
}'::jsonb)

ON CONFLICT (format) DO NOTHING;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT category, COUNT(*) as count FROM ai_config GROUP BY category ORDER BY category;
SELECT tool_type, COUNT(*) as count FROM ai_tool_permissions GROUP BY tool_type;
SELECT format FROM ai_document_styles ORDER BY format;
