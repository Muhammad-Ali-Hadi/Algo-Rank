-- ============================================
-- AlgoRank Schema (Direct DB Auth - No Supabase Auth)
-- Run this in your Supabase SQL Editor
-- ============================================

-- STEP 1: Drop everything and start fresh
drop policy if exists "Users can read own data" on public.users;
drop policy if exists "Anyone can lookup username" on public.users;
drop policy if exists "Users can update own data" on public.users;
drop policy if exists "Allow insert for authenticated users" on public.users;
drop policy if exists "Allow insert from trigger" on public.users;
drop policy if exists "service_role_insert" on public.users;
drop policy if exists "anon_insert" on public.users;
drop policy if exists "auth_insert" on public.users;
drop policy if exists "public_select" on public.users;
drop policy if exists "auth_update" on public.users;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.users cascade;

-- STEP 2: Create users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text unique not null,
  password text not null,
  name text,
  avatar_url text default '',
  created_at timestamp with time zone default now()
);

-- STEP 3: Disable RLS (our backend uses service_role key which bypasses RLS anyway)
alter table public.users disable row level security;

-- STEP 4: Grant access to service_role (used by our Express backend)
grant all on public.users to service_role;
grant select on public.users to anon;
grant select on public.users to authenticated;

-- ============================================
-- Contest System Tables (Sprint 2)
-- ============================================

-- Contests table
create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  type text not null check (type in ('global', 'local')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_seconds integer,
  creator_id uuid not null references public.users(id) on delete cascade,
  invite_code text unique,
  freeze_time timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Contest problems table
create table if not exists public.contest_problems (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  problem_title text not null,
  problem_url text default '',
  order_index integer default 0,
  scraped_content text,
  scraped_samples jsonb,
  scraped_at timestamp with time zone
);

-- Contest participants table
create table if not exists public.contest_participants (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(contest_id, user_id)
);

-- Submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  problem_id uuid not null references public.contest_problems(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  language text not null,
  code_text text default '',
  solution_url text default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'wrong_answer', 'time_limit', 'runtime_error', 'compile_error')),
  submitted_at timestamp with time zone default now()
);

-- Disable RLS for contest tables (backend uses service_role key)
alter table public.contests disable row level security;
alter table public.contest_problems disable row level security;
alter table public.contest_participants disable row level security;
alter table public.submissions disable row level security;

-- Grant access
grant all on public.contests to service_role;
grant all on public.contest_problems to service_role;
grant all on public.contest_participants to service_role;
grant all on public.submissions to service_role;
grant select on public.contests to anon;
grant select on public.contest_problems to anon;
grant select on public.contest_participants to anon;
grant select on public.submissions to anon;
grant select on public.contests to authenticated;
grant select on public.contest_problems to authenticated;
grant select on public.contest_participants to authenticated;
grant select on public.submissions to authenticated;

-- ============================================
-- Problem Bank & Test Cases Tables
-- ============================================

-- Problems table
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  time_limit integer default 1000, -- in milliseconds
  memory_limit integer default 256, -- in MB
  created_at timestamp with time zone default now()
);

-- TestCases table
create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  input text not null,
  expected_output text not null,
  is_hidden boolean default false,
  order_index integer default 0,
  created_at timestamp with time zone default now()
);

-- Disable RLS for problem bank tables (backend uses service_role key)
alter table public.problems disable row level security;
alter table public.test_cases disable row level security;

-- Grant access
grant all on public.problems to service_role;
grant all on public.test_cases to service_role;
grant select on public.problems to anon;
grant select on public.test_cases to anon;
grant select on public.problems to authenticated;
grant select on public.test_cases to authenticated;