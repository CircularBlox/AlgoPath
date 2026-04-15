-- recommended_problem_number: cached next problem for the profile page,
--   recomputed only when a user solves a problem.
-- last_ai_suggest_at: timestamp of last AI Suggest call, used to enforce cooldown.

alter table profiles
  add column if not exists recommended_problem_number integer,
  add column if not exists last_ai_suggest_at timestamptz;
