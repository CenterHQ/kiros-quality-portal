-- ============================================================================
-- Migration: Recruitment & DISC Profiling Tables
-- Created: 2026-04-13
-- Description: Creates recruitment_positions, recruitment_candidates,
--              recruitment_question_templates, staff_disc_profiles tables.
--              Seeds question templates, induction checklist, and config keys.
-- Idempotent: All CREATE IF NOT EXISTS + ON CONFLICT DO NOTHING
-- ============================================================================


-- ============================================================================
-- TABLE 1: recruitment_positions
-- ============================================================================

CREATE TABLE IF NOT EXISTS recruitment_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  role text NOT NULL CHECK (role IN ('educator','room_leader','ect','el','ns','cook','admin','casual')),
  room text,
  description text,
  requirements text,
  qualifications_required text[] DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft','open','closed','filled')),
  question_bank jsonb DEFAULT '[]',
  personality_questions jsonb DEFAULT '[]',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- TABLE 2: recruitment_candidates
-- ============================================================================

CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid REFERENCES recruitment_positions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  qualifications text[] DEFAULT '{}',
  experience_years numeric,
  cover_letter text,
  resume_url text,
  access_token text UNIQUE,
  status text DEFAULT 'invited' CHECK (status IN ('invited','in_progress','submitted','reviewed','shortlisted','interview','offered','hired','rejected','withdrawn')),
  knowledge_responses jsonb DEFAULT '[]',
  knowledge_score numeric,
  knowledge_completed_at timestamptz,
  personality_responses jsonb DEFAULT '[]',
  disc_profile jsonb,
  personality_analysis jsonb,
  team_fit_analysis jsonb,
  overall_rank integer,
  ai_recommendation text,
  reviewer_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  referred_by uuid REFERENCES profiles(id),
  progress jsonb DEFAULT '{"knowledge": false, "personality": false, "disc": false}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- TABLE 3: recruitment_question_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS recruitment_question_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('knowledge','personality','disc')),
  role_type text DEFAULT 'educator',
  question text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('open','multiple_choice','scale','scenario')),
  options jsonb,
  correct_answer text,
  scoring_rubric text,
  time_limit_seconds integer DEFAULT 120,
  difficulty text DEFAULT 'standard' CHECK (difficulty IN ('basic','standard','advanced')),
  source text,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);


-- ============================================================================
-- TABLE 4: staff_disc_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_disc_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) UNIQUE,
  disc_d numeric DEFAULT 0,
  disc_i numeric DEFAULT 0,
  disc_s numeric DEFAULT 0,
  disc_c numeric DEFAULT 0,
  primary_type text,
  secondary_type text,
  communication_style text,
  conflict_approach text,
  leadership_tendency text,
  motivational_drivers text[] DEFAULT '{}',
  stress_responses text,
  full_analysis jsonb,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_access_token ON recruitment_candidates(access_token);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_position_id ON recruitment_candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_candidates_status ON recruitment_candidates(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_question_templates_category ON recruitment_question_templates(category);
CREATE INDEX IF NOT EXISTS idx_recruitment_question_templates_role_type ON recruitment_question_templates(role_type);
CREATE INDEX IF NOT EXISTS idx_staff_disc_profiles_user_id ON staff_disc_profiles(user_id);


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE recruitment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_disc_profiles ENABLE ROW LEVEL SECURITY;

-- ---- recruitment_positions ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_positions' AND policyname = 'read_recruitment_positions') THEN
    CREATE POLICY "read_recruitment_positions" ON recruitment_positions FOR SELECT TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','ns'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_positions' AND policyname = 'insert_recruitment_positions') THEN
    CREATE POLICY "insert_recruitment_positions" ON recruitment_positions FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_positions' AND policyname = 'update_recruitment_positions') THEN
    CREATE POLICY "update_recruitment_positions" ON recruitment_positions FOR UPDATE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_positions' AND policyname = 'delete_recruitment_positions') THEN
    CREATE POLICY "delete_recruitment_positions" ON recruitment_positions FOR DELETE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
END $$;

-- ---- recruitment_candidates ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_candidates' AND policyname = 'read_recruitment_candidates') THEN
    CREATE POLICY "read_recruitment_candidates" ON recruitment_candidates FOR SELECT TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','ns'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_candidates' AND policyname = 'insert_recruitment_candidates') THEN
    CREATE POLICY "insert_recruitment_candidates" ON recruitment_candidates FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_candidates' AND policyname = 'update_recruitment_candidates') THEN
    CREATE POLICY "update_recruitment_candidates" ON recruitment_candidates FOR UPDATE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_candidates' AND policyname = 'delete_recruitment_candidates') THEN
    CREATE POLICY "delete_recruitment_candidates" ON recruitment_candidates FOR DELETE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  -- Service role bypasses RLS automatically, so no explicit policy needed for service role writes.
  -- Anonymous access for candidate portal is handled via service role API routes using access_token.
END $$;

-- ---- recruitment_question_templates ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_question_templates' AND policyname = 'read_recruitment_question_templates') THEN
    CREATE POLICY "read_recruitment_question_templates" ON recruitment_question_templates FOR SELECT TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_question_templates' AND policyname = 'insert_recruitment_question_templates') THEN
    CREATE POLICY "insert_recruitment_question_templates" ON recruitment_question_templates FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_question_templates' AND policyname = 'update_recruitment_question_templates') THEN
    CREATE POLICY "update_recruitment_question_templates" ON recruitment_question_templates FOR UPDATE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruitment_question_templates' AND policyname = 'delete_recruitment_question_templates') THEN
    CREATE POLICY "delete_recruitment_question_templates" ON recruitment_question_templates FOR DELETE TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
  END IF;
END $$;

-- ---- staff_disc_profiles ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_disc_profiles' AND policyname = 'read_staff_disc_profiles') THEN
    CREATE POLICY "read_staff_disc_profiles" ON staff_disc_profiles FOR SELECT TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','manager','ns'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_disc_profiles' AND policyname = 'own_read_staff_disc_profiles') THEN
    CREATE POLICY "own_read_staff_disc_profiles" ON staff_disc_profiles FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_disc_profiles' AND policyname = 'own_insert_staff_disc_profiles') THEN
    CREATE POLICY "own_insert_staff_disc_profiles" ON staff_disc_profiles FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staff_disc_profiles' AND policyname = 'own_update_staff_disc_profiles') THEN
    CREATE POLICY "own_update_staff_disc_profiles" ON staff_disc_profiles FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;


-- ============================================================================
-- SEED: Staff Induction Checklist Template
-- ============================================================================

INSERT INTO checklist_templates (name, description, frequency, items, related_qa, is_system_template, status)
VALUES (
  'Staff Induction Checklist',
  'Required induction items for all new staff members',
  'event_triggered',
  '[
    {"id":"ind_1","title":"Induction Overview","type":"heading","sort_order":1},
    {"id":"ind_2","title":"Read and acknowledge Child Protection Policy","type":"yes_no","required":true,"sort_order":2},
    {"id":"ind_3","title":"Complete Health & Safety orientation","type":"yes_no","required":true,"sort_order":3},
    {"id":"ind_4","title":"Tour of centre facilities and all rooms","type":"yes_no","required":true,"sort_order":4},
    {"id":"ind_5","title":"Meet with Nominated Supervisor","type":"yes_no","required":true,"sort_order":5},
    {"id":"ind_6","title":"Review emergency procedures and evacuation routes","type":"yes_no","required":true,"sort_order":6},
    {"id":"ind_7","title":"Read Staff Code of Conduct","type":"yes_no","required":true,"sort_order":7},
    {"id":"ind_8","title":"Complete IT systems and platform onboarding","type":"yes_no","required":true,"sort_order":8},
    {"id":"ind_9","title":"Review centre philosophy and QIP goals","type":"yes_no","required":true,"sort_order":9},
    {"id":"ind_10","title":"Acknowledge receipt of Employee Handbook","type":"yes_no","required":true,"sort_order":10}
  ]'::jsonb,
  '{4}',
  true,
  'active'
) ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED: Question Templates - Knowledge (30 questions)
-- ============================================================================

INSERT INTO recruitment_question_templates (category, role_type, question, question_type, scoring_rubric, time_limit_seconds, difficulty, source, tags, is_active, sort_order) VALUES

-- NQS Quality Areas (5)
('knowledge', 'educator', 'Describe the seven Quality Areas of the National Quality Standard and explain how they work together to support high-quality education and care.', 'open',
 'Strong: Names all 7 QAs with clear explanations of interconnections. Adequate: Names most QAs with basic links. Weak: Vague or incomplete understanding.', 120, 'standard', 'NQS', '{nqs,quality_areas}', true, 1),

('knowledge', 'educator', 'What is the difference between Meeting, Exceeding, and Working Towards ratings under the NQS? Give an example of what Exceeding practice looks like in one Quality Area.', 'open',
 'Strong: Accurately defines all three rating levels with a specific, practical example. Adequate: Defines levels but example is generic. Weak: Confuses or cannot distinguish levels.', 120, 'standard', 'NQS', '{nqs,ratings}', true, 2),

('knowledge', 'educator', 'How does Quality Area 1 (Educational Program and Practice) connect to Quality Area 5 (Relationships with Children)?', 'open',
 'Strong: Explains how responsive relationships underpin effective programming, references curriculum decision-making driven by knowing each child. Adequate: Mentions connection but lacks depth. Weak: Cannot articulate the link.', 120, 'standard', 'NQS', '{nqs,qa1,qa5}', true, 3),

('knowledge', 'educator', 'Quality Area 7 focuses on Governance and Leadership. Explain how effective leadership at the room level contributes to continuous improvement across the service.', 'open',
 'Strong: Discusses distributed leadership, QIP contributions, mentoring, reflective practice at room level. Adequate: Mentions leadership role but limited to compliance tasks. Weak: Sees leadership as management-only responsibility.', 120, 'standard', 'NQS', '{nqs,qa7,leadership}', true, 4),

('knowledge', 'educator', 'What does Quality Area 6 (Collaborative Partnerships with Families and Communities) look like in daily practice? Provide three specific examples.', 'open',
 'Strong: Three distinct, practical examples such as family input into programming, community excursion partnerships, cultural celebration inclusion. Adequate: Two examples or generic responses. Weak: Cannot provide practical examples.', 120, 'standard', 'NQS', '{nqs,qa6,families}', true, 5),

-- EYLF V2.0 (5)
('knowledge', 'educator', 'Name the five Learning Outcomes of the EYLF V2.0 and explain how you would plan a learning experience that addresses at least two of them simultaneously.', 'open',
 'Strong: Lists all 5 outcomes accurately and provides a specific, integrated activity example. Adequate: Lists outcomes but example only addresses one or is generic. Weak: Cannot accurately list outcomes.', 120, 'standard', 'EYLF V2.0', '{eylf,learning_outcomes,programming}', true, 6),

('knowledge', 'educator', 'The EYLF V2.0 identifies eight Principles. Choose two and explain how they guide your daily interactions with children.', 'open',
 'Strong: Correctly identifies two principles (e.g., secure respectful relationships, partnerships) with specific daily practice examples. Adequate: Identifies principles but examples lack specificity. Weak: Cannot name principles or confuses with outcomes.', 120, 'standard', 'EYLF V2.0', '{eylf,principles}', true, 7),

('knowledge', 'educator', 'Explain the five Practices in the EYLF V2.0 and describe how intentional teaching differs from child-directed play.', 'open',
 'Strong: Names all five practices (holistic, responsive, intentional, continuity, assessment) and clearly distinguishes intentional teaching with examples. Adequate: Names most practices, basic distinction. Weak: Confuses practices with outcomes.', 120, 'standard', 'EYLF V2.0', '{eylf,practices,intentional_teaching}', true, 8),

('knowledge', 'educator', 'How does the concept of Belonging, Being, and Becoming underpin the EYLF V2.0? Give a practical example of how you promote each in your room.', 'open',
 'Strong: Explains the philosophical basis and gives distinct, age-appropriate examples for each concept. Adequate: Understands concepts but examples overlap or are vague. Weak: Cannot distinguish the three concepts.', 120, 'standard', 'EYLF V2.0', '{eylf,belonging_being_becoming}', true, 9),

('knowledge', 'educator', 'Describe how you would use the EYLF V2.0 planning cycle (observe, analyse, plan, implement, evaluate) to extend a child''s emerging interest in sustainability.', 'open',
 'Strong: Walks through each cycle stage with specific sustainability-related actions. Adequate: Understands the cycle but application is generic. Weak: Cannot articulate the cycle stages.', 120, 'standard', 'EYLF V2.0', '{eylf,planning_cycle,sustainability}', true, 10),

-- Child Development (5)
('knowledge', 'educator', 'Describe the key developmental milestones for a child aged 3-4 years across physical, cognitive, social, and emotional domains.', 'open',
 'Strong: Provides specific milestones across all four domains with age-appropriate detail. Adequate: Covers most domains but milestones are vague. Weak: Limited knowledge of developmental stages.', 120, 'standard', 'Child Development', '{child_development,milestones}', true, 11),

('knowledge', 'educator', 'A child in your room is showing signs of developmental delay in language. What steps would you take to support this child and involve relevant stakeholders?', 'scenario',
 'Strong: Describes observation/documentation, family conversation, referral pathways, inclusive strategies, and team communication. Adequate: Mentions some steps but misses referral or family engagement. Weak: Only suggests "wait and see" or lacks process knowledge.', 120, 'standard', 'Child Development', '{child_development,inclusion,language}', true, 12),

('knowledge', 'educator', 'Explain the role of play-based learning in early childhood development. How do you create environments that promote different types of play?', 'open',
 'Strong: Discusses multiple play types (constructive, dramatic, sensory, cooperative) with specific environment design strategies. Adequate: Mentions play-based learning generally with limited environment examples. Weak: Cannot articulate the connection between play and development.', 120, 'standard', 'Child Development', '{child_development,play_based_learning}', true, 13),

('knowledge', 'educator', 'How would you support a child who is transitioning from home care to a centre-based environment for the first time? Describe your approach over the first two weeks.', 'scenario',
 'Strong: Outlines orientation visits, comfort items, gradual separation, family communication plan, peer buddy system, and observation. Adequate: Mentions some strategies but lacks a phased approach. Weak: No structured transition plan.', 120, 'standard', 'Child Development', '{child_development,transitions}', true, 14),

('knowledge', 'educator', 'What is the significance of attachment theory in early childhood education? How does it influence your interactions with children throughout the day?', 'open',
 'Strong: Explains secure attachment, references Bowlby/Ainsworth concepts, gives specific daily interaction examples (greetings, separations, routines). Adequate: Basic understanding of attachment with limited application. Weak: Cannot explain attachment theory relevance.', 120, 'standard', 'Child Development', '{child_development,attachment}', true, 15),

-- Health & Safety / Regulations (5)
('knowledge', 'educator', 'A child in your room has a known anaphylaxis risk. Describe your responsibilities and the steps you would take in an emergency anaphylaxis situation.', 'scenario',
 'Strong: Describes risk minimisation plan, EpiPen administration steps, calling 000, notification procedures, incident documentation, and post-event debrief. Adequate: Knows to use EpiPen and call emergency but misses documentation or prevention. Weak: Unsure of anaphylaxis response procedure.', 120, 'standard', 'Health & Safety', '{health_safety,anaphylaxis,regulations}', true, 16),

('knowledge', 'educator', 'Explain the educator-to-child ratio requirements under the Education and Care Services National Regulations for children aged 0-2, 2-3, and 3-5 years in NSW.', 'open',
 'Strong: Correctly states 1:4 (0-2), 1:5 (2-3), 1:10 (3-5 with teacher) or equivalent state requirements. Adequate: Knows approximate ratios but not all age groups. Weak: Cannot state ratio requirements.', 120, 'standard', 'National Regulations', '{regulations,ratios,health_safety}', true, 17),

('knowledge', 'educator', 'What are your obligations as a mandatory reporter under the Children and Young Persons (Care and Protection) Act 1998 in NSW? When and how would you make a report?', 'open',
 'Strong: Explains mandatory reporting duty, describes indicators of risk of significant harm, outlines reporting to Child Protection Helpline (132 111), documentation requirements. Adequate: Understands obligation but unclear on process. Weak: Unaware of mandatory reporting responsibilities.', 120, 'standard', 'Child Protection', '{child_protection,mandatory_reporting,regulations}', true, 18),

('knowledge', 'educator', 'Describe the safe sleep practices you would implement for infants in an early childhood setting, referencing Red Nose guidelines.', 'open',
 'Strong: References sleeping on back, firm flat mattress, face uncovered, safe cot environment, regular checks, individual sleep plans, parent communication. Adequate: Knows basic safe sleep but misses monitoring or documentation. Weak: Limited knowledge of safe sleep practices.', 120, 'standard', 'Health & Safety', '{health_safety,safe_sleep,infants}', true, 19),

('knowledge', 'educator', 'What procedures should be in place for administering medication to children in care? What documentation is required?', 'open',
 'Strong: Describes authorisation forms, medication register, storage requirements, two-person administration check, allergy cross-reference, notification to families. Adequate: Knows basic procedure but misses documentation or storage. Weak: Unaware of medication administration requirements.', 120, 'standard', 'National Regulations', '{health_safety,medication,regulations}', true, 20),

-- Programming & Documentation (5)
('knowledge', 'educator', 'Describe the components of a high-quality learning story. How does it differ from a basic observation?', 'open',
 'Strong: Explains narrative format, EYLF outcome links, analysis of learning, future planning, family voice inclusion, and how it differs from anecdotal notes. Adequate: Understands learning stories but comparison is weak. Weak: Cannot distinguish between documentation types.', 120, 'standard', 'Documentation', '{programming,documentation,learning_stories}', true, 21),

('knowledge', 'educator', 'How do you ensure your programming is responsive to individual children''s interests, strengths, and developmental needs? Provide a specific example.', 'open',
 'Strong: Describes observation-based cycle, individual planning, portfolio evidence, family input, with a specific child-centred example. Adequate: Understands responsive programming conceptually but example is generic. Weak: Programming approach is activity-based rather than child-centred.', 120, 'standard', 'Programming', '{programming,responsive,individual_planning}', true, 22),

('knowledge', 'educator', 'What is critical reflection and how does it contribute to continuous improvement in an early childhood setting?', 'open',
 'Strong: Defines critical reflection beyond surface-level thinking, gives examples of questioning assumptions, references NQS Element 1.3.2, explains link to QIP. Adequate: Understands reflection as important but cannot distinguish critical reflection from general reflection. Weak: Equates reflection with compliance documentation.', 120, 'standard', 'NQS', '{programming,critical_reflection,quality_improvement}', true, 23),

('knowledge', 'educator', 'How would you plan and document a group project that emerges from children''s interests and extends over several weeks?', 'open',
 'Strong: Describes emergent curriculum approach, mind-mapping with children, iterative planning, multi-modal documentation, family and child voice, summative reflection. Adequate: Understands project approach but documentation plan is limited. Weak: Cannot describe extended project methodology.', 120, 'standard', 'Programming', '{programming,emergent_curriculum,projects}', true, 24),

('knowledge', 'educator', 'Explain how you would use formative assessment to track children''s learning progress and inform your programming decisions.', 'open',
 'Strong: Describes ongoing observation methods, developmental checklists, portfolio analysis, conversations with children and families, and how findings directly shape planning. Adequate: Mentions assessment types but link to programming is vague. Weak: Relies solely on formal assessment or cannot describe formative approaches.', 120, 'standard', 'Assessment', '{programming,assessment,formative}', true, 25),

-- Relationships & Partnerships (5)
('knowledge', 'educator', 'A parent expresses concern that their child is not being challenged enough in your room. How would you respond and what steps would you take?', 'scenario',
 'Strong: Describes active listening, validating concern, sharing documentation/portfolio, collaborating on extension strategies, follow-up plan. Adequate: Would address concern but response is defensive or lacks follow-through. Weak: Dismisses or minimises parent concern.', 120, 'standard', 'Family Partnerships', '{relationships,family_partnerships,communication}', true, 26),

('knowledge', 'educator', 'How do you build and maintain respectful, inclusive relationships with families from culturally and linguistically diverse backgrounds?', 'open',
 'Strong: Describes cultural competency strategies, multilingual resources, cultural celebrations, seeking family input on practices, avoiding assumptions. Adequate: Mentions inclusivity but strategies are generic. Weak: No specific strategies for diverse families.', 120, 'standard', 'Family Partnerships', '{relationships,diversity,inclusion}', true, 27),

('knowledge', 'educator', 'Describe a time when you had to work through a disagreement with a colleague about an approach to children''s learning or behaviour guidance. How did you handle it?', 'scenario',
 'Strong: Demonstrates respectful communication, evidence-based discussion, willingness to compromise, seeking supervisor support if needed, focus on child outcomes. Adequate: Resolved the issue but process lacked structure. Weak: Avoided the conflict or escalated inappropriately.', 120, 'standard', 'Teamwork', '{relationships,teamwork,conflict_resolution}', true, 28),

('knowledge', 'educator', 'What role do educators play in supporting children''s positive behaviour and emotional regulation? Describe three strategies you use regularly.', 'open',
 'Strong: Names evidence-based strategies (co-regulation, emotion coaching, visual supports, social stories, calm-down spaces) with implementation detail. Adequate: Mentions strategies but lacks depth or evidence base. Weak: Relies on punitive or reward-only approaches.', 120, 'standard', 'Child Development', '{relationships,behaviour_guidance,emotional_regulation}', true, 29),

('knowledge', 'educator', 'How would you support a new educator joining your room to feel welcomed, included, and set up for success in their first month?', 'scenario',
 'Strong: Describes mentoring approach, orientation to routines and children, sharing documentation systems, regular check-ins, creating psychological safety. Adequate: Would be welcoming but lacks structured support. Weak: Expects new educators to figure things out independently.', 120, 'standard', 'Teamwork', '{relationships,mentoring,onboarding}', true, 30)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED: Question Templates - DISC (20 questions)
-- ============================================================================

INSERT INTO recruitment_question_templates (category, role_type, question, question_type, options, scoring_rubric, time_limit_seconds, difficulty, source, tags, is_active, sort_order) VALUES

('disc', 'educator', 'When a problem arises at work, I prefer to take charge and find a solution quickly rather than wait for others to act.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Dominance (D) trait', 120, 'standard', 'DISC Assessment', '{disc,dominance}', true, 101),

('disc', 'educator', 'I enjoy being the centre of attention and energising the people around me during group activities.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Influence (I) trait', 120, 'standard', 'DISC Assessment', '{disc,influence}', true, 102),

('disc', 'educator', 'I value consistency and predictability in my daily work routines and prefer minimal sudden changes.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Steadiness (S) trait', 120, 'standard', 'DISC Assessment', '{disc,steadiness}', true, 103),

('disc', 'educator', 'I pay close attention to details and prefer to follow established procedures and guidelines carefully.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Conscientiousness (C) trait', 120, 'standard', 'DISC Assessment', '{disc,conscientiousness}', true, 104),

('disc', 'educator', 'I am comfortable making tough decisions even when they may be unpopular with the team.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Dominance (D) trait', 120, 'standard', 'DISC Assessment', '{disc,dominance}', true, 105),

('disc', 'educator', 'I find it easy to start conversations with new families and build rapport quickly.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Influence (I) trait', 120, 'standard', 'DISC Assessment', '{disc,influence}', true, 106),

('disc', 'educator', 'I am a patient listener and prefer to understand everyone''s perspective before responding.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Steadiness (S) trait', 120, 'standard', 'DISC Assessment', '{disc,steadiness}', true, 107),

('disc', 'educator', 'I prefer to have clear written instructions and documented processes for tasks I need to complete.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Conscientiousness (C) trait', 120, 'standard', 'DISC Assessment', '{disc,conscientiousness}', true, 108),

('disc', 'educator', 'I am driven to achieve goals and results, and I set high expectations for myself and others.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Dominance (D) trait', 120, 'standard', 'DISC Assessment', '{disc,dominance}', true, 109),

('disc', 'educator', 'I use humour and enthusiasm to motivate children and colleagues during challenging moments.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Influence (I) trait', 120, 'standard', 'DISC Assessment', '{disc,influence}', true, 110),

('disc', 'educator', 'I prefer to maintain harmony in the team and avoid unnecessary conflict or confrontation.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Steadiness (S) trait', 120, 'standard', 'DISC Assessment', '{disc,steadiness}', true, 111),

('disc', 'educator', 'I like to analyse information thoroughly before making a decision or recommendation.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Conscientiousness (C) trait', 120, 'standard', 'DISC Assessment', '{disc,conscientiousness}', true, 112),

('disc', 'educator', 'When faced with an obstacle, I prefer to find a new path forward rather than dwell on what went wrong.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Dominance (D) trait', 120, 'standard', 'DISC Assessment', '{disc,dominance}', true, 113),

('disc', 'educator', 'I am naturally optimistic and tend to see the best in people and situations.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Influence (I) trait', 120, 'standard', 'DISC Assessment', '{disc,influence}', true, 114),

('disc', 'educator', 'I feel most comfortable when I have a stable, supportive team around me and clear role expectations.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Steadiness (S) trait', 120, 'standard', 'DISC Assessment', '{disc,steadiness}', true, 115),

('disc', 'educator', 'I take pride in producing high-quality, accurate work and can be critical of work that does not meet standards.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Conscientiousness (C) trait', 120, 'standard', 'DISC Assessment', '{disc,conscientiousness}', true, 116),

('disc', 'educator', 'I am comfortable delegating tasks and directing team members to achieve a shared objective.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Dominance (D) trait', 120, 'standard', 'DISC Assessment', '{disc,dominance}', true, 117),

('disc', 'educator', 'I enjoy collaborating with others and feel energised by brainstorming sessions and group planning.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Influence (I) trait', 120, 'standard', 'DISC Assessment', '{disc,influence}', true, 118),

('disc', 'educator', 'I value loyalty and long-term relationships and invest time in building deep connections with my colleagues.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Steadiness (S) trait', 120, 'standard', 'DISC Assessment', '{disc,steadiness}', true, 119),

('disc', 'educator', 'I prefer to research and plan carefully before starting a new initiative or project.', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Strongly Disagree", "2": "Disagree", "3": "Neutral", "4": "Agree", "5": "Strongly Agree"}}',
 'High score indicates Conscientiousness (C) trait', 120, 'standard', 'DISC Assessment', '{disc,conscientiousness}', true, 120)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED: Question Templates - Personality / 6 Human Needs (10 questions)
-- ============================================================================

INSERT INTO recruitment_question_templates (category, role_type, question, question_type, options, scoring_rubric, time_limit_seconds, difficulty, source, tags, is_active, sort_order) VALUES

-- Certainty (2)
('personality', 'educator', 'How important is it to you to have a predictable daily routine and clear expectations in your workplace?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Not Important", "2": "Slightly Important", "3": "Moderately Important", "4": "Very Important", "5": "Essential"}}',
 'Measures need for certainty/security in workplace context', 120, 'standard', 'Human Needs Framework', '{personality,certainty}', true, 201),

('personality', 'educator', 'When unexpected changes occur during the day (e.g., staffing changes, schedule disruptions), how comfortable are you adapting without prior notice?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Very Uncomfortable", "2": "Uncomfortable", "3": "Neutral", "4": "Comfortable", "5": "Very Comfortable"}}',
 'Inverse measure of certainty need - high score indicates lower certainty need / higher adaptability', 120, 'standard', 'Human Needs Framework', '{personality,certainty,adaptability}', true, 202),

-- Variety (2)
('personality', 'educator', 'How much do you enjoy trying new teaching approaches, activities, or creative ideas in your room rather than sticking with what has worked before?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Prefer Familiar", "2": "Slight Preference for Familiar", "3": "Balanced", "4": "Enjoy New Approaches", "5": "Thrive on Innovation"}}',
 'Measures need for variety/novelty in professional practice', 120, 'standard', 'Human Needs Framework', '{personality,variety}', true, 203),

('personality', 'educator', 'How energised do you feel when your work involves a mix of different responsibilities (e.g., programming, family communication, room setup, mentoring)?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Prefer Focus", "2": "Slight Preference for Focus", "3": "Neutral", "4": "Enjoy Variety", "5": "Thrive on Variety"}}',
 'Measures need for variety in role diversity', 120, 'standard', 'Human Needs Framework', '{personality,variety}', true, 204),

-- Significance (1)
('personality', 'educator', 'How important is it to you that your contributions and ideas are recognised and valued by your team and leadership?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Not Important", "2": "Slightly Important", "3": "Moderately Important", "4": "Very Important", "5": "Essential"}}',
 'Measures need for significance/recognition in the workplace', 120, 'standard', 'Human Needs Framework', '{personality,significance}', true, 205),

-- Love/Connection (2)
('personality', 'educator', 'How important are close, supportive relationships with your colleagues to your overall job satisfaction?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Not Important", "2": "Slightly Important", "3": "Moderately Important", "4": "Very Important", "5": "Essential"}}',
 'Measures need for love/connection with team', 120, 'standard', 'Human Needs Framework', '{personality,connection}', true, 206),

('personality', 'educator', 'When a child or family is going through a difficult time, how naturally do you find yourself emotionally invested in supporting them?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Maintain Professional Distance", "2": "Slightly Invested", "3": "Moderately Invested", "4": "Quite Invested", "5": "Deeply Invested"}}',
 'Measures depth of connection/empathy with children and families', 120, 'standard', 'Human Needs Framework', '{personality,connection,empathy}', true, 207),

-- Growth (2)
('personality', 'educator', 'How motivated are you to pursue further professional development, qualifications, or specialisations beyond what is required?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Not Motivated", "2": "Slightly Motivated", "3": "Moderately Motivated", "4": "Highly Motivated", "5": "Constantly Seeking Growth"}}',
 'Measures need for personal/professional growth', 120, 'standard', 'Human Needs Framework', '{personality,growth}', true, 208),

('personality', 'educator', 'How do you respond to constructive feedback about your practice?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Find it Difficult", "2": "Accept Reluctantly", "3": "Accept Neutrally", "4": "Welcome It", "5": "Actively Seek It Out"}}',
 'Measures growth orientation through feedback receptivity', 120, 'standard', 'Human Needs Framework', '{personality,growth,feedback}', true, 209),

-- Contribution (1)
('personality', 'educator', 'How strongly do you feel that your work as an educator makes a meaningful difference in children''s lives and the broader community?', 'scale',
 '{"min": 1, "max": 5, "labels": {"1": "Rarely Think About It", "2": "Sometimes", "3": "Often", "4": "Strongly", "5": "It Is My Core Motivation"}}',
 'Measures need for contribution/purpose in work', 120, 'standard', 'Human Needs Framework', '{personality,contribution}', true, 210)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- SEED: ai_config additions for recruitment
-- ============================================================================

INSERT INTO ai_config (config_key, config_value, value_type, category, label, description, validation_min, validation_max) VALUES
('recruitment.score_weight_knowledge', '40', 'int', 'recruitment', 'Knowledge Weight %', 'Percentage weight for knowledge score', 0, 100),
('recruitment.score_weight_personality', '30', 'int', 'recruitment', 'Personality Weight %', 'Percentage weight for personality score', 0, 100),
('recruitment.score_weight_team_fit', '30', 'int', 'recruitment', 'Team Fit Weight %', 'Percentage weight for team fit score', 0, 100),
('recruitment.default_time_limit_seconds', '120', 'int', 'recruitment', 'Default Time Limit', 'Default seconds per question', 30, 600)
ON CONFLICT (config_key) DO NOTHING;


-- ============================================================================
-- SEED: ai_tool_permissions additions for recruitment
-- ============================================================================

INSERT INTO ai_tool_permissions (tool_name, tool_type, allowed_roles, description) VALUES
('create_candidate_invite', 'main', '{admin,manager,ns}', 'Create candidate invite link'),
('get_candidates', 'main', '{admin,manager,ns}', 'List and filter candidates'),
('score_candidate', 'main', '{admin,manager,ns}', 'Trigger AI candidate scoring'),
('create_onboarding_plan', 'main', '{admin,manager,ns}', 'Create full onboarding plan for approved candidate'),
('generate_interview_questions', 'main', '{admin,manager,ns}', 'AI-generate role-specific interview questions'),
('create_lms_module', 'main', '{admin,manager,ns,el}', 'Create LMS training module with sections and quizzes'),
('get_team_profiles', 'main', '{admin,manager,ns}', 'Get staff DISC/personality profiles for team mapping')
ON CONFLICT (tool_name) DO NOTHING;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'recruitment_positions' as tbl, COUNT(*) FROM recruitment_positions
UNION ALL SELECT 'recruitment_candidates', COUNT(*) FROM recruitment_candidates
UNION ALL SELECT 'recruitment_question_templates', COUNT(*) FROM recruitment_question_templates
UNION ALL SELECT 'staff_disc_profiles', COUNT(*) FROM staff_disc_profiles;

SELECT category, COUNT(*) FROM recruitment_question_templates GROUP BY category;
