-- Allow one solution row per problem per language
-- Adds a unique constraint on (problem_number, language) and seeds blank
-- entries for Python and Java alongside the existing C++ row

-- Ensure no duplicate (problem_number, language) pairs exist before adding constraint
delete from solutions s1
  using solutions s2
  where s1.id > s2.id
    and s1.problem_number = s2.problem_number
    and s1.language = s2.language;

create unique index if not exists solutions_problem_language_idx
  on solutions (problem_number, language);

-- Seed blank Python and Java variants for The Equalizer
insert into solutions (problem_name, problem_number, language)
select p.title, p.problem_number, lang
from problems p
cross join (values ('python'), ('java')) as langs(lang)
where p.url = 'https://codeforces.com/contest/2217/problem/A'
  and not exists (
    select 1 from solutions s
    where s.problem_number = p.problem_number
      and s.language = lang
  );
