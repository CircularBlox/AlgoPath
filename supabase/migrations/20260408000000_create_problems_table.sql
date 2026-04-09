-- Create problems table for storing competitive programming problems
-- used as a pool for random selection in the AI hint system

create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  platform text not null default 'codeforces',
  difficulty text,
  tags text[] not null default '{}',
  content text,
  created_at timestamptz not null default now()
);

alter table problems enable row level security;

-- Anyone can read problems (public reference data)
create policy "problems_select_anon"
  on problems
  for select
  to anon
  using (true);

create policy "problems_select_authenticated"
  on problems
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies for anon or authenticated:
-- only the service role (admin) can write to this table.

-- Index for faster filtering by platform
create index if not exists problems_platform_idx on problems (platform);

-- Seed: Codeforces 2217/A — The Equalizer
insert into problems (title, url, platform, tags)
values (
  'The Equalizer',
  'https://codeforces.com/contest/2217/problem/A',
  'codeforces',
  array['games', 'math']
);
