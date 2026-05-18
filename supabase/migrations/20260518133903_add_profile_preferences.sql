-- Add user preference columns for plan-gated hint features and streak freeze
alter table profiles
  add column if not exists preferred_hint_model text,
  add column if not exists hint_style text not null default 'structured',
  add column if not exists adaptive_difficulty boolean not null default false,
  add column if not exists streak_frozen boolean not null default false,
  add column if not exists streak_freeze_used_at timestamptz;
