-- Add problem_number to hints table for easy identification
-- Backfill from the problems join

alter table hints
  add column if not exists problem_number integer;

update hints h
  set problem_number = p.problem_number
  from problems p
  where h.problem_id = p.id;

alter table hints
  alter column problem_number set not null;

create index if not exists hints_problem_number_idx on hints (problem_number);
