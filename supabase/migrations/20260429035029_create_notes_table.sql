-- Create notes table for user-authored notes, optionally linked to a problem

create table if not exists notes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null default 'Untitled',
  content        text not null default '',
  problem_number integer references problems(problem_number) on delete set null,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table notes enable row level security;

create policy "notes_select_authenticated"
  on notes for select to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_authenticated"
  on notes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_authenticated"
  on notes for update to authenticated
  using (auth.uid() = user_id);

create policy "notes_delete_authenticated"
  on notes for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists notes_user_id_updated_idx
  on notes (user_id, updated_at desc);
