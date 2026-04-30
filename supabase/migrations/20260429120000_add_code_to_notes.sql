-- Add code editor fields to notes
alter table notes
  add column if not exists code text not null default '',
  add column if not exists code_language text not null default 'C++';

alter table notes
  add constraint notes_code_length check (char_length(code) <= 200000),
  add constraint notes_code_language_length check (char_length(code_language) <= 20);
