-- Automatically create a profile row when a new auth user signs up.
-- Pulls username from user_metadata (set during email sign-up),
-- falling back to the portion of the email address before the '@'.

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
    split_part(new.email, '@', 1)
  );

  -- Deduplicate if the username is already taken
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, rating, skill_level)
  values (new.id, v_username, 1200, 'intermediate');

  return new;
end;
$$;

-- Drop trigger if it already exists so this migration is idempotent
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
