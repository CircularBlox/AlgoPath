-- Restructure: one solutions row per problem, language variants in solution_codes child table

-- ── Create child table ────────────────────────────────────────────────────────

create table if not exists solution_codes (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null references solutions(id) on delete cascade,
  language text not null,
  code text,
  created_at timestamptz not null default now(),
  unique (solution_id, language)
);

alter table solution_codes enable row level security;

do $$ begin
  create policy "solution_codes_select_anon"
    on solution_codes for select to anon using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "solution_codes_select_authenticated"
    on solution_codes for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

create index if not exists solution_codes_solution_id_idx on solution_codes (solution_id);

-- ── Migrate existing per-language rows into solution_codes ────────────────────

-- For each problem_number keep the earliest solutions row as canonical,
-- move all language/code pairs into solution_codes, then delete duplicates.

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'solutions' and column_name = 'language'
  ) then
    -- Insert codes referencing the canonical (min id) solutions row per problem
    insert into solution_codes (solution_id, language, code)
    select canonical.cid, s.language, s.solution_code
    from solutions s
    join (
      select problem_number, min(id::text)::uuid as cid
      from solutions
      group by problem_number
    ) canonical on canonical.problem_number = s.problem_number
    where s.language is not null
      and s.solution_code is not null
    on conflict (solution_id, language) do nothing;

    -- Remove non-canonical rows
    delete from solutions
    where id not in (
      select min(id::text)::uuid from solutions group by problem_number
    );

    -- Drop old columns
    alter table solutions drop column if exists language;
    alter table solutions drop column if exists solution_code;
  end if;
end $$;

-- ── Clean up old indexes ──────────────────────────────────────────────────────

drop index if exists solutions_problem_language_idx;

create unique index if not exists solutions_problem_number_unique
  on solutions (problem_number);
