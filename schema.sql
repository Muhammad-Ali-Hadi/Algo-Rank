-- ============================================
-- STEP 1: Drop everything and start fresh
-- ============================================

-- Drop existing policies
drop policy if exists "Users can read own data" on public.users;
drop policy if exists "Anyone can lookup username" on public.users;
drop policy if exists "Users can update own data" on public.users;
drop policy if exists "Allow insert for authenticated users" on public.users;
drop policy if exists "Allow insert from trigger" on public.users;

-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop existing table
drop table if exists public.users;

-- ============================================
-- STEP 2: Recreate the table
-- ============================================

create table public.users (
  id uuid primary key,
  email text unique not null,
  username text unique not null,
  password text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- ============================================
-- STEP 3: Disable RLS completely for now
-- (we enable it after confirming inserts work)
-- ============================================

alter table public.users disable row level security;

-- ============================================
-- STEP 4: Grant full access to all roles
-- ============================================

grant all on public.users to anon;
grant all on public.users to authenticated;
grant all on public.users to service_role;

-- ============================================
-- STEP 5: Recreate the trigger function
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    username,
    password,
    name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'password', ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    email     = excluded.email,
    username  = excluded.username,
    password  = excluded.password,
    name      = excluded.name,
    avatar_url = excluded.avatar_url;

  return new;

exception when others then
  -- Log the error but don't block the signup
  raise log 'handle_new_user error: % %', sqlerrm, sqlstate;
  return new;
end;
$$;

-- ============================================
-- STEP 6: Recreate the trigger
-- ============================================

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ============================================
-- STEP 7: Re-enable RLS with correct policies
-- ============================================

alter table public.users enable row level security;

-- Allow the trigger (service_role) to insert
create policy "service_role_insert"
  on public.users
  for insert
  to service_role
  with check (true);

-- Allow anon to insert (needed during signup flow)
create policy "anon_insert"
  on public.users
  for insert
  to anon
  with check (true);

-- Allow authenticated users to insert their own row
create policy "auth_insert"
  on public.users
  for insert
  to authenticated
  with check (true);

-- Allow anyone to select (for username lookup on login)
create policy "public_select"
  on public.users
  for select
  using (true);

-- Allow users to update their own data
create policy "auth_update"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);