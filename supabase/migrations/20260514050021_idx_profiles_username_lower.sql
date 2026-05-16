-- Add a case-insensitive index on username so availability checks are fast.
-- The setup-username page uses .ilike("username", value) which maps to
-- lower(username) = lower(value); without this index that's a full table scan.
create index if not exists profiles_username_lower_idx
  on profiles (lower(username));
