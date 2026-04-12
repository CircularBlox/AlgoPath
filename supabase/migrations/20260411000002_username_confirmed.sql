-- Add username_confirmed flag so Google/unknown OAuth users are prompted to pick a username.
-- GitHub OAuth sets raw_user_meta_data->>'user_name'; email signup sets 'username'.
-- Both are treated as confirmed. Google OAuth provides neither → needs confirmation.

alter table profiles
  add column if not exists username_confirmed boolean not null default false;

-- Re-create the trigger function with updated logic
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username  text;
  v_confirmed boolean;
begin
  -- Preference order: explicit username (email signup) → GitHub user_name → email prefix
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- Confirmed if the user supplied a real username (not the email-prefix fallback)
  v_confirmed := (
    (new.raw_user_meta_data->>'username')  is not null or
    (new.raw_user_meta_data->>'user_name') is not null
  );

  -- Deduplicate if the username is already taken
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, rating, skill_level, username_confirmed)
  values (new.id, v_username, 1200, 'intermediate', v_confirmed);

  return new;
end;
$$;
