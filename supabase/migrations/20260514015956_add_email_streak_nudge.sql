-- Add email_streak_nudge preference to profiles.
-- Auto-enabled for all users; they can opt out from profile settings.
alter table profiles
  add column if not exists email_streak_nudge boolean not null default true;
