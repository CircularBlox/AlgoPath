import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { generateCsrfToken } from "~/lib/csrf";
import { difficultyBuckets, difficultyLabel } from "~/lib/difficulty";
import { effectiveStreak, streakStatus } from "~/lib/streak";
import { createClient, getUser } from "~/lib/supabase/server";
import { displayTag } from "~/lib/tags";
import { levelFromXp, levelTitle, rankConfig, xpProgress } from "~/lib/xp";
import { CfLinkSection } from "./cf-link-section";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { SkillLevelEditor } from "./skill-level-editor";
import { SolveHeatmap } from "./solve-heatmap";
import { StreakFreezeButton } from "./streak-freeze-button";
import { TopicRadar } from "./topic-radar";
import { TopicRecommendation } from "./topic-recommendation";

type Profile = {
  username: string;
  rating: number;
  xp: number;
  level: number;
  skill_level: string;
  solved_problems: number[];
  streak: number;
  last_solved_date: string | null;
  created_at: string;
  recommended_problem_number: number | null;
  focus: string | null;
  plan: "free" | "pro" | "elite" | null;
  stripe_customer_id: string | null;
  streak_frozen: boolean | null;
  streak_freeze_used_at: string | null;
  cf_handle: string | null;
  cf_rating: number | null;
  cf_max_rating: number | null;
  cf_rank: string | null;
};

type Problem = {
  id: string;
  problem_number: number;
  title: string;
  difficulty: string | null;
  tags: string[];
  platform: string;
};

async function getRecommendation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  solved: number[],
  rating: number,
  focus: string | null = null,
): Promise<Problem | null> {
  const buckets = difficultyBuckets(rating);
  const notSolvedFilter = solved.length > 0 ? `(${solved.join(",")})` : null;

  let candidateQuery = supabase
    .from("problems")
    .select("id, problem_number, title, difficulty, tags, platform")
    .in("difficulty", buckets)
    .limit(30);
  if (notSolvedFilter) {
    candidateQuery = candidateQuery.not(
      "problem_number",
      "in",
      notSolvedFilter,
    );
  }
  if (focus === "interviews")
    candidateQuery = candidateQuery.eq("platform", "LeetCode");
  else if (focus === "comp_programming")
    candidateQuery = candidateQuery.neq("platform", "LeetCode");
  const { data: candidates } = await candidateQuery;

  let pool: Problem[] = (candidates as Problem[]) ?? [];
  if (pool.length === 0) {
    let fallbackQuery = supabase
      .from("problems")
      .select("id, problem_number, title, difficulty, tags, platform")
      .in("difficulty", difficultyBuckets(rating))
      .limit(30);
    if (notSolvedFilter) {
      fallbackQuery = fallbackQuery.not(
        "problem_number",
        "in",
        notSolvedFilter,
      );
    }
    if (focus === "interviews")
      fallbackQuery = fallbackQuery.eq("platform", "LeetCode");
    else if (focus === "comp_programming")
      fallbackQuery = fallbackQuery.neq("platform", "LeetCode");
    const { data: fallback } = await fallbackQuery;
    pool = (fallback as Problem[]) ?? [];
  }

  if (pool.length === 0) return null;

  const recentSolved = solved.slice(-10);
  const tagFreq: Record<string, number> = {};
  if (recentSolved.length > 0) {
    const { data: recentProblems } = await supabase
      .from("problems")
      .select("tags")
      .in("problem_number", recentSolved);
    for (const p of recentProblems ?? []) {
      for (const tag of (p.tags as string[]) ?? []) {
        tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
      }
    }
  }

  const scored = pool.map((p) => {
    const overlap = (p.tags ?? []).reduce(
      (sum, tag) => sum + (tagFreq[tag] ?? 0),
      0,
    );
    return { problem: p, overlap };
  });
  scored.sort((a, b) => a.overlap - b.overlap);

  return scored[0]?.problem ?? null;
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

async function RecommendedProblem({
  cachedRecNumber,
  solvedProblems,
  rating,
  focus,
}: {
  cachedRecNumber: number | null;
  solvedProblems: number[];
  rating: number;
  focus: string | null;
}) {
  const supabase = await createClient();
  const recommended = cachedRecNumber
    ? await supabase
        .from("problems")
        .select("id, problem_number, title, difficulty, tags, platform")
        .eq("problem_number", cachedRecNumber)
        .single<Problem>()
        .then(({ data }) => data)
    : await getRecommendation(supabase, solvedProblems, rating, focus);

  if (!recommended) {
    return (
      <div className="flex items-center justify-center rounded border border-dashed border-border py-10">
        <p className="text-sm text-muted-foreground">
          No recommendations available yet.
        </p>
      </div>
    );
  }

  return (
    <Card className="border-l-[3px] border-l-foreground/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base leading-snug">
              {recommended.title}
            </CardTitle>
            {recommended.problem_number != null && (
              <span className="text-xs text-muted-foreground">
                Problem #{recommended.problem_number}
              </span>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {recommended.platform === "codeforces"
              ? "Codeforces"
              : recommended.platform === "usaco"
                ? "USACO"
                : "LeetCode"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {recommended.difficulty && (
            <Badge variant="outline" className="text-xs">
              {recommended.difficulty}
            </Badge>
          )}
          {(recommended.tags ?? []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Matched to your rating ({rating}) — a {difficultyLabel(rating)}{" "}
          problem with fresh topics for you.
        </p>
        <Button asChild className="self-start" size="sm">
          <Link href={`/display-problem?p=${recommended.problem_number}`}>
            Practice this problem
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SkillAndSolvedSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-56 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    </>
  );
}

async function SkillAndSolvedSection({
  solvedProblems,
}: {
  solvedProblems: number[];
}) {
  if (solvedProblems.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Solved Problems
        </h2>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No problems solved yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Head to the Problems tab to get started.
          </p>
        </div>
      </section>
    );
  }

  const supabase = await createClient();
  const solvedProblemDetails = await supabase
    .from("problems")
    .select("id, problem_number, title, difficulty, tags, platform")
    .in("problem_number", solvedProblems)
    .then(({ data }) => (data as Problem[] | null) ?? []);

  const solvedOrdered = [...solvedProblems]
    .reverse()
    .map((n) => solvedProblemDetails.find((p) => p.problem_number === n))
    .filter((p): p is Problem => p != null);

  const tagCounts: Record<string, number> = {};
  for (const p of solvedProblemDetails) {
    for (const raw of p.tags ?? []) {
      const tag = raw.toLowerCase().trim();
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxTagCount = topTags[0]?.[1] ?? 1;

  return (
    <>
      {topTags.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Skill Web
          </h2>
          <div className="overflow-hidden rounded border border-border divide-y divide-border">
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
      )}

      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Solved Problems
          </h2>
          <span className="text-xs text-muted-foreground">
            {solvedProblems.length}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded border border-border">
          {solvedOrdered.map((problem) => (
            <Link
              key={problem.problem_number}
              href={`/display-problem?p=${problem.problem_number}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <CheckIcon />
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                #{problem.problem_number}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {problem.title}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {problem.difficulty && (
                  <Badge variant="outline" className="text-xs">
                    {problem.difficulty}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {problem.platform === "codeforces"
                    ? "CF"
                    : problem.platform === "usaco"
                      ? "USACO"
                      : "LC"}
                </Badge>
              </div>
              <ChevronRightIcon />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default async function ProfilePage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  if (!user) {
    redirect("/auth/login?next=/profile");
  }

  const [{ data: profile }, csrfToken, solvesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, rating, xp, level, skill_level, solved_problems, streak, last_solved_date, created_at, recommended_problem_number, focus, plan, stripe_customer_id, streak_frozen, streak_freeze_used_at, cf_handle, cf_rating, cf_max_rating, cf_rank",
      )
      .eq("id", user.id)
      .single<Profile>(),
    generateCsrfToken(),
    supabase.from("solves").select("hints_used").eq("user_id", user.id),
  ]);

  const username = profile?.username ?? user.email?.split("@")[0] ?? "User";
  const rating = profile?.rating ?? 1200;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? levelFromXp(xp);
  const title = levelTitle(level);
  const config = rankConfig(level);
  const progress = xpProgress(xp, level);
  const skillLevel = profile?.skill_level ?? "intermediate";
  const solvedProblems: number[] = profile?.solved_problems ?? [];
  const rawStreak = profile?.streak ?? 0;
  const lastSolvedDate = profile?.last_solved_date ?? null;
  const status = streakStatus(rawStreak, lastSolvedDate);
  const streak = effectiveStreak(rawStreak, lastSolvedDate);

  const joinedDate = profile?.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : null;

  const initial = username[0]?.toUpperCase() ?? "U";
  const cachedRecNumber = profile?.recommended_problem_number ?? null;
  const focus = profile?.focus ?? null;
  const plan = profile?.plan ?? "free";
  const hasStripeCustomer = !!profile?.stripe_customer_id;
  const cfHandle = profile?.cf_handle ?? null;
  const cfRating = profile?.cf_rating ?? null;
  const cfMaxRating = profile?.cf_max_rating ?? null;
  const cfRank = profile?.cf_rank ?? null;
  const streakFrozen = profile?.streak_frozen ?? false;
  const streakFreezeUsedAt = profile?.streak_freeze_used_at ?? null;
  const freezeUsedThisMonth = streakFreezeUsedAt
    ? (() => {
        const d = new Date(streakFreezeUsedAt);
        const now = new Date();
        return (
          d.getUTCFullYear() === now.getUTCFullYear() &&
          d.getUTCMonth() === now.getUTCMonth()
        );
      })()
    : false;

  const solveRows = solvesResult.data ?? [];
  const avgHints =
    solveRows.length > 0
      ? (
          solveRows.reduce(
            (sum, s) => sum + ((s.hints_used as number) ?? 0),
            0,
          ) / solveRows.length
        ).toFixed(1)
      : null;

  const planLabel: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    elite: "Elite",
  };
  const planColors: Record<string, string> = {
    free: "text-muted-foreground border-border bg-muted/40",
    pro: "text-primary border-primary/40 bg-primary/10",
    elite: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  };
  const statItems = [
    { label: "Level", value: String(level), fire: false, fireActive: false },
    { label: "XP", value: xp.toLocaleString(), fire: false, fireActive: false },
    {
      label: "Solved",
      value: String(solvedProblems.length),
      fire: false,
      fireActive: false,
    },
    {
      label: "Streak",
      value: String(streak),
      fire: true,
      fireActive: status === "active",
    },
    {
      label: "Avg Hints",
      value: avgHints ?? "—",
      fire: false,
      fireActive: false,
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-10">
      {/* ── Profile hero ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded border border-border">
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
                {username}
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

            {/* XP progress bar */}
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

            <div className="mt-2 flex flex-col gap-0.5">
              <SkillLevelEditor initialLevel={skillLevel} />
              <span className="text-xs text-muted-foreground">Skill Level</span>
            </div>

            {/* Plan */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${planColors[plan] ?? planColors.free}`}
              >
                {planLabel[plan] ?? "Free"} Plan
              </span>
              {plan === "free" ? (
                <Link
                  href="/pricing"
                  className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Upgrade
                </Link>
              ) : hasStripeCustomer ? (
                <ManageSubscriptionButton />
              ) : null}
            </div>

            {/* Streak freeze (Pro+) */}
            {plan !== "free" && (
              <div className="mt-3 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium">
                  Streak Freeze
                </span>
                <StreakFreezeButton
                  csrfToken={csrfToken}
                  streakFrozen={streakFrozen}
                  freezeUsedThisMonth={freezeUsedThisMonth}
                  streak={streak}
                />
                <span className="text-[10px] text-muted-foreground">
                  1 free per month · absorbs one missed day
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex divide-x divide-border border-t border-border bg-muted/30">
          {statItems.map((s) => (
            <div
              key={s.label}
              className="flex flex-1 flex-col gap-0.5 px-6 py-4"
            >
              <span className="text-2xl font-bold leading-none">
                {s.value}
                {s.fire && (
                  <span
                    style={
                      s.fireActive
                        ? {}
                        : { filter: "grayscale(1) opacity(0.35)" }
                    }
                  >
                    {" "}
                    🔥
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Streak nudge ────────────────────────────────────────── */}
      {status === "at_risk" && (
        <div className="flex items-start gap-3 rounded border border-primary/20 bg-primary/5 px-4 py-3">
          <span
            style={{ filter: "grayscale(1) opacity(0.4)", fontSize: "1.1rem" }}
          >
            🔥
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              Your {rawStreak}-day streak is at risk
            </p>
            <p className="text-xs text-muted-foreground">
              Solve a problem today to keep it going.{" "}
              <Link
                href="/display-problem"
                className="text-foreground underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {status === "broken" && (
        <div className="flex items-start gap-3 rounded border border-destructive/20 bg-destructive/5 px-4 py-3">
          <span style={{ fontSize: "1.1rem" }}>💔</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              Your {rawStreak}-day streak was broken
            </p>
            <p className="text-xs text-muted-foreground">
              You missed a day. Solve a problem today to start a new streak.{" "}
              <Link
                href="/display-problem"
                className="text-foreground underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {status === "none" && (
        <div className="flex items-start gap-3 rounded border border-border bg-muted/30 px-4 py-3">
          <span
            style={{ filter: "grayscale(1) opacity(0.4)", fontSize: "1.1rem" }}
          >
            🔥
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">No streak yet</p>
            <p className="text-xs text-muted-foreground">
              Solve a problem today to start your streak.{" "}
              <Link
                href="/display-problem"
                className="text-foreground underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Recommended for You ────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recommended for You
        </h2>
        <Suspense
          fallback={<div className="h-40 animate-pulse rounded bg-muted" />}
        >
          <RecommendedProblem
            cachedRecNumber={cachedRecNumber}
            solvedProblems={solvedProblems}
            rating={rating}
            focus={focus}
          />
        </Suspense>
      </section>

      {/* ── What to focus on next ─────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What to Focus On Next
        </h2>
        <Suspense
          fallback={<div className="h-24 animate-pulse rounded bg-muted" />}
        >
          <TopicRecommendation />
        </Suspense>
      </section>

      {/* ── Codeforces Account ───────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Codeforces Account
        </h2>
        <div className="rounded border border-border bg-card p-4 shadow-sm">
          <CfLinkSection
            initialHandle={cfHandle}
            initialRating={cfRating}
            initialMaxRating={cfMaxRating}
            initialRank={cfRank}
          />
          {cfHandle && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              View your contest history on the{" "}
              <Link href="/contests" className="text-primary hover:underline">
                Contests page
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* ── Solve Activity Heatmap ────────────────────────────── */}
      <Suspense
        fallback={<div className="h-28 animate-pulse rounded bg-muted" />}
      >
        <SolveHeatmap />
      </Suspense>

      {/* ── Skill Web + Solved (deferred) ─────────────────────── */}
      <Suspense fallback={<SkillAndSolvedSkeleton />}>
        <SkillAndSolvedSection solvedProblems={solvedProblems} />
      </Suspense>
    </main>
  );
}
