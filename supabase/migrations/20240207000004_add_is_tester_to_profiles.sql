-- Add is_tester flag to profiles for beta/test users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_tester boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_tester IS 'When true, user is marked as a beta tester';
