-- Global bug reports (not tied to a specific problem)
create table if not exists bug_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  description text not null,
  page_url    text,
  created_at  timestamptz not null default now()
);

alter table bug_reports enable row level security;

create policy bug_reports_insert_auth on bug_reports
  for insert to authenticated with check (auth.uid() = user_id);

create policy bug_reports_insert_anon on bug_reports
  for insert to anon with check (user_id is null);
