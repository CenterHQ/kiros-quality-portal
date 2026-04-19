-- ============================================
-- SEED: Comprehensive Element Actions for Meeting NQS
-- These are the minimum actions required for each Not Met element
-- ============================================

-- Helper: Get element IDs by code
-- QA1

-- Element 1.1.1 — Approved Learning Framework
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.1.1'), 'Ensure all program plans reference EYLF V2.0 outcomes', 'Every weekly/fortnightly program must explicitly link planned experiences to specific EYLF outcomes', '["Review current program template for EYLF outcome fields", "Add EYLF outcome column if missing", "Educators list specific sub-outcomes (e.g. 4.1, 5.2) not just broad outcomes", "Educational Leader reviews programs weekly to check EYLF links"]', 'Program plans with EYLF outcomes documented for each experience', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.1.1'), 'Place EYLF V2.0 reference sheets in every room', 'Laminated quick-reference sheets with the 5 outcomes, 8 practices, and 5 principles', '["Print and laminate EYLF reference sheets", "Place in each room at educator eye level", "Brief educators on how to use them during planning"]', 'Photo of EYLF reference sheets displayed in each room', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.1.1'), 'Conduct EYLF training session for all educators', 'Ensure all educators understand the framework and can articulate how it guides their practice', '["Schedule training session (use Training Module 4)", "Cover all 5 outcomes with examples", "Practice linking observations to specific outcomes", "Document attendance and completion"]', 'Training attendance record, educator reflections', 3),
((SELECT id FROM qa_elements WHERE element_code = '1.1.1'), 'Demonstrate EYLF-informed curriculum decisions in documentation', 'Programs must show how EYLF principles and practices inform what is planned', '["Include a Why section in programs linking to EYLF principles", "Reference Belonging Being Becoming in philosophy connections", "Show how practices like responsiveness and intentionality guide decisions"]', 'Program documentation showing EYLF-informed decisions', 4);

-- Element 1.1.2 — Child-centred
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.1.2'), 'Document children''s interests as starting points for planning', 'Each program cycle must begin with documented observations of children''s interests', '["Observe children during play and note interests", "Record interests in program What/Why sections", "Show clear link: Interest observed → Experience planned", "Include children''s names linked to interests"]', 'Programs showing interests as foundations for experiences', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.1.2'), 'Add Children''s Voice section to all program documentation', 'Capture and display children''s words, questions, and ideas', '["Add Children''s Voice section to program template", "Educators record direct quotes during play", "Display children''s quotes in room", "Use quotes to inform follow-up planning"]', 'Program documents with children''s voice section completed', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.1.2'), 'Collect and use Family Collaboration Sheets', 'Gather information from families about their child''s interests, culture, and goals', '["Distribute family collaboration sheets to all families", "Follow up with families who haven''t returned forms", "Incorporate family input into individual learning plans", "Document how family input influenced the program"]', 'Completed family collaboration sheets, program showing family input', 3),
((SELECT id FROM qa_elements WHERE element_code = '1.1.2'), 'Ensure each child''s cultural background is reflected in the program', 'Programs consider and incorporate children''s cultural contexts', '["Review enrolment forms for cultural information", "Discuss cultural practices with families", "Plan experiences that reflect diverse backgrounds", "Include culturally diverse resources in the environment"]', 'Programs referencing cultural backgrounds, diverse resources visible', 4);

-- Element 1.1.3 — Program learning opportunities
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.1.3'), 'Create a Routine Learning Map for each room', 'Document how every routine (mealtimes, transitions, rest, outdoor) maximises learning', '["List all daily routines for each room", "For each routine, document 3 learning opportunities", "Include in program documentation", "Train educators on routine-based learning"]', 'Routine Learning Maps displayed in each room', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.1.3'), 'Embed intentional learning in mealtimes', 'Use mealtimes for self-help skills, conversation, numeracy, social development', '["Educators sit with children during meals", "Use mealtime conversations intentionally", "Encourage self-serving and self-help skills", "Document mealtime learning in program reflections"]', 'Observations of mealtime learning, program references', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.1.3'), 'Use transitions as learning opportunities', 'Songs, movement, counting, language games during transitions', '["Develop a list of transition activities", "Educators use songs and games during pack-up, moving between spaces", "Vary transitions to maintain interest", "Reflect on which transitions work best"]', 'Educator records of transition activities used', 3);

-- Element 1.2.1 — Intentional teaching
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.2.1'), 'Document intentional teaching strategies in every program', 'Each planned experience must include specific teaching strategies', '["Add Intentional Teaching Strategies section to program template", "Educators write specific strategies (e.g. open-ended questions, modelling, scaffolding)", "Review strategies weekly with Educational Leader", "Reflect on effectiveness in weekly reflections"]', 'Programs with documented intentional teaching strategies', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.2.1'), 'Create daily intentional environment setups', 'Rooms arranged purposefully each morning with provocations linked to inquiry', '["Plan environment setup the day before or morning of", "Document why resources are positioned where they are", "Take photos of intentional setups", "Rotate and adapt based on children''s responses"]', 'Photos of intentional setups, setup plans', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.2.1'), 'Conduct intentional teaching training for all educators', 'Training Module 4: Understanding intentional teaching vs direct instruction', '["Schedule and deliver Training Module 4", "Practice open-ended questioning techniques", "Role-play intentional teaching scenarios", "Observe and coach educators on the floor"]', 'Training attendance, observation notes from coaching', 3);

-- Element 1.2.2 — Responsive teaching and scaffolding
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.2.2'), 'Train educators on sustained shared thinking', 'Educators learn to wonder alongside children and extend their ideas', '["Deliver sustained shared thinking component of Training Module 4", "Practice the 5 steps: Observe, Join, Wonder, Wait, Build", "Educators identify 2 sustained shared thinking moments per day", "Document examples in observations"]', 'Training record, documented sustained shared thinking examples', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.2.2'), 'Implement daily open-ended questioning practice', 'Every educator uses open-ended questions consistently throughout the day', '["Provide open-ended questions reference card for each room", "Educators practise generating questions for current inquiry", "Educational Leader models questioning on the floor", "Review questioning quality in weekly reflections"]', 'Reference cards in rooms, observations showing questioning', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.2.2'), 'Document responsive teaching in observations', 'Observations show how educators responded to and extended children''s learning', '["Include educator response/extension in observation format", "Document what the educator did to scaffold learning", "Link educator actions to child outcomes", "Review documentation quality with EL"]', 'Observations with documented responsive teaching', 3);

-- Element 1.2.3 — Child-directed learning
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.2.3'), 'Identify and implement 5 daily choice points per room', 'Children have genuine opportunities to make decisions throughout the day', '["Map the daily routine and identify where choices can be offered", "Create visual choice boards for activity selection", "Allow children to influence group time topics", "Document children''s choices and how they shaped the day"]', 'Visual choice boards in rooms, documented child choices', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.2.3'), 'Ensure open shelving and accessible materials in all rooms', 'Children can independently access resources without needing to ask', '["Audit each room for material accessibility", "Ensure all play materials at child height", "Label shelves with pictures for children", "Remove barriers to independent access"]', 'Photos of accessible environments, audit checklist', 2);

-- Element 1.3.1 — Assessment and planning cycle
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.3.1'), 'Implement complete planning cycle for EVERY child', 'Each child has: Observation → Analysis → Goals → Planning → Implementation → Reflection → Follow-up', '["Set up individual learning profile for each child", "Complete minimum 2 observations per child per fortnight", "Write analysis linking to EYLF outcomes", "Set individual learning goals", "Plan experiences targeting goals", "Reflect on outcomes and plan follow-up"]', 'Complete planning cycle documentation for each child', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.3.1'), 'Train all educators on the planning cycle', 'All educators understand and can implement the full cycle', '["Deliver Training Module 2: The Planning Cycle", "Walk through a complete cycle example as a team", "Each educator practices writing one full cycle", "EL reviews and provides feedback"]', 'Training attendance, sample planning cycles from each educator', 2),
((SELECT id FROM qa_elements WHERE element_code = '1.3.1'), 'Retain all documentation digitally and in hard copy', 'No more lost summaries — all records kept and accessible', '["Set up digital filing system (Playground/Xplor)", "Back up to service computer", "Keep hard copies in room folders", "Ensure all observations are saved, not deleted after sharing"]', 'Organised documentation system with retained records', 3);

-- Element 1.3.2 — Critical reflection
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.3.2'), 'Implement weekly critical reflection in every room', 'Documented reflections that go beyond surface level to examine assumptions and perspectives', '["Use the Weekly Critical Reflection template", "Complete every Friday for each room", "Reflections address: What worked? Why? What would we change? How does this inform next week?", "Include critical questions: Whose voice is missing? What assumptions are we making?", "EL reviews all reflections weekly"]', 'Completed weekly reflections for each room', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.3.2'), 'Link reflections directly to program changes', 'Documented evidence that reflections lead to actual changes in practice', '["In each week''s program, reference what changed based on last week''s reflection", "Document the link: Reflection said X → This week we changed Y", "Review whether changes improved outcomes"]', 'Programs showing changes driven by reflections', 2);

-- Element 1.3.3 — Information for families
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '1.3.3'), 'Establish regular family communication schedule', 'Consistent updates via multiple channels', '["Post minimum 3 learning stories per room per week on Playground app", "Send fortnightly newsletter", "Display current program in each room foyer area", "Update family noticeboard weekly"]', 'Playground app post history, newsletters, displayed programs', 1),
((SELECT id FROM qa_elements WHERE element_code = '1.3.3'), 'Schedule formal parent-educator meetings', 'Twice yearly formal discussions about each child''s progress and goals', '["Send meeting invitations to all families", "Prepare individual child progress summaries", "Use family collaboration sheets to guide discussion", "Document meeting outcomes and agreed goals"]', 'Meeting schedule, completed meeting records', 2);

-- QA2

-- Element 2.1.2 — Health practices
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '2.1.2'), 'Reinforce handwashing protocols across all rooms', 'Active monitoring of handwashing at all required times, not just mealtimes', '["Display visual handwashing procedures at every sink", "Train all educators on when handwashing is required", "Educators actively supervise and prompt children", "Include handwashing compliance in daily checklists"]', 'Visual displays, completed checklists, training record', 1),
((SELECT id FROM qa_elements WHERE element_code = '2.1.2'), 'Conduct food safety refresher training', 'All staff handling food understand safe food handling requirements', '["Deliver health and hygiene training (Module 5)", "Review food temperature checking procedures", "Ensure glove use during food preparation", "Appoint or recruit dedicated kitchen hand"]', 'Training record, food safety procedures documented', 2);

-- Element 2.1.3 — Healthy lifestyle
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '2.1.3'), 'Implement structured daily physical activity program', 'Planned FMS activities aligned with Munch & Move guidelines', '["Plan daily indoor and outdoor physical activities in program", "Include fundamental movement skills: running, jumping, balancing, throwing, catching", "Reference Munch & Move guidelines", "Document physical activities in daily program"]', 'Program plans with FMS activities documented', 1);

-- Element 2.2.1 — Supervision
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '2.2.1'), 'Review and enforce supervision practices', 'All children visible and accounted for at all times', '["Review room layouts for sight line gaps", "Adjust furniture placement so sleeping children are visible", "Ensure nappy changes are covered by second educator", "Conduct supervision audit weekly", "Discuss supervision in team meetings"]', 'Updated room layouts, supervision audit records', 1);

-- Element 2.2.2 — Emergency management
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '2.2.2'), 'Bring emergency drills to compliance', 'Evacuation AND lockdown every 3 months, documented with reflections', '["Set strict calendar: drills on [specific dates] every quarter", "Conduct drill and document: date, time, duration, children, staff", "Complete reflection template after each drill", "Action improvements identified in reflections", "Verify previous improvements were implemented"]', 'Drill records with dates, reflection templates, evidence of actioned improvements', 1),
((SELECT id FROM qa_elements WHERE element_code = '2.2.2'), 'Date and review Potential Emergency Risk Assessment', 'Document must be dated with annual review schedule', '["Date the current risk assessment", "Review content for accuracy and completeness", "Set next annual review date", "Sign off by NS and AP"]', 'Dated and signed risk assessment', 2);

-- Element 2.2.3 — Child safety and protection
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '2.2.3'), 'Deliver comprehensive child protection training to ALL staff', 'Every educator must be able to explain mandatory reporting and Reportable Conduct Scheme', '["Schedule and deliver Training Module 3", "Cover: mandatory reporting obligations, Child Protection Helpline (132 111)", "Cover: Reportable Conduct Scheme — what it is, types, timeframes, reporting to Children''s Guardian", "Practical scenarios and knowledge checks", "Document attendance and assessment results"]', 'Training attendance record, knowledge check results for each educator', 1),
((SELECT id FROM qa_elements WHERE element_code = '2.2.3'), 'Conduct child protection knowledge assessment for all staff', 'Every educator individually assessed — can they explain the key concepts?', '["Ask each educator the 3 key questions (see Operations Guide)", "Document responses", "Re-train any educator who cannot answer correctly", "Schedule 6-monthly refresher"]', 'Individual assessment records for each educator', 2);

-- QA3

-- Element 3.2.1 — Inclusive environment
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '3.2.1'), 'Set up calm-down/quiet spaces in toddler and preschool rooms', 'Soft furnishings and sensory resources for regulation and reflection', '["Source soft cushions, bean bags, or floor pillows", "Add sensory bottles, breathing charts, feelings posters", "Position in quiet corner visible to educators", "Introduce to children — explain this is a choice, not punishment"]', 'Photos of calm-down spaces in each room', 1),
((SELECT id FROM qa_elements WHERE element_code = '3.2.1'), 'Create daily intentional environment setup plans', 'Document why environments are arranged the way they are', '["Educators plan morning setup the day before", "Document on setup plan: What resources? Why? Linked to what interest/inquiry?", "Review and adapt throughout the day based on children''s responses", "Reflect on setup effectiveness in weekly reflection"]', 'Setup plans, photos of intentional environments', 2),
((SELECT id FROM qa_elements WHERE element_code = '3.2.1'), 'Make cultural resources visible and accessible', 'Resources reflecting diversity should be in the environment, not stored in cupboards', '["Audit current resources for cultural diversity", "Move cultural books, dolls, materials to open shelving", "Source additional culturally diverse resources if needed", "Rotate regularly and respond to families'' cultural backgrounds"]', 'Photos of culturally diverse resources visible in rooms', 3);

-- Element 3.2.3 — Environmentally responsible
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '3.2.3'), 'Place recycling, compost, and rubbish bins in each room', 'Children sort waste with educator support', '["Purchase and label 3 bins per room (recycling, compost, rubbish)", "Introduce sorting to children through a planned experience", "Educators guide children during mealtimes and activities", "Include sustainability in program documentation"]', 'Photos of bins in each room, documented sorting experiences', 1),
((SELECT id FROM qa_elements WHERE element_code = '3.2.3'), 'Train educators to use nature encounters as learning moments', 'Insects, weather, plants — all opportunities for inquiry, not dismissal', '["Discuss the spider incident from A&R as a learning example", "Develop a list of responses to common nature encounters", "Plan nature-based experiences in program", "Start or maintain a garden project"]', 'Training discussion record, nature-based experiences in program', 2);

-- QA4

-- Element 4.2.1 — Professional collaboration
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '4.2.1'), 'Establish monthly team meetings with structured agenda', 'Regular documented meetings discussing children''s learning, not just operations', '["Set fixed monthly meeting date", "Use Team Meeting Minutes template", "Agenda must include: children''s learning, program review, reflections, PD, family engagement", "All educators sign attendance", "Document discussions, decisions, and actions"]', 'Meeting minutes with structured content, attendance records', 1),
((SELECT id FROM qa_elements WHERE element_code = '4.2.1'), 'Customise staff handbook with Kiros-specific information', 'Replace generic template with service-specific content', '["Add service name, philosophy, operational details", "Include management structure and roles", "Add licensing details, platforms (Playground, Xplor, 1Place)", "Include room-specific information", "Distribute updated version to all staff"]', 'Customised staff handbook', 2);

-- Element 4.2.2 — Professional standards
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '4.2.2'), 'Create professional development plans for each educator', 'Individual PD plans linked to service priorities and personal goals', '["Meet with each educator to discuss strengths and growth areas", "Set 2-3 professional goals per educator", "Link goals to service priorities (e.g. positive interactions, planning cycle)", "Identify PD opportunities for each goal", "Schedule quarterly review of progress"]', 'Individual PD plans for each educator', 1),
((SELECT id FROM qa_elements WHERE element_code = '4.2.2'), 'Implement documented mentoring and coaching', 'Educational Leader and NS provide coaching with records', '["EL schedules weekly on-floor coaching time", "Document: date, educator, focus area, feedback given, follow-up", "NS conducts quarterly performance catch-ups", "Use Performance Review template"]', 'Coaching logs, completed performance reviews', 2);

-- QA5

-- Element 5.1.1 — Positive interactions
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '5.1.1'), 'Deliver positive interactions training to ALL educators', 'PRIORITY — Training Module 1 on language, Reg 155, co-regulation', '["Schedule and deliver Training Module 1 (2 hours)", "Cover Reg 155 requirements", "Review the alternative language guide with specific examples", "Practice scenarios as a group", "Every educator signs acknowledgement of expectations"]', 'Training attendance, signed acknowledgement forms', 1),
((SELECT id FROM qa_elements WHERE element_code = '5.1.1'), 'Display alternative language guide in each room', 'Educators have a quick reference for positive language alternatives', '["Print and laminate the alternative language table from Training Module 1", "Display in staff area of each room", "Educators refer to it when unsure", "Review and discuss in team meetings"]', 'Photos of language guides displayed', 2),
((SELECT id FROM qa_elements WHERE element_code = '5.1.1'), 'Conduct regular interaction quality observations', 'NS and EL observe educator interactions and provide feedback', '["Observe each educator for 30 mins per fortnight", "Document positive interactions observed", "Note any interactions needing improvement", "Provide private, constructive feedback same day", "Follow up on previous feedback"]', 'Observation records, feedback documentation', 3);

-- Element 5.1.2 — Dignity and rights
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '5.1.2'), 'Review and reinforce children''s rights with all educators', 'Every educator understands what maintaining dignity looks like in practice', '["Discuss UN Convention on the Rights of the Child", "Define what dignity means for infants, toddlers, preschoolers", "Identify practices that uphold vs undermine dignity", "Commit to specific dignity-upholding practices"]', 'Discussion record, educator commitment statements', 1);

-- Element 5.2.1 — Collaborative learning
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '5.2.1'), 'Plan minimum 3 collaborative learning experiences per room per week', 'Intentional group activities promoting teamwork and cooperation', '["Educators plan collaborative experiences in weekly program", "Include: group projects, cooperative games, shared investigations", "Educators facilitate (not direct) collaboration", "Document children''s collaborative behaviours in observations"]', 'Programs with collaborative experiences, observations of collaboration', 1);

-- Element 5.2.2 — Self-regulation
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '5.2.2'), 'Train educators on self-regulation and co-regulation strategies', 'Educators replace directive approaches with supportive strategies', '["Deliver self-regulation component of Training Module 1", "Cover co-regulation steps, emotion naming, conflict resolution modelling", "Practice scenarios", "Introduce calm-down space protocols"]', 'Training attendance, scenario practice documentation', 1),
((SELECT id FROM qa_elements WHERE element_code = '5.2.2'), 'Review and fix behaviour guidance documentation', 'Remove speculative language, record observable facts only', '["Review existing behaviour reports for speculative interpretations", "Retrain educators on objective documentation", "Behaviour records must include: observable trigger, observable behaviour, strategy used, outcome, follow-up", "No interpretations like ''targeted aggression'' or ''impulse control'' without professional diagnosis"]', 'Updated behaviour documentation templates, reviewed reports', 2);

-- QA6

-- Element 6.1.1 — Engagement with the service
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.1.1'), 'Implement regular family communication channels', 'Multiple consistent channels — app, newsletter, displays', '["Post minimum 3 learning stories per room per week on Playground", "Send fortnightly newsletter (digital or print)", "Update family noticeboard weekly", "Display current programs in foyer area of each room"]', 'App post history, newsletters, photos of displays', 1),
((SELECT id FROM qa_elements WHERE element_code = '6.1.1'), 'Distribute and analyse family satisfaction surveys', 'Gather formal feedback from current families', '["Print and distribute Family Satisfaction Survey to all families", "Set 2-week return deadline", "Analyse results", "Share summary with team", "Document actions taken based on feedback"]', 'Completed surveys, analysis summary, documented actions', 2);

-- Element 6.1.2 — Parents views respected
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.1.2'), 'Schedule and conduct formal parent-educator meetings', 'Structured discussions about each child''s learning and goals', '["Send meeting invitations with available times", "Prepare individual progress summaries", "Use meeting to gather family input on goals", "Document meeting outcomes", "Incorporate agreed goals into learning plans"]', 'Meeting records, updated learning plans with family input', 1);

-- Element 6.1.3 — Families are supported
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.1.3'), 'Create community resources information board', 'Display information about local support services in the foyer', '["Research local community services (health, parenting, family support)", "Create a noticeboard with information and contact details", "Include The Hive partnership, DCJ Family Referral Service, local library", "Update quarterly"]', 'Photo of community resources board', 1);

-- Element 6.2.1 — Transitions
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.2.1'), 'Develop and implement transition procedures', 'Documented processes for enrolment, room-to-room, and school transitions', '["Write transition policy covering all transition types", "Create transition summary template for room moves", "Plan school transition activities for preschool children", "Share transition information with receiving schools/rooms"]', 'Transition policy, completed transition summaries', 1);

-- Element 6.2.2 — Access and participation
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.2.2'), 'Develop individualised support plans for children with additional needs', 'Documented strategies in collaboration with families and allied health', '["Identify all children requiring additional support", "Meet with families to discuss needs and strategies", "Collaborate with allied health professionals", "Document strategies in an individualised support plan", "Review plan regularly and adjust as needed"]', 'Individualised support plans, allied health correspondence', 1),
((SELECT id FROM qa_elements WHERE element_code = '6.2.2'), 'Apply for Inclusion Support Program (ISP) funding', 'Access funded support through the Inclusion Agency', '["Contact NSW/ACT Inclusion Agency", "Complete ISP funding application", "Implement recommended strategies", "Document outcomes"]', 'ISP application, Inclusion Agency correspondence', 2);

-- Element 6.2.3 — Community engagement
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '6.2.3'), 'Establish minimum 2 community partnerships', 'Formal connections with local organisations', '["Contact local library about visits or partnership", "Explore partnerships with community health services", "Investigate cultural organisations for collaboration", "Document partnerships and activities"]', 'Partnership correspondence, documented community activities', 1);

-- QA7

-- Element 7.1.1 — Philosophy
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.1.1'), 'Conduct philosophy review with input from all stakeholders', 'Active consultation with families, educators, children, and community', '["Send philosophy review survey to families", "Discuss philosophy at team meeting — gather educator input", "Document children''s perspectives on what makes a good place to learn", "Compile feedback and review philosophy", "Update philosophy based on input", "Display updated philosophy prominently"]', 'Survey results, meeting minutes, children''s input documentation, updated philosophy', 1);

-- Element 7.1.2 — Management systems
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.1.2'), 'Create formal induction process for casual educators', 'Every casual completes documented induction before working with children', '["Develop casual induction checklist (use template from Forms)", "Cover: philosophy, child protection, Reg 155, supervision, emergency procedures, hygiene", "Both casual and inducting person sign", "Keep records filed"]', 'Completed induction checklists for all casuals', 1),
((SELECT id FROM qa_elements WHERE element_code = '7.1.2'), 'Display correct compliance history at main entrance', 'Download current document from NSW Early Learning Commission', '["Go to ELC website and download short-form compliance history", "Print and display at main entrance", "Remove old/incorrect document"]', 'Photo of correct compliance history displayed', 2),
((SELECT id FROM qa_elements WHERE element_code = '7.1.2'), 'Establish internal policy review schedule', 'Documented schedule separate from external consultancy reviews', '["Create annual policy review calendar", "Assign policies to review each month", "NS reads and reviews policies against practice", "Document review date, reviewer, any changes made", "Communicate changes to educators"]', 'Policy review schedule, documented review records', 3);

-- Element 7.1.3 — Roles and responsibilities
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.1.3'), 'Document clear role descriptions and delegation', 'Every position has a written description, staff understand reporting lines', '["Write/update position descriptions for all roles", "Update Delegation of Authority document for new NS", "Discuss roles and responsibilities at team meeting", "Ensure all staff know who to go to for what"]', 'Position descriptions, updated delegation document', 1);

-- Element 7.2.1 — Continuous improvement
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.2.1'), 'Update QIP with SMART actions and track progress', 'QIP is a living document with specific, measurable, time-bound actions', '["Review current QIP", "Add specific actions for each identified area (use this portal as the source)", "Set due dates and responsible persons", "Review progress monthly", "Document progress and adjustments"]', 'Updated QIP with dated progress entries', 1);

-- Element 7.2.2 — Educational leadership
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.2.2'), 'Allocate consistent weekly off-floor time for Educational Leader', 'Dedicated time for mentoring, coaching, and pedagogical leadership', '["Set fixed weekly EL off-floor time in roster (minimum 2 hours)", "EL uses time for: room observations, educator coaching, program review, resource development", "Document what was done during off-floor time", "EL maintains an Educational Leader report"]', 'Roster showing EL time, EL report entries', 1),
((SELECT id FROM qa_elements WHERE element_code = '7.2.2'), 'Develop structured Educational Leadership plan', 'Document how EL will support educators and drive pedagogical improvement', '["EL writes a term plan: focus areas, goals, strategies", "Include targeted support for each room", "Link to service priorities from A&R findings", "Review plan monthly with NS/Ops Manager"]', 'Educational Leadership plan document', 2);

-- Element 7.2.3 — Development of professionals
INSERT INTO public.element_actions (element_id, title, description, steps, evidence_required, sort_order) VALUES
((SELECT id FROM qa_elements WHERE element_code = '7.2.3'), 'Implement quarterly performance review process', 'Regular documented reviews for all educators', '["Schedule quarterly catch-ups with each educator", "Use Performance Review template", "Discuss progress against PD goals", "Identify new PD needs", "Document outcomes and next steps"]', 'Completed performance review records for each educator', 1),
((SELECT id FROM qa_elements WHERE element_code = '7.2.3'), 'Schedule and deliver all 8 training modules', 'Complete the full training program over 4-6 weeks', '["Create training delivery schedule", "Deliver modules in priority order (Module 1 first)", "Document attendance for each module", "Assess understanding through knowledge checks", "Follow up with educators who missed sessions"]', 'Training schedule, attendance records for all 8 modules', 2);
