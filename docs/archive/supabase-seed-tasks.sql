-- ============================================
-- SEED: Initial Tasks for Task Board
-- These are high-level priority tasks for the uplift
-- Run after supabase-seed.sql (needs qa_elements IDs)
-- ============================================

INSERT INTO public.tasks (title, description, status, priority, due_date, sort_order) VALUES
-- Immediate compliance
('Display correct compliance history at entrance', 'Download from NSW Early Learning Commission website and display at main entrance. Section 172(3)(a) breach.', 'todo', 'urgent', '2026-04-02', 1),
('Conduct emergency evacuation drill', 'Drills must be within 3-month timeframes. Use Emergency Drill Reflection template. Reg 97(3)(a).', 'todo', 'urgent', '2026-04-05', 2),
('Conduct emergency lockdown drill', 'Both evacuation AND lockdown required every 3 months. Document and reflect.', 'todo', 'urgent', '2026-04-05', 3),
('Deliver child protection training to ALL staff', 'Mandatory reporting, Reportable Conduct Scheme. Training Module 3. Reg 84 breach.', 'todo', 'urgent', '2026-04-07', 4),

-- Week 1 priorities
('Deliver Training Module 1: Positive Interactions', 'PRIORITY — 2 hour session on Reg 155, alternative language, co-regulation. All educators must attend.', 'todo', 'high', '2026-04-07', 5),
('Deliver Training Module 2: Planning Cycle', '2 hour session on complete planning cycle, observations, EYLF outcomes, critical reflection.', 'todo', 'high', '2026-04-09', 6),
('Set up calm-down spaces in toddler and preschool rooms', 'Soft cushions, sensory bottles, breathing charts, feelings posters. QA3/QA5.', 'todo', 'high', '2026-04-04', 7),
('Place recycling/compost bins in each room', 'Labelled bins for recycling, compost, rubbish. QA3 Element 3.2.3.', 'todo', 'high', '2026-04-04', 8),
('Create Individual Learning Profiles for every child', 'Use Learning Profile template. Include family goals, interests, EYLF-linked goals.', 'todo', 'high', '2026-04-11', 9),

-- Week 2
('Customise staff handbook with Kiros-specific info', 'Replace generic template with service name, philosophy, ops details, management roles, platforms.', 'todo', 'medium', '2026-04-14', 10),
('Distribute family satisfaction surveys', 'Print and distribute to all current families. Set 2-week return deadline.', 'todo', 'medium', '2026-04-14', 11),
('Review behaviour guidance documentation', 'Remove speculative language from behaviour reports. Record observable facts only.', 'todo', 'high', '2026-04-11', 12),
('Create formal casual educator induction checklist', 'Use Casual Induction template. All casuals must complete before working with children.', 'todo', 'medium', '2026-04-14', 13),
('Schedule monthly team meetings for the year', 'Set fixed dates. Use Meeting Minutes template. Structured agenda required.', 'todo', 'medium', '2026-04-11', 14),

-- Week 3-4
('Establish community partnership with local library', 'Contact library about visits or program partnership. QA6 Element 6.2.3.', 'todo', 'medium', '2026-04-21', 15),
('Develop individualised support plans for children with additional needs', 'Collaborate with families and allied health. QA6 Element 6.2.2.', 'todo', 'high', '2026-04-18', 16),
('Conduct philosophy review with stakeholder input', 'Survey families, discuss at team meeting, gather children''s perspectives. QA7 Element 7.1.1.', 'todo', 'medium', '2026-04-25', 17),
('Create Educational Leadership plan', 'EL writes term plan with focus areas, goals, strategies for each room. QA7 Element 7.2.2.', 'todo', 'medium', '2026-04-18', 18),
('Implement weekly critical reflections in all rooms', 'Use Weekly Critical Reflection template every Friday. EL reviews. QA1 Element 1.3.2.', 'todo', 'high', '2026-04-07', 19),

-- Response
('Submit formal response to department', 'Upload response via portal by 5 April 2026. Ensure all [Confirm] placeholders filled.', 'todo', 'urgent', '2026-04-05', 0);
