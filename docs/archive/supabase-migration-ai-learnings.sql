-- AI Continuous Learning System
-- Stores learnings, corrections, preferences, and agent feedback
-- for Kiros AI to improve over time across conversations

-- ============================================================
-- 1. AI Learnings — the AI's memory across conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_learnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- What was learned
  learning_type text NOT NULL CHECK (learning_type IN (
    'correction',        -- user corrected the AI's response
    'preference',        -- user preference for format, tone, detail level
    'domain_insight',    -- factual insight about the centre, regulations, or operations
    'process_knowledge', -- how things actually work at this centre vs. generic knowledge
    'relationship',      -- connections between people, roles, responsibilities
    'context_update'     -- updates to centre context (e.g., "we changed rooms", "new educator started")
  )),
  category text,  -- e.g., 'QA1', 'staffing', 'programming', 'compliance', 'operations', 'formatting'

  -- The learning itself
  title text NOT NULL,
  content text NOT NULL,          -- what was learned
  original_context text,          -- what was the AI's original response/assumption (for corrections)
  source_conversation_id uuid,    -- which conversation this came from

  -- Who and scope
  learned_from_user_id uuid REFERENCES profiles(id),
  learned_from_role text,         -- role at time of learning
  applies_to_roles text[] DEFAULT '{}',  -- empty = applies to all roles

  -- Relevance and lifecycle
  confidence numeric(3,2) DEFAULT 0.8,  -- 0.0-1.0, decays or strengthens with reinforcement
  times_reinforced integer DEFAULT 0,    -- how many times this was confirmed
  times_contradicted integer DEFAULT 0,  -- how many times this was contradicted
  last_used_at timestamptz,
  expires_at timestamptz,                -- optional expiry for time-sensitive learnings
  is_active boolean DEFAULT true,
  superseded_by uuid REFERENCES ai_learnings(id),  -- if this learning was replaced

  -- Metadata
  tags text[] DEFAULT '{}',
  qa_areas integer[] DEFAULT '{}',  -- related QA areas 1-7
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_learnings_type ON ai_learnings(learning_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_category ON ai_learnings(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_qa ON ai_learnings USING gin(qa_areas) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_tags ON ai_learnings USING gin(tags) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_role ON ai_learnings(learned_from_role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_confidence ON ai_learnings(confidence DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_learnings_updated ON ai_learnings(updated_at DESC) WHERE is_active = true;

ALTER TABLE ai_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_ai_learnings" ON ai_learnings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_ai_learnings" ON ai_learnings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_ai_learnings" ON ai_learnings
  FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- 2. AI Agent Feedback — tracks how well agents perform
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_agent_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Which agent and conversation
  agent_definition_id uuid REFERENCES ai_agent_definitions(id),
  agent_name text NOT NULL,
  conversation_id uuid,
  session_id uuid REFERENCES ai_agent_sessions(id),

  -- What happened
  query_summary text NOT NULL,       -- what the user asked (summarised)
  agent_response_summary text,       -- what the agent answered (summarised)

  -- Feedback
  feedback_type text NOT NULL CHECK (feedback_type IN (
    'accepted',       -- user accepted the agent's response as-is
    'corrected',      -- user corrected the agent's response
    'rejected',       -- user said the agent was wrong
    'supplemented',   -- master agent had to add significant context
    'escalated'       -- agent couldn't handle the query
  )),
  correction_detail text,    -- what was wrong and what was right (for corrections)
  user_id uuid REFERENCES profiles(id),

  -- Performance metrics
  response_quality integer CHECK (response_quality BETWEEN 1 AND 5),  -- inferred or explicit
  tokens_used integer,
  duration_ms integer,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent ON ai_agent_feedback(agent_definition_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_type ON ai_agent_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_quality ON ai_agent_feedback(response_quality);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_created ON ai_agent_feedback(created_at DESC);

ALTER TABLE ai_agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_agent_feedback" ON ai_agent_feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_agent_feedback" ON ai_agent_feedback
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 3. Helper view: agent performance summary
-- ============================================================
CREATE OR REPLACE VIEW ai_agent_performance AS
SELECT
  agent_name,
  agent_definition_id,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE feedback_type = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE feedback_type = 'corrected') as corrected_count,
  COUNT(*) FILTER (WHERE feedback_type = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE feedback_type = 'supplemented') as supplemented_count,
  COUNT(*) FILTER (WHERE feedback_type = 'escalated') as escalated_count,
  ROUND(AVG(response_quality)::numeric, 2) as avg_quality,
  ROUND(
    (COUNT(*) FILTER (WHERE feedback_type = 'accepted'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) as acceptance_rate,
  AVG(tokens_used) as avg_tokens,
  AVG(duration_ms) as avg_duration_ms,
  MAX(created_at) as last_interaction
FROM ai_agent_feedback
GROUP BY agent_name, agent_definition_id;
