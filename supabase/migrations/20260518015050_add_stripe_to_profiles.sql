-- Add Stripe billing fields to profiles
alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists idx_profiles_stripe_customer_id
  on profiles(stripe_customer_id)
  where stripe_customer_id is not null;
