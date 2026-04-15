-- Add type and suggested_difficulty to problem_reports.
-- type: 'general' (bug/issue report) | 'difficulty' (user suggests a difficulty rating)
-- suggested_difficulty: the user's proposed rating (difficulty reports only)

alter table problem_reports
  add column if not exists type text not null default 'general',
  add column if not exists suggested_difficulty text;
