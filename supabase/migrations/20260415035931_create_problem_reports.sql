-- Create problem_reports table for user-submitted problem reports
-- Admins can view all reports, mark them done with a recommended difficulty, or reject them.

create table if not exists problem_reports (
  id uuid primary key default gen_random_uuid(),
  problem_number integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  status text not null default 'pending',
  recommended_difficulty text,
  created_at timestamptz not null default now()
);

alter table problem_reports enable row level security;

-- Authenticated users can submit reports
create policy "reports_insert_authenticated"
  on problem_reports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can read their own reports
create policy "reports_select_own"
  on problem_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Indexes for anti-spam checks and admin listing
create index if not exists reports_user_created_idx on problem_reports (user_id, created_at);
create index if not exists reports_user_problem_idx on problem_reports (user_id, problem_number);
create index if not exists reports_status_idx on problem_reports (status, created_at desc);
