-- Create hint_ratings table so users can rate individual hints thumbs up or down
-- One rating per user per problem per hint level; upsert-safe via unique constraint

create table if not exists hint_ratings (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  problem_number integer not null,
  hint_number    integer not null check (hint_number between 1 and 3),
  rating         text not null check (rating in ('up', 'down')),
  created_at     timestamptz not null default now(),
  unique (user_id, problem_number, hint_number)
);

alter table hint_ratings enable row level security;

-- Authenticated users can read their own ratings
create policy "hint_ratings_select_authenticated"
  on hint_ratings
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can insert their own ratings
create policy "hint_ratings_insert_authenticated"
  on hint_ratings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users can update their own ratings
create policy "hint_ratings_update_authenticated"
  on hint_ratings
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can delete their own ratings
create policy "hint_ratings_delete_authenticated"
  on hint_ratings
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Index for fast lookups by user and problem
create index if not exists hint_ratings_user_problem_idx
  on hint_ratings (user_id, problem_number);
