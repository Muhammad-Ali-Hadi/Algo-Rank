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
drop table if exists public.users;

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