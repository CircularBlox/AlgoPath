-- Add gamification and onboarding columns to profiles
-- xp: total experience points (adaptive: scaled by difficulty and hints used)
-- level: current level derived from xp, updated on every solve
-- onboarding_completed: whether the user has finished the onboarding wizard
-- preferred_languages: user-selected coding languages from onboarding
-- daily_goal: target problems per day (set during onboarding)
-- cp_goal: user's competitive programming goal

alter table profiles
  add column if not exists xp                   integer not null default 0,
  add column if not exists level                integer not null default 1,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists preferred_languages  text[]  not null default '{}',
  add column if not exists daily_goal           integer not null default 1,
  add column if not exists cp_goal              text;

-- Existing users have already "onboarded" — don't force them through the wizard
update profiles set onboarding_completed = true;
