-- Enforce case-insensitive username uniqueness at the database level.
-- Prevents "Alice" and "alice" from both being registered.

create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username));
