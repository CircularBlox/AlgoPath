-- Add sequential problem_number to problems table
-- Enable pg_trgm for fast fuzzy title search and closest-match ordering

create extension if not exists pg_trgm;

-- Add problem_number via a dedicated sequence
create sequence if not exists problems_problem_number_seq;

alter table problems
  add column if not exists problem_number integer;

-- Assign numbers to existing rows (ordered by created_at for consistency)
update problems
  set problem_number = nextval('problems_problem_number_seq')
  where problem_number is null;

alter table problems
  alter column problem_number set default nextval('problems_problem_number_seq');

alter table problems
  alter column problem_number set not null;

-- Unique index — also required for FK references from solutions/hints
create unique index if not exists problems_problem_number_idx on problems (problem_number);

-- GIN trigram index on title for fast ilike and similarity queries
create index if not exists problems_title_trgm_idx
  on problems using gin(title gin_trgm_ops);

-- Fuzzy search function: returns up to 5 closest-matching problems by title
create or replace function search_problem_by_title(query text)
returns setof problems
language sql
stable
security invoker
as $$
  select *
  from problems
  where title ilike '%' || query || '%'
     or similarity(title, query) > 0.1
  order by similarity(title, query) desc
  limit 5;
$$;
