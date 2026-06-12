import { notFound } from "next/navigation";
import { Suspense } from "react";
import { effectiveStreak, streakStatus } from "~/lib/gamification/streak";
import { levelFromXp, levelTitle, xpProgress } from "~/lib/gamification/xp";
import { createAdminClient } from "~/lib/supabase/admin";
import { displayTag } from "~/lib/tags";
import { TopicRadar } from "../topic-radar";

type PublicProfile = {
  username: string;
  xp: number;
  level: number;
  skill_level: string;
  solved_problems: number[];
  streak: number;
  last_solved_date: string | null;
  created_at: string;
};

type Problem = {
  problem_number: number;
  tags: string[];
};

/** Terminal section eyebrow — `// label`, full-foreground at rest. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline gap-2 font-mono text-xs">
      <span className="text-dim">{"//"}</span>
      <h2 className="font-semibold tracking-wide text-foreground">
        {children}
      </h2>
    </div>
  );
}

function SkillWebSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-48 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

async function PublicSkillWeb({
  solvedProblems,
}: {
  solvedProblems: number[];
}) {
  if (solvedProblems.length === 0) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("problems")
    .select("problem_number, tags")
    .in("problem_number", solvedProblems);

  const tagCounts: Record<string, number> = {};
  for (const p of (data as Problem[] | null) ?? []) {
    for (const tag of p.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxTagCount = topTags[0]?.[1] ?? 1;

  if (topTags.length === 0) return null;

  return (
    <section>
      <SectionLabel>Skill Web</SectionLabel>
      <div className="divide-y divide-border overflow-hidden rounded border border-border">
        {topTags.length >= 3 && (
          <div className="p-4">
            <TopicRadar tags={topTags} maxCount={maxTagCount} />
          </div>
        )}
        {topTags.map(([tag, count]) => (
          <div key={tag} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-40 shrink-0 truncate font-mono text-sm text-foreground">
              {displayTag(tag)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded bg-violet transition-all"
                style={{ width: `${(count / maxTagCount) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-cyan">
              {count} solved
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, xp, level, skill_level, solved_problems, streak, last_solved_date, created_at",
    )
    .ilike("username", username)
    .single<PublicProfile>();

  if (!profile) notFound();

  const xp = profile.xp ?? 0;
  const level = profile.level ?? levelFromXp(xp);
  const title = levelTitle(level);
  const progress = xpProgress(xp, level);
  const solvedProblems: number[] = profile.solved_problems ?? [];
  const rawStreak = profile.streak ?? 0;
  const streak = effectiveStreak(rawStreak, profile.last_solved_date ?? null);
  const status = streakStatus(rawStreak, profile.last_solved_date ?? null);
  const initial = profile.username[0]?.toUpperCase() ?? "U";

  const joinedDate = profile.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : null;

  // Stat figures are mono + cyan; streak is amber when active, dim otherwise.
  const statItems: { label: string; value: string; tone: string }[] = [
    { label: "level", value: String(level), tone: "text-cyan" },
    {
      label: "solved",
      value: String(solvedProblems.length),
      tone: "text-cyan",
    },
    {
      label: "streak",
      value: `${streak}d`,
      tone: status === "active" ? "text-amber" : "text-dim",
    },
    { label: "xp", value: xp.toLocaleString(), tone: "text-cyan" },
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      {/* ── Profile hero ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <span className="font-mono text-[11px] text-dim">
            ~/{profile.username}
          </span>
        </div>

        <div className="flex items-start gap-5 p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded border border-border-bright bg-muted font-mono text-2xl font-semibold text-violet">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-none tracking-tight">
                {profile.username}
              </h1>
              <span className="inline-flex items-center rounded border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet">
                Lv.{level} · {title}
              </span>
            </div>
            {joinedDate && (
              <p className="font-mono text-xs text-dim">
                {"// joined "}
                {joinedDate}
              </p>
            )}

            {/* XP progress */}
            <div className="mt-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">
                  <span className="text-cyan">
                    {progress.current.toLocaleString()}
                  </span>{" "}
                  / {progress.needed.toLocaleString()} XP → Lv.{level + 1}
                </span>
                <span className="tabular-nums text-cyan">
                  {progress.percent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-violet transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>

            {profile.skill_level && (
              <div className="mt-2 flex flex-col gap-0.5">
                <span className="font-mono text-sm font-medium capitalize text-foreground">
                  {profile.skill_level}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  skill level
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 divide-x divide-border border-t border-border">
          {statItems.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-4 py-4">
              <span
                className={`font-mono text-2xl font-semibold leading-none tabular-nums ${s.tone}`}
              >
                {s.value}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Skill Web (deferred) ───────────────────────────────── */}
      <Suspense fallback={<SkillWebSkeleton />}>
        <PublicSkillWeb solvedProblems={solvedProblems} />
      </Suspense>
    </main>
  );
}
