-- ============================================
-- MARKETING SECTION
-- Social media management, content workflow,
-- ad campaigns, reviews, analytics, and
-- dedicated Marketing AI chat
-- ============================================

-- 1. Connected social/ad accounts with OAuth tokens
CREATE TABLE IF NOT EXISTS marketing_social_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN (
    'facebook', 'instagram', 'google_business',
    'google_ads', 'google_analytics', 'youtube'
  )),
  platform_account_id text NOT NULL,
  account_name text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'connected' CHECK (status IN (
    'connected', 'disconnected', 'error', 'expired'
  )),
  connected_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(platform, platform_account_id)
);

-- 2. Ad campaigns (Meta Ads + Google Ads)
CREATE TABLE IF NOT EXISTS marketing_ad_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('meta_ads', 'google_ads')),
  platform_campaign_id text,
  name text NOT NULL,
  objective text,
  status text DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'active', 'paused', 'completed', 'archived'
  )),
  budget_type text CHECK (budget_type IN ('daily', 'lifetime')),
  budget_amount numeric(10,2),
  budget_currency text DEFAULT 'AUD',
  start_date date,
  end_date date,
  target_audience jsonb DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Unified content table (posts, reels, stories, ads, review responses, updates)
CREATE TABLE IF NOT EXISTS marketing_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN (
    'post', 'reel', 'story', 'ad', 'review_response',
    'google_update', 'youtube_video'
  )),
  title text,
  body text NOT NULL,
  media_urls text[] DEFAULT '{}',
  media_storage_paths text[] DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_ids jsonb DEFAULT '{}',
  -- Workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'scheduled',
    'publishing', 'published', 'failed', 'archived'
  )),
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_note text,
  -- AI metadata
  ai_generated boolean DEFAULT false,
  ai_conversation_id uuid,
  -- Ad link
  ad_campaign_id uuid REFERENCES marketing_ad_campaigns(id) ON DELETE SET NULL,
  -- Content metadata
  hashtags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Google/Facebook reviews with response tracking
CREATE TABLE IF NOT EXISTS marketing_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('google_business', 'facebook')),
  platform_review_id text NOT NULL UNIQUE,
  reviewer_name text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  review_date timestamptz,
  -- Response
  response_text text,
  response_status text DEFAULT 'unread' CHECK (response_status IN (
    'unread', 'read', 'draft_response', 'pending_approval',
    'responded', 'ignored'
  )),
  response_drafted_by uuid REFERENCES profiles(id),
  response_approved_by uuid REFERENCES profiles(id),
  response_published_at timestamptz,
  ai_draft_response text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Cached analytics data (6-hour TTL default)
CREATE TABLE IF NOT EXISTS marketing_analytics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  metric_type text NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '6 hours'),
  UNIQUE(platform, metric_type, date_range_start, date_range_end)
);

-- 6. Marketing AI conversation threads (separate from main chat)
CREATE TABLE IF NOT EXISTS marketing_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Marketing AI messages
CREATE TABLE IF NOT EXISTS marketing_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES marketing_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool_call', 'tool_result')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 8. Content calendar entries
CREATE TABLE IF NOT EXISTS marketing_content_calendar (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time time,
  calendar_type text NOT NULL CHECK (calendar_type IN (
    'post', 'campaign_start', 'campaign_end',
    'event', 'review_reminder', 'report_due'
  )),
  content_id uuid REFERENCES marketing_content(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES marketing_ad_campaigns(id) ON DELETE SET NULL,
  platforms text[] DEFAULT '{}',
  status text DEFAULT 'planned' CHECK (status IN (
    'planned', 'confirmed', 'published', 'cancelled'
  )),
  color text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE marketing_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content_calendar ENABLE ROW LEVEL SECURITY;

-- Marketing tables: admin + manager + ns only
CREATE POLICY "marketing_social_accounts_role_access" ON marketing_social_accounts
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_content_role_access" ON marketing_content
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_ad_campaigns_role_access" ON marketing_ad_campaigns
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_reviews_role_access" ON marketing_reviews
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_analytics_cache_role_access" ON marketing_analytics_cache
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

-- Conversations: own conversations only + role check
CREATE POLICY "marketing_conversations_own" ON marketing_conversations
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns')
  );

-- Messages: access via conversation ownership
CREATE POLICY "marketing_messages_via_conversation" ON marketing_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketing_conversations
      WHERE id = marketing_messages.conversation_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketing_conversations
      WHERE id = marketing_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "marketing_calendar_role_access" ON marketing_content_calendar
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_marketing_social_accounts_platform ON marketing_social_accounts(platform);
CREATE INDEX idx_marketing_social_accounts_status ON marketing_social_accounts(status);

CREATE INDEX idx_marketing_content_status ON marketing_content(status);
CREATE INDEX idx_marketing_content_scheduled ON marketing_content(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_marketing_content_platforms ON marketing_content USING gin(platforms);
CREATE INDEX idx_marketing_content_created_by ON marketing_content(created_by);

CREATE INDEX idx_marketing_ad_campaigns_status ON marketing_ad_campaigns(status);
CREATE INDEX idx_marketing_ad_campaigns_platform ON marketing_ad_campaigns(platform);

CREATE INDEX idx_marketing_reviews_status ON marketing_reviews(response_status);
CREATE INDEX idx_marketing_reviews_platform ON marketing_reviews(platform);

CREATE INDEX idx_marketing_analytics_cache_lookup ON marketing_analytics_cache(platform, metric_type, expires_at);

CREATE INDEX idx_marketing_conversations_user ON marketing_conversations(user_id);
CREATE INDEX idx_marketing_messages_conversation ON marketing_messages(conversation_id, created_at);

CREATE INDEX idx_marketing_calendar_date ON marketing_content_calendar(date);
CREATE INDEX idx_marketing_calendar_status ON marketing_content_calendar(status);

-- ============================================
-- REALTIME (for marketing AI chat)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE marketing_messages;
