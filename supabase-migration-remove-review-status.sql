-- ============================================
-- MIGRATION: Remove "review" status from tasks
-- Run this in Supabase SQL Editor
-- ============================================

-- Move any existing "review" tasks to "in_progress"
UPDATE public.tasks SET status = 'in_progress' WHERE status = 'review';

-- Update the check constraint to remove "review"
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'done'));
