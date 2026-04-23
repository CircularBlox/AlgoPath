-- code_reviews: tracks AI code review requests for rate limiting
create table if not exists code_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  problem_number integer not null,
  created_at timestamptz not null default now()
);

alter table code_reviews enable row level security;

create policy "authenticated users can select own code reviews"
  on code_reviews for select to authenticated
  using (auth.uid() = user_id);

create policy "authenticated users can insert own code reviews"
  on code_reviews for insert to authenticated
  with check (auth.uid() = user_id);

-- Index for per-user rate limit queries (ordered by time desc)
create index if not exists code_reviews_user_created_idx
  on code_reviews (user_id, created_at desc);
