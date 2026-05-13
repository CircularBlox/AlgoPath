-- RLS audit: all tables confirmed covered. Adds a missing composite index on
-- problem_reports that the anti-spam query in /api/problems/[number]/report uses.

-- ─── Intentional immutability notes ────────────────────────────────────────
-- solves: no UPDATE/DELETE by design — solve history is permanent.
--   Account deletion cascades via FK (on delete cascade).
-- code_reviews: no DELETE by design — rows are the rate-limiting signal.
--   Allowing user deletes would let users reset their own rate limit cap.
-- problem_reports: no UPDATE/DELETE by design — immutable audit trail.
--   Admin status transitions use service_role, bypassing RLS.

-- ─── Missing composite index ────────────────────────────────────────────────
-- The duplicate-report check queries (user_id, problem_number, type) together.
-- reports_user_problem_idx covers (user_id, problem_number) but not type —
-- add the three-column variant to avoid a re-scan on the type filter.
create index if not exists reports_user_problem_type_idx
  on problem_reports (user_id, problem_number, type);