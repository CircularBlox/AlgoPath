-- Add monetization plan column and hint session tracking
--
-- profiles.plan  — 'free' | 'pro' | 'elite'; defaults to 'free'
-- hint_sessions  — one row per (user, problem, date) to enforce the
--                  3-session/day free-tier cap without double-counting
--                  when the same problem is opened more than once.

alter table profiles
  add column if not exists plan text not null default 'free';

create table if not exists hint_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  problem_number int  not null,
  session_date   date not null default current_date,
  created_at     timestamptz not null default now(),
  unique (user_id, problem_number, session_date)
);

create index if not exists idx_hint_sessions_user_date
  on hint_sessions(user_id, session_date);

alter table hint_sessions enable row level security;

create policy "hint_sessions_select_own"
  on hint_sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "hint_sessions_insert_own"
  on hint_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);
