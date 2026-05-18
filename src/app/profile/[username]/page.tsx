import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "~/components/ui/badge";
import { effectiveStreak, streakStatus } from "~/lib/streak";
import { createAdminClient } from "~/lib/supabase/admin";
import { displayTag } from "~/lib/tags";
import { levelFromXp, levelTitle, rankConfig, xpProgress } from "~/lib/xp";
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

function SkillWebSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
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
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Skill Web
      </h2>
      <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
        {topTags.length >= 3 && (
          <div className="p-4">
            <TopicRadar tags={topTags} maxCount={maxTagCount} />
          </div>
        )}
        {topTags.map(([tag, count]) => (
          <div key={tag} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-sm w-40 shrink-0 truncate">
              {displayTag(tag)}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/60 transition-all"
                style={{ width: `${(count / maxTagCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-14 text-right shrink-0">
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
  const config = rankConfig(level);
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-10">
      {/* ── Profile hero ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-start gap-5 p-6">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
            style={{
              background: config.bg,
              color: config.color,
              boxShadow: `0 0 0 3px ${config.color}30`,
            }}
          >
            {initial}
          </div>
          <div className="flex flex-col gap-1 pt-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight leading-none">
                {profile.username}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  color: config.color,
                  backgroundColor: config.bg,
                  border: `1px solid ${config.color}40`,
                }}
              >
                {config.icon} Lv.{level} · {title}
              </span>
            </div>
            {joinedDate && (
              <p className="text-sm text-muted-foreground">
                Joined {joinedDate}
              </p>
            )}

            {/* XP progress */}
            <div className="mt-2.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {progress.current.toLocaleString()} /{" "}
                  {progress.needed.toLocaleString()} XP to Lv.{level + 1}
                </span>
                <span className="text-xs" style={{ color: config.color }}>
                  {progress.percent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress.percent}%`,
                    background: config.gradient,
                  }}
                />
              </div>
            </div>

            {profile.skill_level && (
              <Badge
                variant="secondary"
                className="mt-2 w-fit capitalize text-xs"
              >
                {profile.skill_level}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex divide-x divide-border border-t border-border bg-muted/30">
          <div className="flex flex-1 flex-col gap-0.5 px-6 py-4">
            <span className="text-2xl font-bold leading-none">{level}</span>
            <span className="text-xs text-muted-foreground">Level</span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 px-6 py-4">
            <span className="text-2xl font-bold leading-none">
              {solvedProblems.length}
            </span>
            <span className="text-xs text-muted-foreground">Solved</span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 px-6 py-4">
            <span className="text-2xl font-bold leading-none">
              {streak}
              <span
                style={
                  status === "active"
                    ? {}
                    : { filter: "grayscale(1) opacity(0.35)" }
                }
              >
                {" "}
                🔥
              </span>
            </span>
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 px-6 py-4">
            <span
              className="text-2xl font-bold leading-none"
              style={{ color: config.color }}
            >
              {xp.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>
        </div>
      </div>

      {/* ── Skill Web (deferred) ───────────────────────────────── */}
      <Suspense fallback={<SkillWebSkeleton />}>
        <PublicSkillWeb solvedProblems={solvedProblems} />
      </Suspense>
    </main>
  );
}
