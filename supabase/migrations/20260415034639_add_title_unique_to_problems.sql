-- Add unique constraint on title so duplicate problem uploads are silently ignored
-- by PostgREST's resolution=ignore-duplicates Prefer header.

alter table problems
  add constraint problems_title_unique unique (title);
