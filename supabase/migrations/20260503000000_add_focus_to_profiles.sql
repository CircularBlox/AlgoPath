-- Add focus column to profiles
-- focus: whether the user wants interview prep, competitive programming, or both
-- Valid values: 'interviews', 'comp_programming', 'both' (null = not yet set)

alter table profiles
  add column if not exists focus text;
