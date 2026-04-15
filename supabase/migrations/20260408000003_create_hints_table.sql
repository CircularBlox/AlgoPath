-- Create hints table for storing AI-generated progressive hints per problem
-- Only service role can write; anon and authenticated can read

create table if not exists hints (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  hint_1 text,
  hint_2 text,
  hint_3 text,
  created_at timestamptz not null default now()
);

alter table hints enable row level security;

create policy "hints_select_anon"
  on hints
  for select
  to anon
  using (true);

create policy "hints_select_authenticated"
  on hints
  for select
  to authenticated
  using (true);

-- Index for FK lookups
create index if not exists hints_problem_id_idx on hints (problem_id);

-- Blank seed for The Equalizer (Codeforces 2217/A)
insert into hints (problem_id)
select id from problems
where url = 'https://codeforces.com/contest/2217/problem/A';
