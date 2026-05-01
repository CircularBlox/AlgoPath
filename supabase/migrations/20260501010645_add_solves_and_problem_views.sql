-- Detailed solve log: one row per solve event
create table if not exists solves (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  problem_number integer     not null,
  xp_gained      integer     not null default 0,
  hints_used     integer     not null default 0,
  solved_at      timestamptz not null default now()
);

alter table solves enable row level security;

create policy solves_select_authenticated
  on solves for select to authenticated
  using (auth.uid() = user_id);

create policy solves_insert_authenticated
  on solves for insert to authenticated
  with check (auth.uid() = user_id);

create index if not exists solves_user_solved_at_idx
  on solves (user_id, solved_at desc);

create index if not exists solves_user_problem_idx
  on solves (user_id, problem_number);

-- Per-problem view tracking: one row per (user, problem) pair
create table if not exists problem_views (
  user_id         uuid        not null references auth.users(id) on delete cascade,
  problem_number  integer     not null,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  view_count      integer     not null default 1,
  primary key (user_id, problem_number)
);

alter table problem_views enable row level security;

create policy problem_views_select_authenticated
  on problem_views for select to authenticated
  using (auth.uid() = user_id);

create policy problem_views_insert_authenticated
  on problem_views for insert to authenticated
  with check (auth.uid() = user_id);

create policy problem_views_update_authenticated
  on problem_views for update to authenticated
  using (auth.uid() = user_id);

create index if not exists problem_views_user_last_viewed_idx
  on problem_views (user_id, last_viewed_at desc);
