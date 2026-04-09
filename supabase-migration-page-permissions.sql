-- Migration: Add page-level permissions to profiles
-- allowed_pages: array of page paths a user can access
-- NULL means all pages (backward compatible - existing users keep full access)
-- Admins always have full access regardless of this column

ALTER TABLE public.profiles
ADD COLUMN allowed_pages text[] DEFAULT NULL;

COMMENT ON COLUMN public.profiles.allowed_pages IS 'Array of allowed page paths (e.g. /dashboard, /reports). NULL = all pages allowed.';
