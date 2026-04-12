-- Add problem_number to solution_codes for direct filtering without joining solutions

alter table solution_codes add column if not exists problem_number integer;

-- Backfill from solutions join
update solution_codes sc
  set problem_number = s.problem_number
  from solutions s
  where sc.solution_id = s.id
    and sc.problem_number is null;

create index if not exists solution_codes_problem_number_idx
  on solution_codes (problem_number);
