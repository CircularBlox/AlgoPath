-- Update trigger: only auto-create profile when a real username is available.
-- Email signup sets raw_user_meta_data->>'username'.
-- GitHub OAuth sets raw_user_meta_data->>'user_name'.
-- Google OAuth provides neither → profile creation is deferred to the setup-username flow.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), '')
  );

  -- No username available (Google OAuth) — skip; setup-username page will upsert the profile.
  if v_username is null then
    return new;
  end if;

  -- Deduplicate if the username is already taken
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, rating, skill_level, username_confirmed)
  values (new.id, v_username, 1200, 'intermediate', true);

  return new;
end;
$$;
