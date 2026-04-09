-- ============================================
-- CENTRE CONTEXT SEED DATA
-- Kiros Early Education — Extracted from service documents
-- Generated 2026-04-09
-- ============================================

-- First, insert placeholder sharepoint_documents so centre_context has valid FKs
INSERT INTO sharepoint_documents (id, sharepoint_item_id, file_name, file_path, file_type, document_type, is_monitored, extracted_text, last_synced_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'sp-qip-001', 'Quality Improvement Plan.pdf', '/QIP/Quality Improvement Plan.pdf', 'pdf', 'qip', true, 'Quality Improvement Plan — all 7 QAs', now()),
  ('d0000001-0000-0000-0000-000000000002', 'sp-philosophy-001', 'KIROS Philosophy.pdf', '/Philosophy/KIROS Philosophy.pdf', 'pdf', 'philosophy', true, 'K.I.R.O.S — Knowledge, Integrity, Resilience, Openness, Safe Harbour', now()),
  ('d0000001-0000-0000-0000-000000000003', 'sp-policy-cp-001', 'Child Protection Policy.pdf', '/Policies/Child Protection Policy.pdf', 'pdf', 'policy', true, 'Child Protection Policy NSW LDC', now()),
  ('d0000001-0000-0000-0000-000000000004', 'sp-policy-behaviour-001', 'Positive Behaviour Guidance Policy.pdf', '/Policies/Positive Behaviour Guidance Policy.pdf', 'pdf', 'policy', true, 'Positive Behaviour Guidance Policy', now()),
  ('d0000001-0000-0000-0000-000000000005', 'sp-programming-001', 'Room Programs All Rooms.pdf', '/Programming/Room Programs All Rooms.pdf', 'pdf', 'programming', true, 'Nursery, Toddler, Preschool programs with EYLF links', now()),
  ('d0000001-0000-0000-0000-000000000006', 'sp-handbook-001', 'Staff Handbook.pdf', '/Handbook/Staff Handbook.pdf', 'pdf', 'handbook', true, 'Staff Handbook and Code of Conduct', now()),
  ('d0000001-0000-0000-0000-000000000007', 'sp-procedure-001', 'Childcare Commencement Procedure.pdf', '/Procedures/Childcare Commencement Procedure.pdf', 'pdf', 'procedure', true, 'Orientation and commencement procedure', now()),
  ('d0000001-0000-0000-0000-000000000008', 'sp-procedure-002', 'Emergency Management Procedures.pdf', '/Procedures/Emergency Management Procedures.pdf', 'pdf', 'procedure', true, 'Emergency drills, risk assessment, safety procedures', now()),
  ('d0000001-0000-0000-0000-000000000009', 'sp-procedure-003', 'Mealtime Procedures.pdf', '/Procedures/Mealtime Procedures.pdf', 'pdf', 'procedure', true, 'Setting up for mealtimes, hygiene, food handling', now()),
  ('d0000001-0000-0000-0000-000000000010', 'sp-policy-supervision-001', 'Supervision Policy and Plans.pdf', '/Policies/Supervision Policy and Plans.pdf', 'pdf', 'policy', true, 'Supervision plans, outdoor charts, daily tracking', now()),
  ('d0000001-0000-0000-0000-000000000011', 'sp-other-el-001', 'Educational Leader Evidence.pdf', '/EL/Educational Leader Evidence.pdf', 'pdf', 'other', true, 'EL evidence of pedagogical leadership', now()),
  ('d0000001-0000-0000-0000-000000000012', 'sp-other-delegation-001', 'Delegation of Authority.pdf', '/Governance/Delegation of Authority.pdf', 'pdf', 'other', true, 'Delegation of authority from Approved Provider', now())
ON CONFLICT (sharepoint_item_id) DO NOTHING;


-- ============================================
-- QIP GOALS — Extracted from QIP and response documents
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

-- QA1 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Embed complete planning cycle across all rooms',
 'Implement a quarterly planning cycle with documented individual learning goals for every child, informed by family input, educator observations, and developmental milestones. Ensure a traceable cycle from observation to analysis to goals to planned experiences to reflection.',
 '{1}', '{1.1.1,1.1.2,1.1.3,1.3.1}',
 'A complete assessment and planning cycle template has been implemented across all rooms, documenting: Observation → Analysis of Learning → Individual Goals → Planned Experiences → Implementation → Reflection/Evaluation → Follow-up.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Strengthen documentation of children''s voices in programming',
 'Add a dedicated "Children''s Voice" section to all program documentation. Educators to document children''s quotes, questions, and ideas as they emerge and link these directly to planned follow-up experiences.',
 '{1}', '{1.1.2,1.2.3}',
 'A dedicated Children''s Voice section has been added to all program documentation. Educators are now documenting children''s quotes, questions, and ideas as they emerge.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Embed critical reflection as driver of programming',
 'Implement structured weekly critical reflection for all rooms addressing: What worked? What would we change? How has this informed next steps? What does this tell us about individual children''s learning? EL to facilitate weekly reflection discussions with each room team.',
 '{1}', '{1.3.2}',
 'A structured weekly critical reflection template has been implemented for all rooms. The Educational Leader facilitates weekly reflection discussions with each room team.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Systematise routine-based learning opportunities',
 'Explicitly document routine-based learning in each room''s program including transitions, mealtimes, rest time, and outdoor time. Train educators on using routines as intentional teaching moments.',
 '{1}', '{1.1.3,1.2.1}',
 'Routine-based learning opportunities have been explicitly documented in each room''s program. Educators have been trained on how to use routines as intentional teaching moments.',
 false),

-- QA2 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Strengthen hygiene practices beyond mealtimes',
 'Extend active handwashing monitoring throughout the day — after outdoor play, messy activities, toileting, not just mealtimes. Install visual prompts in all bathrooms. Embed children''s handwashing song "Tops and Bottoms" across all rooms.',
 '{2}', '{2.1.2}',
 'Children have created their own handwashing song — "Tops and Bottoms" — which is practised daily across all rooms. Visual prompts are now displayed in all bathrooms.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Bring emergency drills within required 3-month cycle',
 'Establish strict 3-monthly emergency drill calendar. Implement "Safety Week" in first week of each month for drills, risk assessment reviews, and safety audits. Ensure all drill reflections lead to actioned improvements.',
 '{2}', '{2.2.2}',
 'The Nominated Supervisor has established a Safety Week in the first week of each month, during which emergency drills, risk assessment reviews, and safety audits are conducted.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Ensure all educators can articulate child protection obligations',
 'Deliver comprehensive child protection training covering the Reportable Conduct Scheme, mandatory reporting obligations, and practical scenarios. Implement monthly child protection scenarios as ongoing practice. Complete Gecko training for all staff.',
 '{2}', '{2.2.3}',
 'All educators are completing Gecko training by end of April. Monthly child protection scenarios will be implemented as ongoing practice.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Implement structured physical activity programming',
 'Introduce daily physical activity schedule including fundamental movement skills (running, jumping, balancing, throwing, catching) aligned with Munch & Move guidelines. Register and commence Munch & Move sessions.',
 '{2}', '{2.1.3}',
 'A structured daily physical activity schedule has been implemented, including fundamental movement skill activities aligned with the Munch & Move guidelines.',
 false),

-- QA3 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Reintroduce calm-down spaces and sensory supports in all rooms',
 'Provide soft furnishings and designated quiet/calm-down spaces in toddler and preschool rooms with appropriate alternatives. Source sensory tools and visual supports for children requiring additional support.',
 '{3}', '{3.2.1}',
 'Soft furnishings and designated quiet/calm-down spaces have been reintroduced. Sensory tools and visual supports have been sourced for children requiring additional support.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Embed sustainability practices across all rooms',
 'Install recycling bins and differentiated waste bins in every room. Embed sustainability into weekly program. Build on existing child-led sustainability learning (rubbish sorting activity) and extend across all age groups.',
 '{3}', '{3.2.3}',
 'Recycling bins and differentiated waste bins have been ordered. Sustainability practices are being embedded into the weekly program.',
 false),

-- QA4 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Establish regular documented team meetings',
 'Schedule monthly team meetings with documented minutes covering children''s learning goals, adjustments, and professional discussion. Implement weekly communications sheet. Hold room leader meetings every Friday.',
 '{4}', '{4.2.1}',
 'Monthly team meetings are now scheduled. A weekly communications sheet has been created. Room leader meetings are held every Friday.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Customise staff handbook to Kiros service context',
 'Update staff handbook from generic template to include service-specific operational information informed by the QIP, service philosophy, and current operational procedures.',
 '{4}', '{4.2.1,4.2.2}',
 'The staff handbook is being updated to include service-specific information, informed by the Quality Improvement Plan.',
 false),

-- QA5 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Uplift educator language and interaction quality',
 'Conduct individual mentoring with every educator on language choice and positive interactions. Deliver service-wide training on positive language with signed acknowledgement. Engage external training organisation for further PD.',
 '{5}', '{5.1.1,5.1.2}',
 'We are mentoring educators one at a time, with sustained coaching from the Operational Manager. A formal training session on positive language is scheduled. An external training organisation has been engaged.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Strengthen self-regulation support strategies',
 'Move away from directive language toward reflective questions and calm-down strategies. Introduce calm-down spaces, sensory tools, and visual supports. Uplift behaviour guidance plans with allied health input.',
 '{5}', '{5.2.2}',
 'Calm-down spaces, reflective questions, and self-regulation strategies are being implemented across rooms with coaching from the Operational Manager.',
 false),

-- QA6 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Formalise family feedback and input mechanisms',
 'Distribute family satisfaction surveys. Embed daily engagement process at drop-off and pick-up. Create informal feedback mechanisms (Yes/No jars). Actively collect and integrate family collaboration sheets into individual learning plans.',
 '{6}', '{6.1.1,6.1.2}',
 'Family satisfaction surveys distributed to all families. Embedded a daily engagement process at drop-off and pick-up. Created feedback mechanisms including Yes/No jars.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Build community partnerships and referral networks',
 'Expand beyond The Hive partnership. Connect with local businesses and community organisations for excursions and extra-curricular activities. Build a family library with local support services and community resources.',
 '{6}', '{6.2.3}',
 'We are developing a library of local community partnerships, support services, and resources. The Nominated Supervisor is connecting with local businesses and community organisations.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Systematise transition processes',
 'Document and formalise room-to-room transition process. Introduce transition-to-school procedure. Discuss and embed transition processes at April staff meeting.',
 '{6}', '{6.2.1}',
 'The Nominated Supervisor is introducing a transition process that will be discussed at the April staff meeting.',
 false),

-- QA7 Goals
('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Complete philosophy review with family and community input',
 'Continue year-long K.I.R.O.S philosophy review (one theme at a time). Actively seek family input through surveys, feedback jars, foyer displays, and conversations. Document feedback and update philosophy accordingly.',
 '{7}', '{7.1.1}',
 'A year-long philosophy review process had commenced, with the service focusing on one theme at a time. Knowledge commenced as the focus in January 2026.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Strengthen educational leadership systems',
 'Ensure EL has minimum 2 hours dedicated off-floor time per week. EL to work alongside NS and Operational Manager on programming quality. Build structured mentoring and resource folder for educators.',
 '{7}', '{7.2.2}',
 'The Educational Leader now has at least 2 hours of dedicated off-floor time per week, working closely with the Nominated Supervisor and Operational Manager.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_goal',
 'Implement formal performance management and PD',
 'Roll out individual performance conversations with each educator. Set collaborative professional development goals. Introduce CELA monthly tasks starting with NS, cascading to EL and Room Leaders.',
 '{7}', '{7.2.3}',
 'The Nominated Supervisor is rolling out individual performance conversations. CELA monthly tasks are being introduced.',
 false);


-- ============================================
-- QIP STRATEGIES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Quarterly planning cycle with individual child profiles',
 'Use a quarterly planning cycle that allows sufficient time for children''s development to be observed, documented, and meaningfully extended. Each child has a documented individual learning profile reviewed regularly. Observations recorded on Playground app with EYLF outcomes linked.',
 '{1}', '{1.1.1,1.3.1}',
 'We chose a quarterly cycle deliberately — it allows sufficient time for children''s development to be observed, documented, and meaningfully responded to.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Child-led inquiry-based programming across all rooms',
 'Programs are built around children''s emerging interests through inquiry-based learning. Toddler room: dinosaur inquiry from observed interests. Preschool room: under-the-sea inquiry from children''s group time questions. Nursery: responsive programming from children''s expressed interests.',
 '{1}', '{1.1.2,1.2.3}',
 'The entire inquiry was driven by children''s observed interest in dinosaurs. The preschool inquiry shifted from exploring species to caves and deep-sea habitats, directly following children''s questions.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Operational Manager on-site for sustained educator coaching',
 'Permanent Operational Manager (Tracey Davey — 20 years experience) engaged on-site to provide individual one-on-one mentoring with each educator. Focus on modelling and coaching intentional teaching, positive language, and professional practice.',
 '{4,5,7}', '{1.2.1,4.2.1,5.1.1,7.2.3}',
 'We are not running a single training session and considering the matter closed. We are mentoring educators one at a time, with sustained coaching from the Operational Manager.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Leadership restructure for quality improvement',
 'Previous NS transitioned to ECT role for targeted coaching. New NS appointed (Annette Ballard — 11 years experience). Permanent Operational Manager engaged. Two additional ECT-qualified educators hired for preschool room.',
 '{4,7}', '{4.1.1,7.1.3,7.2.1}',
 'We have fundamentally strengthened the leadership of the service because we recognised — before receiving the draft report — that it was needed.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Playground app as two-way family communication channel',
 'Use the Playground app for learning stories with children''s names, photos, and EYLF outcomes linked. Include event notifications, illness alerts, and program updates. Track family interactions (views, likes, comments) on each post.',
 '{6}', '{6.1.1,6.1.2,1.3.3}',
 'The Playground app was actively used to communicate with families. Family interactions (views, likes, comments) were recorded on each post, creating a documented two-way channel.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Monthly Safety Week for drill compliance',
 'Establish a Safety Week in the first week of each month to conduct emergency drills, risk assessment reviews, and safety audits. Ensures drills remain within required 3-month timeframes. Document reflections with required improvements actioned and signed off.',
 '{2}', '{2.2.2}',
 'The Nominated Supervisor has established a Safety Week in the first week of each month.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'KU Inclusion Support for children with additional needs',
 'Engage KU Inclusion Support formally for children with additional needs. Collaborate with allied health professionals (speech therapy, occupational therapy). Offer on-site allied health sessions. Maintain inclusive approach — do not exclude children based on behaviour.',
 '{5,6}', '{5.2.2,6.2.2}',
 'KU Inclusion Support has been formally approved and is commencing. The service does not exclude children based on behaviour — this is consistent with inclusive practice.',
 false),

('d0000001-0000-0000-0000-000000000001', 'qip_strategy',
 'Room leader meetings every Friday',
 'Hold weekly room leader meetings every Friday to review and reflect on the week''s program delivery, discuss children''s progress, and plan for the following week.',
 '{1,4,7}', '{1.3.2,4.2.1,7.2.2}',
 'Room leader meetings are held every Friday to review and reflect on the week''s program delivery.',
 false);


-- ============================================
-- PHILOSOPHY PRINCIPLES — K.I.R.O.S
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000002', 'philosophy_principle',
 'Knowledge — Building foundations for lifelong learning',
 'Knowledge is the first pillar of the K.I.R.O.S philosophy. The service is committed to building foundations for lifelong learning through inquiry-based, child-led programming aligned with the EYLF V2.0. The year-long philosophy review commenced with Knowledge as the first focus in January 2026.',
 '{1,7}', '{1.1.1,1.1.2,7.1.1}',
 'K.I.R.O.S — Knowledge, Integrity, Resilience, Openness, Safe Harbour. Knowledge commenced as the focus in January 2026.',
 false),

('d0000001-0000-0000-0000-000000000002', 'philosophy_principle',
 'Integrity — Ethical practice and professional standards',
 'Integrity guides the service''s commitment to ethical and respectful behaviour, professional standards, transparent governance, and honest engagement with families. All educators model ethical conduct as acknowledged in the A&R report.',
 '{4,5,7}', '{4.2.2,5.1.2,7.1.1}',
 'The report acknowledges that educators model ethical and respectful behaviour.',
 false),

('d0000001-0000-0000-0000-000000000002', 'philosophy_principle',
 'Resilience — Supporting children and the service through challenges',
 'Resilience informs the service''s approach to supporting children''s self-regulation, managing behavioural challenges with inclusive practice, and the service''s own response to challenges. The service does not exclude children based on behaviour.',
 '{5,6}', '{5.2.2,6.2.2,7.1.1}',
 'We do not exclude children based on behaviour. We do not send children home as a routine response. This is inclusive practice.',
 false),

('d0000001-0000-0000-0000-000000000002', 'philosophy_principle',
 'Openness — Welcoming families and community input',
 'Openness drives the service''s approach to family partnerships, transparency in communication, and welcoming community engagement. The Playground app, orientation process, and family events reflect this commitment to open, two-way relationships.',
 '{6,7}', '{6.1.1,6.1.2,7.1.1}',
 'Family engagement was occurring through multiple channels at the time of the visit.',
 false),

('d0000001-0000-0000-0000-000000000002', 'philosophy_principle',
 'Safe Harbour — A secure environment for every child',
 'Safe Harbour is the foundation — every child deserves a physically and emotionally safe environment. This principle underpins supervision practices, health and hygiene procedures, child protection obligations, and the creation of warm, nurturing relationships where children feel secure.',
 '{2,5}', '{2.2.1,2.2.3,5.1.1,7.1.1}',
 'Children demonstrated trust and security: leaning into educators for hugs, bringing flowers to educators on arrival.',
 false);


-- ============================================
-- TEACHING APPROACHES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'Intentional teaching through documented strategies',
 'Educators document intentional teaching strategies in program plans: using correct terminology (e.g. "big groups of dinosaurs are called herds"), expanding vocabulary by modelling full sentences, asking intentional questions during book reading (e.g. "Why do you think the dinosaur has sharp teeth?"), using open-ended questions, role modelling interactions and language, and labelling emotions.',
 '{1}', '{1.2.1,1.2.2}',
 'Correct language used during experiences e.g. big groups of dinosaurs are called herds. Expanding vocabulary, modelling full sentences. Reading Dinosaur Rawr book — asking intentional questions.',
 false),

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'Inquiry-based learning driven by children''s interests',
 'Each room runs an inquiry based on children''s emerging interests. Toddlers: "How does the world change?" driven by dinosaur interest. Preschool: "What makes species unique?" evolving into deep-sea/cave exploration from children''s group time questions. Programs follow children''s lead with educator extension.',
 '{1}', '{1.1.2,1.2.1,1.2.3}',
 'The entire inquiry was driven by children''s observed interest in dinosaurs. The inquiry shifted from What makes species unique to exploring caves and deep-sea habitats, directly following children''s questions.',
 false),

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'Self-help skills embedded in daily routines',
 'Routines are used as learning opportunities: toddlers scraping bowls after mealtimes, wiping faces in mirrors, helping with bed-making. Preschool uses progressive lunch with self-serving. Nursery has responsive rest routines based on individual children''s cues.',
 '{1,2}', '{1.1.3,2.1.3}',
 'The Toddler program explicitly included Independence and self-help skills — documenting children scraping bowls, wiping faces in mirrors, and helping with bed-making.',
 false),

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'EYLF V2.0 alignment across all programs',
 'All room programs reference the EYLF V2.0 with outcomes explicitly linked. Program templates include columns for What, Why, Who, How, Planning/Evaluation, Possible Pathways, and Family Aspirations — directly aligned with the approved learning framework.',
 '{1}', '{1.1.1}',
 'Curriculum plans across all three rooms were in place and referenced the EYLF V2.0. EYLF outcomes 2.1, 2.2, 4.1, 4.2 explicitly linked.',
 false),

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'Scaffolding through modelling, language, and tool introduction',
 'Educators scaffold learning by: moving alongside children in play and naming objects/animals, introducing tools to deepen exploration (e.g. magnifying glass with figurines), physically sitting with children to support their play, and building on interests with descriptive language.',
 '{1}', '{1.2.2}',
 'A toddler educator extended a child''s play with sea animal figurines by moving other animals and naming them. A nursery educator encouraged a child to use a magnifying glass.',
 false),

('d0000001-0000-0000-0000-000000000005', 'teaching_approach',
 'Children as decision-makers in their learning environment',
 'Children contribute to classroom guidelines through group time discussions with their direct quotes recorded. Children independently run learning activities (recycling sorting game). Children make choices about play, food (progressive lunch), and routines. Visual choice boards and child-accessible materials support agency.',
 '{1,5}', '{1.2.3,5.2.1}',
 'Children co-created classroom guidelines during group time, capturing direct quotes. Children independently continued a recycling sorting game without adult direction.',
 false);


-- ============================================
-- FAMILY ENGAGEMENT PRACTICES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'Structured orientation with play-and-stay sessions',
 'The Childcare Commencement Procedure includes: 30-minute orientation, minimum 2 playdates (some children attend 4-5 play-and-stay sessions), educator introduction, and documented sign-off process. Families can attend as many sessions as they wish before commencement.',
 '{6}', '{6.1.1,6.2.1}',
 'The Childcare Commencement Procedure includes a 30-minute orientation, minimum 2 playdates, and a documented sign-off process.',
 false),

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'Family goals captured at orientation and embedded in programs',
 'Orientation paperwork captures: "Goals and Achievements" (3 specific goals per family), "What''s Special About Me" forms, and comprehensive family checklist covering child''s needs, routines, and priorities. Family aspirations are recorded directly in room programs (e.g. sleep transitions, songs from home).',
 '{1,6}', '{1.3.3,6.1.2}',
 'The nursery program documented family aspirations: Kade is now going from 2 naps to 1 nap. Nalani introduced a new song to our room.',
 false),

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'Playground app for learning stories and family communication',
 'The Playground app serves as the primary digital communication channel. Posts include: children''s learning stories with names, photos, and EYLF outcomes; event notifications; illness alerts with exclusion guidance; staff change notices; fee communications. Family interactions (views, likes, comments) are tracked.',
 '{6}', '{6.1.1,6.1.2,1.3.3}',
 'The Playground app was actively used to communicate with families. Family interactions were recorded on each post, creating a documented two-way channel.',
 false),

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'Regular family events and celebrations',
 'The service hosts regular family events: Christmas party, Mother''s Day, Father''s Day, Easter celebrations, multicultural dress-up days, photo days, and Australia Day celebrations. Events are communicated through the Playground app. These strengthen the sense of community and belonging.',
 '{6}', '{6.1.1,6.2.3}',
 'Family events were held throughout 2025, including Christmas celebrations, Mother''s Day, Father''s Day, and multicultural dress-up days.',
 false),

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'End-of-year reports documenting individual progress',
 'Individual child reports are provided to families documenting progress against the goals set at orientation. Reports track developmental milestones and EYLF outcomes. This closes the loop on family engagement from enrolment through to documented outcomes.',
 '{1,6}', '{1.3.1,1.3.3,6.1.2}',
 'End-of-year reports were provided to families documenting individual progress against goals.',
 false),

('d0000001-0000-0000-0000-000000000007', 'family_engagement',
 'Family satisfaction surveys and informal feedback mechanisms',
 'Family satisfaction surveys have been distributed to all families. Informal feedback mechanisms include Yes/No jars and daily engagement at drop-off and pick-up where educators actively invite family input. A family information evening is being planned.',
 '{6}', '{6.1.1,6.1.2}',
 'Distributed family satisfaction surveys. Created feedback mechanisms including Yes/No jars. Embedded daily engagement process at drop-off and pick-up.',
 false);


-- ============================================
-- POLICY REQUIREMENTS
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000003', 'policy_requirement',
 'Child protection — Reportable Conduct Scheme obligations',
 'All educators must be able to articulate the Reportable Conduct Scheme, mandatory reporting obligations, and procedures for responding to concerns. Child Protection Policy must be read and signed by all staff. Monthly child protection scenarios to maintain awareness. Gecko training completion required.',
 '{2}', '{2.2.3}',
 'All staff are being reminded of their qualification requirements and obligations under child protection law. Monthly child protection scenarios will be implemented as ongoing practice.',
 false),

('d0000001-0000-0000-0000-000000000004', 'policy_requirement',
 'Positive behaviour guidance — no physical restraint or exclusion',
 'The service uses positive behaviour guidance. No physical restraint as routine practice. Children are not excluded based on behaviour. Behaviour guidance plans are developed collaboratively with families and allied health professionals. Focus on reflective questions, calm-down spaces, and self-regulation strategies.',
 '{5}', '{5.1.1,5.1.2,5.2.2}',
 'We do not have policies that exclude children from attending while working on their behaviours — this is consistent with inclusive practice and the National Law.',
 false),

('d0000001-0000-0000-0000-000000000010', 'policy_requirement',
 'Supervision — all children visible at all times',
 'Supervision plans require all children to be visible at all times, including sleeping children. Room layouts reviewed to ensure sight lines. Educator positioning during nappy changes, rest times, and transitions specifically addressed. Supervision plans updated to reflect current and growing occupancy.',
 '{2}', '{2.2.1}',
 'Educator positioning during nappy changes, rest times, and transitions has been specifically addressed. Room layouts reviewed to ensure all children remain visible.',
 false),

('d0000001-0000-0000-0000-000000000003', 'policy_requirement',
 'Regulation 155 — Positive language and dignity-preserving interactions',
 'Educators must use positive, respectful language that maintains children''s dignity at all times. No directive or stern language. Offer children choices. Respond to individual needs. Engage at children''s level. Service-wide training with signed acknowledgement required.',
 '{5}', '{5.1.1,5.1.2}',
 'Every educator has been spoken to individually about language, expectations, and their obligations. A formal training session on positive language is scheduled.',
 false);


-- ============================================
-- PROCEDURE STEPS
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000008', 'procedure_step',
 'Emergency drill procedure with reflection and follow-up',
 'Conduct evacuation and lockdown drills within strict 3-monthly intervals. Following each drill: complete reflection template, identify improvements needed, action improvements with sign-off, and document completion. Safety Week in first week of each month covers drills, risk assessments, and safety audits.',
 '{2}', '{2.2.2}',
 'A drill reflection template has been implemented requiring identified improvements to be actioned and signed off.',
 false),

('d0000001-0000-0000-0000-000000000009', 'procedure_step',
 'Handwashing procedure — throughout the day',
 'Active handwashing supervision throughout the day: after outdoor play, messy activities, toileting, and before/after mealtimes. Children''s handwashing song "Tops and Bottoms" practised daily. Visual prompts in all bathrooms. Room leaders actively prompt handwashing.',
 '{2}', '{2.1.2}',
 'Room leaders actively prompt handwashing throughout the day — after outdoor play, messy activities, toileting, and mealtimes.',
 false),

('d0000001-0000-0000-0000-000000000007', 'procedure_step',
 'Orientation and commencement for new families',
 'Step 1: 30-minute orientation session. Step 2: Minimum 2 playdates (up to 4-5 sessions). Step 3: Complete orientation paperwork (Goals and Achievements, What''s Special About Me, family checklist). Step 4: Educator introduction. Step 5: Documented sign-off. Step 6: Ongoing Playground app communication commences.',
 '{6}', '{6.1.1,6.2.1}',
 'The Childcare Commencement Procedure includes a 30-minute orientation, minimum 2 playdates with some children attending 4-5 play-and-stay sessions.',
 false),

('d0000001-0000-0000-0000-000000000009', 'procedure_step',
 'Nappy change audit procedure',
 'Regular nappy change audits conducted to monitor hygiene compliance. Audits check hand hygiene during nappy changes, correct procedure adherence, and cleanliness. Three completed audits were maintained as ongoing evidence.',
 '{2}', '{2.1.2}',
 'Nappy change audits were being conducted regularly — three completed audits were available as evidence.',
 false);


-- ============================================
-- SERVICE VALUES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000002', 'service_value',
 'Inclusive practice — every child belongs',
 'Kiros does not exclude children based on behaviour. The service supports children with additional needs through behaviour guidance plans, allied health collaboration, KU Inclusion Support, and environmental adaptations. Every child deserves to participate, regardless of diagnosis or behavioural challenges.',
 '{5,6}', '{5.1.2,5.2.2,6.2.2}',
 'We do not exclude children based on behaviour. This is inclusive practice. It is what the National Law expects of us.',
 false),

('d0000001-0000-0000-0000-000000000002', 'service_value',
 'Continuous improvement as a new service',
 'As a service that opened in December 2024, Kiros is committed to continuously building, adapting, and improving. Systems are developed alongside growing enrolment (5% to 71% occupancy). Improvement is proactive — programming was uplifted before the assessment notification, not in response to it.',
 '{7}', '{7.2.1}',
 'We are a service that has been continuously building, adapting, and improving since the day we opened. The planning program had been uplifted before we were even notified of the assessment.',
 false),

('d0000001-0000-0000-0000-000000000002', 'service_value',
 'Staff above minimum ratios for quality',
 'Kiros deliberately staffs above minimum ratios. On assessment day, the preschool room had three educators for ten children (ratio required one). This is a conscious decision to staff for quality, not just compliance.',
 '{4}', '{4.1.1,4.1.2}',
 'Our staffing on the day significantly exceeded minimum ratios across all rooms. This is a deliberate decision — we staff for quality, not just compliance.',
 false),

('d0000001-0000-0000-0000-000000000002', 'service_value',
 'Acting on feedback swiftly and substantively',
 'When issues are identified, the service acts immediately rather than waiting for formal processes. Leadership restructure, educator hiring, compliance rectification, and programming overhaul all commenced within weeks of the assessment visit, before the draft report was received.',
 '{7}', '{7.2.1}',
 'We did not wait for the draft report. We worked through every item raised and began making changes immediately.',
 false);


-- ============================================
-- INCLUSION PRACTICES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000004', 'inclusion_practice',
 'Behaviour guidance plans developed before formal diagnosis',
 'The service develops behaviour guidance plans proactively when support needs are identified, without waiting for a formal diagnosis. Plans are developed collaboratively with families and uplifted with allied health input once a diagnosis is received.',
 '{5,6}', '{5.2.2,6.2.2}',
 'A behaviour guidance plan was already in place prior to the formal diagnosis. The service had identified the child''s support needs and developed strategies in collaboration with the family.',
 false),

('d0000001-0000-0000-0000-000000000004', 'inclusion_practice',
 'Allied health collaboration and on-site sessions',
 'The service actively collaborates with allied health professionals (speech therapy, occupational therapy). Communication is maintained with therapists. The service offers for allied health sessions to be conducted on-site to reduce barriers for families.',
 '{6}', '{6.2.2}',
 'Communication with the child''s speech therapist and occupational therapist was occurring, and the service had offered for allied health sessions to be conducted on-site.',
 false),

('d0000001-0000-0000-0000-000000000004', 'inclusion_practice',
 'KU Inclusion Support engagement',
 'KU Inclusion Support has been formally approved and is commencing for children with additional needs. This provides professional inclusion support, strategies, and resources to educators working with children who require additional assistance.',
 '{3,5,6}', '{3.2.1,5.2.2,6.2.2}',
 'KU Inclusion Support has been formally approved and is commencing.',
 false),

('d0000001-0000-0000-0000-000000000005', 'inclusion_practice',
 'Multicultural celebrations and diverse programming',
 'The service hosts multicultural dress-up days and celebrations engaging families from diverse cultural backgrounds. Natural materials from the outdoor environment are incorporated. The service reflects and celebrates the diversity of its Bidwill community.',
 '{3,6}', '{3.2.1,6.2.3}',
 'Multicultural day celebrations were hosted, engaging families from diverse cultural backgrounds and building connections.',
 false);


-- ============================================
-- SAFETY PROTOCOLS
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000008', 'safety_protocol',
 'Monthly Safety Week — drills, audits, and risk reviews',
 'First week of each month designated as Safety Week. Covers: emergency evacuation drill, lockdown drill, risk assessment review, safety audit of indoor and outdoor environments. Ensures all drills remain within required 3-month timeframes. Reflections documented and improvements actioned.',
 '{2}', '{2.2.2}',
 'The Nominated Supervisor has established a Safety Week in the first week of each month.',
 false),

('d0000001-0000-0000-0000-000000000008', 'safety_protocol',
 'Supervision plans updated for growing occupancy',
 'Supervision plans reviewed and updated by NS to reflect current and growing occupancy and room configurations. Educator positioning during nappy changes, rest times, and transitions specifically addressed. Room layouts ensure all children — including sleeping children — remain visible.',
 '{2}', '{2.2.1}',
 'Supervision plans have been updated by the Nominated Supervisor to reflect current occupancy. Educator positioning during nappy changes and rest times has been specifically addressed.',
 false),

('d0000001-0000-0000-0000-000000000008', 'safety_protocol',
 'Daily safety checklists and hazard management',
 'Daily safety checklists completed by educators. Operational Manager implements rigorous approach to identifying and actioning maintenance items. Friday reports track maintenance and operational items. Hazards identified and removed promptly (e.g. metal hoop on tunnel removed immediately when identified).',
 '{2,3}', '{2.2.1,3.1.1}',
 'Daily safety checklists continue to be completed. The Operational Manager has implemented a more rigorous approach to identifying and actioning maintenance items.',
 false),

('d0000001-0000-0000-0000-000000000010', 'safety_protocol',
 'Nursery outdoor area gate separation',
 'A gate has been installed to separate the nursery outdoor play area from older age groups. Supports safer and more age-appropriate outdoor play. Well received by educators, families, and children.',
 '{2,3}', '{2.2.1,3.1.1,3.2.1}',
 'A gate has been installed to separate the nursery outdoor play area from older age groups.',
 false);


-- ============================================
-- ENVIRONMENT FEATURES
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000005', 'environment_feature',
 'Intentional inquiry-based room setups',
 'Each room is set up daily with provocations linked to the current inquiry. Toddler room: dinosaur sandpit enclosure, dinosaur resources at children''s level for self-selected play. Nursery: sensory experiences, musical instruments, age-appropriate provocations. Preschool: play-dough with natural placemats, magnetic tiles, art materials.',
 '{3}', '{3.2.1,3.2.2}',
 'The toddler room featured an intentional dinosaur inquiry setup, including a sandpit dinosaur enclosure acknowledged as an example of thoughtful environmental design.',
 false),

('d0000001-0000-0000-0000-000000000005', 'environment_feature',
 'Natural materials and nature-based provocations',
 'Natural materials are incorporated across the service: nature treasure hunts, painting with natural resources collected by children, and natural loose parts in nursery and toddler environments. Children collect and use leaves, sticks, and stones in play and creative activities.',
 '{3}', '{3.2.1,3.2.3}',
 'Natural materials were being incorporated — nature treasure hunts, painting with natural resources collected by children.',
 false),

('d0000001-0000-0000-0000-000000000005', 'environment_feature',
 'Calm-down spaces and sensory supports',
 'Soft furnishings and designated quiet/calm-down spaces reintroduced in toddler and preschool rooms. Sensory tools and visual supports sourced for children requiring additional support. Alternative furnishings selected to address previous safety concern of children using cushions as crash mats.',
 '{3,5}', '{3.2.1,5.2.2}',
 'Soft furnishings and designated quiet/calm-down spaces have been reintroduced. Sensory tools and visual supports have been sourced.',
 false),

('d0000001-0000-0000-0000-000000000005', 'environment_feature',
 'Sustainability learning embedded in environment',
 'Recycling bins and differentiated waste bins in rooms. Child-led rubbish sorting experience (composting, recycling, rubbish) that children independently continued. Natural materials from the outdoor environment used in art and sensory experiences across rooms.',
 '{3}', '{3.2.3}',
 'The preschool program documented Exploring our rubbish system — a child-led experience where children engaged in sorting learning about composting, recycling, and rubbish.',
 false);


-- ============================================
-- LEADERSHIP GOALS
-- ============================================

INSERT INTO centre_context (document_id, context_type, title, content, related_qa, related_element_codes, source_quote, ai_generated) VALUES

('d0000001-0000-0000-0000-000000000012', 'leadership_goal',
 'EL dedicated off-floor time for programming quality',
 'Educational Leader to have minimum 2 hours dedicated off-floor time per week, working alongside the Nominated Supervisor and Operational Manager to uplift programming quality across all rooms. Build a resource folder for educators and develop structured mentoring support.',
 '{7}', '{7.2.2}',
 'The Educational Leader now has at least 2 hours of dedicated off-floor time per week.',
 false),

('d0000001-0000-0000-0000-000000000012', 'leadership_goal',
 'Individual performance conversations with every educator',
 'The Nominated Supervisor is rolling out individual performance conversations with each educator. Professional development goals set collaboratively. Monthly catch-ups extended beyond 5-10 minutes to meaningful professional discussions.',
 '{7}', '{7.2.3}',
 'The Nominated Supervisor is rolling out individual performance conversations with each educator. Professional development goals are being set collaboratively.',
 false),

('d0000001-0000-0000-0000-000000000012', 'leadership_goal',
 'CELA monthly tasks for leadership development',
 'Introduce CELA monthly tasks starting with the Nominated Supervisor, then cascading to the Educational Leader and Room Leaders. Provides structured, ongoing professional development aligned with NQS requirements.',
 '{7}', '{7.2.3}',
 'CELA monthly tasks are being introduced, starting with the NS and cascading to the Educational Leader and Room Leaders.',
 false),

('d0000001-0000-0000-0000-000000000012', 'leadership_goal',
 'Governance documentation and QIP as living documents',
 'Maintain the QIP as a living document with detailed actions, responsibilities, timeframes, success measures, and progress notes against every Standard and Element. Delegation of Authority, governance systems, and management processes documented and reviewed regularly.',
 '{7}', '{7.1.2,7.2.1}',
 'The QIP has been fully updated to incorporate every item. A detailed working document with actions, responsibilities, timeframes, and progress notes across all 7 QAs.',
 false),

('d0000001-0000-0000-0000-000000000012', 'leadership_goal',
 'Build service identity as new service on upward trajectory',
 'Position Kiros as a new service (opened December 2024) on a clear upward trajectory. Occupancy grown from 5% to 71%. Systems developed and uplifted proactively. Programming improvements commenced before assessment notification. Demonstrate continuous improvement trajectory to the panel.',
 '{7}', '{7.2.1}',
 'We are not a service that has been operating for years and allowed standards to slip. We are a service that has been building from zero.',
 false);
