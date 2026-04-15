-- description is optional for difficulty-suggestion reports
alter table problem_reports
  alter column description drop not null;
