-- Add HTML content column to problems table
alter table problems add column if not exists content text;
