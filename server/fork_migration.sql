-- ============================================
-- Fork Problem Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add creator_id to problems table (tracks who created/forked the problem)
ALTER TABLE public.problems 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Add forked_from_contest_problem to problems table (links fork to origin)
ALTER TABLE public.problems 
ADD COLUMN IF NOT EXISTS forked_from_contest_problem uuid REFERENCES public.contest_problems(id) ON DELETE SET NULL;

-- Index for efficient fork lookups (e.g. checking if user already forked)
CREATE INDEX IF NOT EXISTS idx_problems_forked_from_cp 
ON public.problems(forked_from_contest_problem) 
WHERE forked_from_contest_problem IS NOT NULL;

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_problems_creator 
ON public.problems(creator_id) 
WHERE creator_id IS NOT NULL;

-- Unique constraint: one fork per user per contest_problem
-- Prevents duplicate forks at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fork_per_user
ON public.problems(creator_id, forked_from_contest_problem)
WHERE forked_from_contest_problem IS NOT NULL AND creator_id IS NOT NULL;
