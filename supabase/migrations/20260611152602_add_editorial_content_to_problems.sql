-- Store the scraped Codeforces editorial body (markdown) for a problem.
-- Kept separate from solutions.explanation: editorial_content is the raw
-- scraped editorial, while explanation is the curated human/AI write-up.
-- problems already has RLS enabled with public read + service-role write
-- (see 20260408000000); a new nullable column needs no policy changes.
alter table problems add column if not exists editorial_content text;
