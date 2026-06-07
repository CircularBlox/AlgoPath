-- FAQ entries shown on the public /faq page.
-- Public (anon + authenticated) can read; writes happen only via the
-- service-role admin client, so no insert/update/delete policies are defined.
create table if not exists faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Ordering index for the public list (sort_order, then newest first).
create index if not exists idx_faqs_sort_order on faqs(sort_order, created_at);

alter table faqs enable row level security;

create policy faqs_select_anon on faqs
  for select to anon using (true);

create policy faqs_select_authenticated on faqs
  for select to authenticated using (true);

-- Seed the first question.
insert into faqs (question, answer, sort_order)
values (
  'Why can''t I just use ChatGPT, Claude, or any other AI?',
  'Under the hood it''s the same kind of model, yes. The difference is what it refuses to do. ChatGPT will spoil a problem the moment you ask; AlgoPath is designed not to — progressive hints, gated reveals, and code review that points at your blind spots instead of rewriting your solution. Add a rating-matched problem feed, a sample runner, and cross-judge progress tracking, and you get a practice loop instead of a copilot. The free tier is the whole thing, so it''s easy to compare for yourself.',
  0
);
