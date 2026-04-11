-- Replace problem_id (UUID FK) with problem_name (text) on solutions and hints
-- Also make problem_number NOT NULL on both tables
-- Idempotent: handles any combination of prior migrations being applied or not

-- Ensure problem_number exists and is populated on problems (idempotent)
create sequence if not exists problems_problem_number_seq;
alter table problems add column if not exists problem_number integer;
update problems
  set problem_number = nextval('problems_problem_number_seq')
  where problem_number is null;

-- ── Solutions ────────────────────────────────────────────────────────────────

alter table solutions add column if not exists problem_name text;
alter table solutions add column if not exists problem_number integer;

-- Populate via problem_id FK if the column still exists
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'solutions' and column_name = 'problem_id'
  ) then
    update solutions s
      set
        problem_name   = coalesce(s.problem_name,   p.title),
        problem_number = coalesce(s.problem_number, p.problem_number)
      from problems p
      where s.problem_id = p.id;
  end if;
end $$;

-- Backfill any remaining nulls via problem_number join
update solutions s
  set problem_name = p.title
  from problems p
  where s.problem_number = p.problem_number
    and s.problem_name is null;

alter table solutions alter column problem_name   set not null;
alter table solutions alter column problem_number set not null;

alter table solutions drop column if exists problem_id;

create index if not exists solutions_problem_number_idx on solutions (problem_number);
create index if not exists solutions_problem_name_idx   on solutions (problem_name);

-- ── Hints ────────────────────────────────────────────────────────────────────

alter table hints add column if not exists problem_name text;
alter table hints add column if not exists problem_number integer;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'hints' and column_name = 'problem_id'
  ) then
    update hints h
      set
        problem_name   = coalesce(h.problem_name,   p.title),
        problem_number = coalesce(h.problem_number, p.problem_number)
      from problems p
      where h.problem_id = p.id;
  end if;
end $$;

update hints h
  set problem_name = p.title
  from problems p
  where h.problem_number = p.problem_number
    and h.problem_name is null;

alter table hints alter column problem_name   set not null;
alter table hints alter column problem_number set not null;

alter table hints drop column if exists problem_id;

create index if not exists hints_problem_number_idx on hints (problem_number);
create index if not exists hints_problem_name_idx   on hints (problem_name);
