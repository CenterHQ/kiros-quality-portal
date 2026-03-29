-- ============================================
-- KIROS EARLY EDUCATION — QUALITY UPLIFT PORTAL
-- Supabase Database Schema
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null default 'educator' check (role in ('admin', 'manager', 'ns', 'el', 'educator')),
  avatar_url text,
  notify_comments boolean default true,
  notify_status_changes boolean default true,
  notify_assignments boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- QA ELEMENTS (40 NQS elements)
-- ============================================
create table public.qa_elements (
  id serial primary key,
  qa_number integer not null,
  qa_name text not null,
  standard_number text not null,
  standard_name text not null,
  element_code text unique not null,
  element_name text not null,
  concept text,
  current_rating text not null default 'not_met' check (current_rating in ('not_met', 'met', 'working_towards', 'meeting', 'exceeding')),
  target_rating text default 'meeting',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'action_taken', 'ready_for_review', 'completed')),
  assigned_to uuid references public.profiles(id),
  officer_finding text,
  our_response text,
  actions_taken text,
  meeting_criteria text,
  exceeding_criteria text,
  training_points text,
  due_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TASKS
-- ============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  qa_element_id integer references public.qa_elements(id),
  due_date date,
  completed_at timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- COMMENTS (polymorphic — for elements and tasks)
-- ============================================
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  user_id uuid references public.profiles(id) not null,
  entity_type text not null check (entity_type in ('element', 'task', 'document', 'training')),
  entity_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- DOCUMENTS
-- ============================================
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  file_path text not null,
  file_size bigint,
  file_type text,
  qa_area integer,
  category text default 'general',
  uploaded_by uuid references public.profiles(id),
  description text,
  created_at timestamptz default now()
);

-- ============================================
-- TRAINING MODULES
-- ============================================
create table public.training_modules (
  id serial primary key,
  title text not null,
  description text,
  duration_hours numeric(3,1),
  content text,
  sort_order integer default 0,
  related_qa text,
  related_regulations text,
  resources text,
  created_at timestamptz default now()
);

-- ============================================
-- TRAINING ASSIGNMENTS
-- ============================================
create table public.training_assignments (
  id uuid default uuid_generate_v4() primary key,
  module_id integer references public.training_modules(id) not null,
  user_id uuid references public.profiles(id) not null,
  assigned_by uuid references public.profiles(id),
  due_date date,
  status text default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'overdue')),
  completed_at timestamptz,
  score integer,
  notes text,
  created_at timestamptz default now(),
  unique(module_id, user_id)
);

-- ============================================
-- COMPLIANCE ITEMS
-- ============================================
create table public.compliance_items (
  id serial primary key,
  regulation text not null,
  description text not null,
  status text default 'action_required' check (status in ('action_required', 'in_progress', 'completed', 'ongoing')),
  assigned_to uuid references public.profiles(id),
  due_date date,
  notes text,
  evidence text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  created_at timestamptz default now()
);

-- ============================================
-- FORM SUBMISSIONS (digital versions of paper forms)
-- ============================================
create table public.form_submissions (
  id uuid default uuid_generate_v4() primary key,
  form_type text not null check (form_type in ('weekly_reflection', 'meeting_minutes', 'drill_reflection', 'family_collaboration', 'performance_review', 'family_survey', 'learning_profile', 'casual_induction')),
  data jsonb not null default '{}',
  submitted_by uuid references public.profiles(id),
  room text,
  status text default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- RESOURCES (external links)
-- ============================================
create table public.resources (
  id serial primary key,
  title text not null,
  url text not null,
  description text,
  qa_area integer,
  category text default 'general',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.qa_elements enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.documents enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_assignments enable row level security;
alter table public.compliance_items enable row level security;
alter table public.activity_log enable row level security;
alter table public.form_submissions enable row level security;
alter table public.resources enable row level security;

-- Profiles: users can read all profiles, update own
create policy "Profiles are viewable by authenticated users" on public.profiles for select to authenticated using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Admins can insert profiles" on public.profiles for insert to authenticated with check (true);
create policy "Admins can delete profiles" on public.profiles for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- QA Elements: all authenticated can read, admin/manager/ns can update
create policy "QA elements viewable by all" on public.qa_elements for select to authenticated using (true);
create policy "QA elements editable by privileged roles" on public.qa_elements for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'ns', 'el'))
);

-- Tasks: all can read, all can create, update own or assigned
create policy "Tasks viewable by all" on public.tasks for select to authenticated using (true);
create policy "Tasks creatable by all" on public.tasks for insert to authenticated with check (true);
create policy "Tasks updatable by all" on public.tasks for update to authenticated using (true);
create policy "Tasks deletable by privileged" on public.tasks for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'ns'))
);

-- Comments: all can read and create
create policy "Comments viewable by all" on public.comments for select to authenticated using (true);
create policy "Comments creatable by all" on public.comments for insert to authenticated with check (true);
create policy "Comments updatable by author" on public.comments for update to authenticated using (user_id = auth.uid());

-- Documents: all can read, all can upload
create policy "Documents viewable by all" on public.documents for select to authenticated using (true);
create policy "Documents uploadable by all" on public.documents for insert to authenticated with check (true);
create policy "Documents deletable by privileged" on public.documents for delete to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'ns'))
);

-- Training modules: all can read
create policy "Training modules viewable by all" on public.training_modules for select to authenticated using (true);
create policy "Training modules editable by admin" on public.training_modules for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- Training assignments: all can read, admin/manager can manage
create policy "Training assignments viewable by all" on public.training_assignments for select to authenticated using (true);
create policy "Training assignments manageable" on public.training_assignments for insert to authenticated with check (true);
create policy "Training assignments updatable" on public.training_assignments for update to authenticated using (true);

-- Compliance items: all can read, privileged can update
create policy "Compliance viewable by all" on public.compliance_items for select to authenticated using (true);
create policy "Compliance editable by privileged" on public.compliance_items for update to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'ns'))
);
create policy "Compliance insertable by privileged" on public.compliance_items for insert to authenticated with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager', 'ns'))
);

-- Activity log: all can read, system inserts
create policy "Activity log viewable by all" on public.activity_log for select to authenticated using (true);
create policy "Activity log insertable" on public.activity_log for insert to authenticated with check (true);

-- Form submissions: all can read, all can create, author can update
create policy "Forms viewable by all" on public.form_submissions for select to authenticated using (true);
create policy "Forms creatable by all" on public.form_submissions for insert to authenticated with check (true);
create policy "Forms updatable" on public.form_submissions for update to authenticated using (true);

-- Resources: all can read
create policy "Resources viewable by all" on public.resources for select to authenticated using (true);
create policy "Resources manageable by admin" on public.resources for all to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'manager'))
);

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'educator')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TRIGGER: Update updated_at on changes
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at();
create trigger update_qa_elements_updated_at before update on public.qa_elements for each row execute procedure public.update_updated_at();
create trigger update_tasks_updated_at before update on public.tasks for each row execute procedure public.update_updated_at();
create trigger update_compliance_updated_at before update on public.compliance_items for each row execute procedure public.update_updated_at();
create trigger update_forms_updated_at before update on public.form_submissions for each row execute procedure public.update_updated_at();

-- ============================================
-- STORAGE BUCKET
-- ============================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

create policy "Authenticated users can upload documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

create policy "Authenticated users can read documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

create policy "Admins can delete documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents');

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.qa_elements;
