-- Add Codeforces account linking fields to profiles
alter table profiles
  add column if not exists cf_handle      text,
  add column if not exists cf_rating      integer,
  add column if not exists cf_max_rating  integer,
  add column if not exists cf_rank        text;
