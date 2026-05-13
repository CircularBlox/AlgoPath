-- Add optional editorial URL to problems table
alter table problems add column if not exists editorial_url text;
