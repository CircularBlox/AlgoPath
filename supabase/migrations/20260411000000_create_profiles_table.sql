-- Create profiles table linked to Supabase Auth users
-- Tracks rating, skill level, and ordered solved-problem history

create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  rating          integer not null default 1200,
  skill_level     text not null default 'intermediate',
  avatar_url      text,
  bio             text,
  solved_problems integer[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table profiles enable row level security;

-- Any authenticated user can read all profiles (public profiles)
do $$ begin
  create policy "profiles_select_authenticated"
    on profiles for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Users can only insert their own profile
do $$ begin
  create policy "profiles_insert_authenticated"
    on profiles for insert to authenticated with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Users can only update their own profile
do $$ begin
  create policy "profiles_update_authenticated"
    on profiles for update to authenticated using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Users can only delete their own profile
do $$ begin
  create policy "profiles_delete_authenticated"
    on profiles for delete to authenticated using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- GIN index for array containment queries on solved_problems
create index if not exists profiles_solved_problems_gin_idx
  on profiles using gin(solved_problems);
