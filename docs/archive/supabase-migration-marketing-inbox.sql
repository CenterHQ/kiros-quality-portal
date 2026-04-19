-- ============================================
-- MARKETING INBOX & SOCIAL ENGAGEMENT
-- Messages, comments, and post feed tracking
-- ============================================

-- 1. Social messages (Facebook Messenger + Instagram DMs)
CREATE TABLE IF NOT EXISTS marketing_messages_inbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  thread_id text NOT NULL,
  sender_id text NOT NULL,
  sender_name text,
  sender_avatar_url text,
  message_text text,
  media_url text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  platform_message_id text UNIQUE,
  is_read boolean DEFAULT false,
  replied_at timestamptz,
  replied_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}',
  message_time timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. Social comments on published posts
CREATE TABLE IF NOT EXISTS marketing_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'youtube')),
  post_id text NOT NULL,
  content_id uuid REFERENCES marketing_content(id) ON DELETE SET NULL,
  comment_id text NOT NULL UNIQUE,
  parent_comment_id text,
  author_name text,
  author_id text,
  author_avatar_url text,
  comment_text text NOT NULL,
  like_count integer DEFAULT 0,
  is_hidden boolean DEFAULT false,
  is_read boolean DEFAULT false,
  reply_text text,
  replied_at timestamptz,
  replied_by uuid REFERENCES profiles(id),
  comment_time timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. Post feed — enriched view of published posts with live engagement
CREATE TABLE IF NOT EXISTS marketing_post_engagement (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES marketing_content(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_post_id text NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  saves integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, platform)
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE marketing_messages_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_post_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_inbox_role_access" ON marketing_messages_inbox
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_comments_role_access" ON marketing_comments
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

CREATE POLICY "marketing_engagement_role_access" ON marketing_post_engagement
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'))
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'ns'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_marketing_inbox_thread ON marketing_messages_inbox(thread_id, message_time);
CREATE INDEX idx_marketing_inbox_read ON marketing_messages_inbox(is_read) WHERE is_read = false;
CREATE INDEX idx_marketing_inbox_platform ON marketing_messages_inbox(platform);

CREATE INDEX idx_marketing_comments_post ON marketing_comments(post_id);
CREATE INDEX idx_marketing_comments_content ON marketing_comments(content_id);
CREATE INDEX idx_marketing_comments_read ON marketing_comments(is_read) WHERE is_read = false;

CREATE INDEX idx_marketing_engagement_content ON marketing_post_engagement(content_id);
