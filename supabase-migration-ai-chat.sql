-- ============================================
-- AI CHAT & SUGGESTIONS SYSTEM
-- ============================================

-- Chat conversations per user
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat messages within conversations
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool_call', 'tool_result')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- AI-powered suggestions with approval workflow
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  suggested_by uuid REFERENCES profiles(id),
  target_role text CHECK (target_role IN ('admin', 'manager', 'ns', 'el', 'educator')),
  target_user_id uuid REFERENCES profiles(id),
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'daily_priority', 'qip_improvement', 'training_gap',
    'checklist_improvement', 'compliance_reminder', 'family_engagement'
  )),
  title text NOT NULL,
  content text NOT NULL,
  action_type text CHECK (action_type IN ('create_task', 'assign_training', 'create_checklist', 'update_element', 'view_item')),
  action_payload jsonb DEFAULT '{}',
  related_qa integer[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'actioned', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_note text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Users manage their own conversations
CREATE POLICY "users_own_conversations" ON chat_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users access messages in their own conversations
CREATE POLICY "users_own_messages" ON chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = conversation_id AND user_id = auth.uid()
  ));

-- Suggestions: users see their own role's suggestions + NS/admin see all pending
CREATE POLICY "users_read_suggestions" ON ai_suggestions
  FOR SELECT TO authenticated
  USING (
    target_user_id = auth.uid()
    OR target_role = (SELECT role FROM profiles WHERE id = auth.uid())
    OR suggested_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ns')
  );

CREATE POLICY "users_insert_suggestions" ON ai_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_update_suggestions" ON ai_suggestions
  FOR UPDATE TO authenticated
  USING (
    suggested_by = auth.uid()
    OR target_user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'ns')
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_ai_suggestions_status_role ON ai_suggestions(status, target_role);
CREATE INDEX idx_ai_suggestions_user ON ai_suggestions(target_user_id);
CREATE INDEX idx_ai_suggestions_suggested_by ON ai_suggestions(suggested_by);
