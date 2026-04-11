-- Create solutions table with problem_number for easy identification
-- Idempotent: handles the case where the table was created by a prior migration

create table if not exists solutions (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references problems(id) on delete cascade,
  problem_number integer,
  language text not null default 'cpp',
  solution_code text,
  explanation text,
  created_at timestamptz not null default now()
);

-- Add problem_number if the table was created without it
alter table solutions add column if not exists problem_number integer;

alter table solutions enable row level security;

do $$ begin
  create policy "solutions_select_anon"
    on solutions for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "solutions_select_authenticated"
    on solutions for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

create index if not exists solutions_problem_id_idx on solutions (problem_id);
create index if not exists solutions_problem_number_idx on solutions (problem_number);

-- Backfill problem_number from problems join
update solutions s
  set problem_number = p.problem_number
  from problems p
  where s.problem_id = p.id
    and s.problem_number is null;

-- Seed blank solution for The Equalizer if not already present
insert into solutions (problem_id, problem_number, language)
select p.id, p.problem_number, 'cpp' from problems p
where p.url = 'https://codeforces.com/contest/2217/problem/A'
  and not exists (select 1 from solutions s where s.problem_id = p.id);
