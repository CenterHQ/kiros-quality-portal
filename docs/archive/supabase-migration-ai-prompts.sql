-- ============================================
-- AI SYSTEM PROMPTS & AGENT ORCHESTRATION
-- ============================================

-- Admin-editable system prompt sections for Kiros AI
-- Each row represents a logical section of the system prompt
-- that can be managed via the admin UI.
CREATE TABLE IF NOT EXISTS ai_system_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL CHECK (section IN (
    'identity', 'expertise', 'role_instructions',
    'response_rules', 'document_templates', 'custom'
  )),
  role text CHECK (role IN ('admin', 'manager', 'ns', 'el', 'educator')),
  title text NOT NULL,
  template text NOT NULL,
  variables jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure one prompt per (section, role) for non-custom sections.
-- Custom sections can have multiple entries so we exclude them.
CREATE UNIQUE INDEX uq_ai_system_prompts_section_role
  ON ai_system_prompts (section, COALESCE(role, '__global__'))
  WHERE section <> 'custom';

-- Agent definitions for multi-agent orchestration
-- Each agent has a focused system prompt and a set of tools it can invoke.
CREATE TABLE IF NOT EXISTS ai_agent_definitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  system_prompt text NOT NULL,
  available_tools text[] NOT NULL,
  model text DEFAULT 'claude-sonnet-4-20250514',
  max_iterations integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tracks individual agent invocations within a conversation
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE CASCADE,
  message_id uuid,
  agent_id uuid REFERENCES ai_agent_definitions(id),
  task_description text NOT NULL,
  context jsonb DEFAULT '{}',
  result jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  tokens_used integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ai_system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;

-- ai_system_prompts: any authenticated user can read active prompts (needed by chat API)
CREATE POLICY "authenticated_read_active_prompts" ON ai_system_prompts
  FOR SELECT TO authenticated
  USING (is_active = true);

-- ai_system_prompts: only admins can insert
CREATE POLICY "admin_insert_prompts" ON ai_system_prompts
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_system_prompts: only admins can update
CREATE POLICY "admin_update_prompts" ON ai_system_prompts
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_system_prompts: only admins can delete
CREATE POLICY "admin_delete_prompts" ON ai_system_prompts
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_agent_definitions: any authenticated user can read active definitions
CREATE POLICY "authenticated_read_active_agents" ON ai_agent_definitions
  FOR SELECT TO authenticated
  USING (is_active = true);

-- ai_agent_definitions: only admins can insert
CREATE POLICY "admin_insert_agents" ON ai_agent_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_agent_definitions: only admins can update
CREATE POLICY "admin_update_agents" ON ai_agent_definitions
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_agent_definitions: only admins can delete
CREATE POLICY "admin_delete_agents" ON ai_agent_definitions
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_agent_sessions: users can read sessions for their own conversations
CREATE POLICY "users_read_own_sessions" ON ai_agent_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ai_agent_sessions: insert allowed for authenticated (created by API on behalf of user)
CREATE POLICY "authenticated_insert_sessions" ON ai_agent_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ai_agent_sessions: update allowed for authenticated (status transitions by API)
CREATE POLICY "authenticated_update_sessions" ON ai_agent_sessions
  FOR UPDATE TO authenticated
  USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_ai_system_prompts_lookup ON ai_system_prompts(section, role, is_active);
CREATE INDEX idx_ai_agent_definitions_active ON ai_agent_definitions(is_active);
CREATE INDEX idx_ai_agent_sessions_conversation ON ai_agent_sessions(conversation_id);
CREATE INDEX idx_ai_agent_sessions_status ON ai_agent_sessions(status);
CREATE INDEX idx_ai_agent_sessions_agent ON ai_agent_sessions(agent_id);
