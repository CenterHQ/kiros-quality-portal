-- =============================================================================
-- Batch 6: Agent Tool Updates & Temperature Fix
-- =============================================================================
-- Run this file manually in Supabase SQL Editor.
-- It does two things:
--   1. Sets temperature to NULL for all agents (deprecated; only 1.0 accepted)
--   2. Adds domain-specific tools to each agent (deduplicated via DISTINCT)
-- =============================================================================

-- Fix deprecated temperature values (only 1.0 accepted by current models)
UPDATE ai_agent_definitions SET temperature = NULL WHERE temperature IS NOT NULL;

-- QA1 Agent: Add forms (weekly reflections)
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_forms', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA1 Agent';

-- QA2 Agent: Add registers (medication/incident logs)
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_registers', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA2 Agent';

-- QA3 Agent: Add documents
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_documents', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA3 Agent';

-- QA4 Agent: Add forms, documents
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_forms', 'get_documents', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA4 Agent';

-- QA5 Agent: Add registers, compliance items
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_registers', 'get_compliance_items', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA5 Agent';

-- QA6 Agent: Add documents, compliance items
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_documents', 'get_compliance_items', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA6 Agent';

-- QA7 Agent: Add documents, policies, policy detail
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_documents', 'get_policies', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'QA7 Agent';

-- Compliance Agent: Add registers, forms, activity log
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_registers', 'get_forms', 'get_activity_log', 'get_policy_detail', 'read_document_content', 'get_checklist_detail'])
  ) AS tool
)
WHERE name = 'Compliance Agent';

-- Marketing Agent: Add policies, documents
UPDATE ai_agent_definitions
SET available_tools = (
  SELECT array_agg(DISTINCT tool) FROM unnest(
    array_cat(available_tools, ARRAY['get_policies', 'get_documents', 'get_policy_detail', 'read_document_content'])
  ) AS tool
)
WHERE name = 'Marketing Agent';

-- Verify: List all agents and their tools
SELECT name, available_tools, temperature FROM ai_agent_definitions WHERE is_active = true ORDER BY name;
