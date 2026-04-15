-- Add streak tracking to profiles
-- streak: current consecutive-day solving streak
-- last_solved_date: the calendar date (UTC) of the most recent solved problem

alter table profiles
  add column if not exists streak          integer not null default 0,
  add column if not exists last_solved_date date;
