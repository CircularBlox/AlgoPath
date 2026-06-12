import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import { difficultyBuckets, difficultyLabel } from "~/lib/difficulty";
import { effectiveStreak, streakStatus } from "~/lib/gamification/streak";
import { levelFromXp, levelTitle, xpProgress } from "~/lib/gamification/xp";
import { generateCsrfToken } from "~/lib/security/csrf";
import { createClient, getUser } from "~/lib/supabase/server";
import { displayTag } from "~/lib/tags";
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

// §1 difficulty palette: numeric ratings ramp cyan → amber → rose; named tiers
// map to green / amber / rose. Everything else (unknown) stays cyan.
function diffClass(d: string): string {
  if (/^\d+$/.test(d)) {
    const n = Number(d);
    return n >= 2000 ? "text-rose" : n >= 1700 ? "text-amber" : "text-cyan";
  }
  const k = d.toLowerCase();
  if (k === "easy" || k === "bronze") return "text-green";
  if (k === "medium" || k === "silver") return "text-amber";
  if (k === "hard" || k === "gold" || k === "platinum") return "text-rose";
  return "text-cyan";
}

const platformLabel = (p: string) =>
  p === "codeforces" ? "CF" : p === "usaco" ? "USACO" : "LC";

/** Terminal section eyebrow — `// label`, full-foreground at rest. */
function SectionLabel({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2 font-mono text-xs">
      <span className="text-dim">{"//"}</span>
      <h2 className="font-semibold tracking-wide text-foreground">
        {children}
      </h2>
      {count != null && <span className="tabular-nums text-cyan">{count}</span>}
    </div>
  );
}

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
      className="shrink-0 text-green"
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
      className="shrink-0 text-dim"
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
        <p className="font-mono text-sm text-muted-foreground">
          No recommendations available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-l-2 border-border border-l-violet bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold leading-snug">
            {recommended.title}
          </h3>
          {recommended.problem_number != null && (
            <span className="font-mono text-xs text-dim">
              #{recommended.problem_number}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-teal">
          {platformLabel(recommended.platform)}
        </span>
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {recommended.difficulty && (
            <span
              className={`font-semibold ${diffClass(recommended.difficulty)}`}
            >
              {recommended.difficulty}
            </span>
          )}
          {(recommended.tags ?? []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded border border-border px-1.5 py-0.5 text-dim"
            >
              {displayTag(tag)}
            </span>
          ))}
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          Matched to your rating (<span className="text-cyan">{rating}</span>) —
          a {difficultyLabel(rating)} problem with fresh topics for you.
        </p>
        <Button asChild className="self-start" size="sm">
          <Link href={`/display-problem?p=${recommended.problem_number}`}>
            Practice this problem
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SkillAndSolvedSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-56 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
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
        <SectionLabel>Solved Problems</SectionLabel>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-border py-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            No problems solved yet.
          </p>
          <p className="mt-1 font-mono text-xs text-dim">
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
      )}

      <section>
        <SectionLabel count={solvedProblems.length}>
          Solved Problems
        </SectionLabel>
        <div className="flex flex-col overflow-hidden rounded border border-border">
          {solvedOrdered.map((problem) => (
            <Link
              key={problem.problem_number}
              href={`/display-problem?p=${problem.problem_number}`}
              className="flex items-center gap-3 border-b border-l-2 border-border border-l-transparent px-4 py-3 transition-colors last:border-b-0 hover:border-l-violet hover:bg-muted"
            >
              <CheckIcon />
              <span className="w-10 shrink-0 font-mono text-xs text-cyan">
                #{problem.problem_number}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {problem.title}
              </span>
              <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
                {problem.difficulty && (
                  <span
                    className={`font-semibold ${diffClass(problem.difficulty)}`}
                  >
                    {problem.difficulty}
                  </span>
                )}
                <span className="text-dim">
                  {platformLabel(problem.platform)}
                </span>
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
    free: "text-muted-foreground border-border bg-muted",
    pro: "text-violet border-violet/40 bg-violet/10",
    elite: "text-amber border-amber/40 bg-amber/10",
  };

  // Stat figures are mono + cyan (numbers); the streak is amber when active,
  // dim when not — never an emoji.
  const statItems: { label: string; value: string; tone: string }[] = [
    { label: "level", value: String(level), tone: "text-cyan" },
    { label: "xp", value: xp.toLocaleString(), tone: "text-cyan" },
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
    {
      label: "avg hints",
      value: avgHints ?? "—",
      tone: avgHints ? "text-cyan" : "text-dim",
    },
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      {/* ── Profile hero ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded border border-border bg-card">
        {/* terminal header bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <span className="font-mono text-[11px] text-dim">~/profile</span>
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${planColors[plan] ?? planColors.free}`}
          >
            {planLabel[plan] ?? "Free"}
          </span>
        </div>

        <div className="flex items-start gap-5 p-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded border border-border-bright bg-muted font-mono text-2xl font-semibold text-violet">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-none tracking-tight">
                {username}
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

            {/* XP progress bar */}
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

            <div className="mt-2 flex flex-col gap-0.5">
              <SkillLevelEditor initialLevel={skillLevel} />
              <span className="font-mono text-xs text-muted-foreground">
                skill level
              </span>
            </div>

            {/* Plan action */}
            <div className="mt-3 flex items-center gap-3 font-mono text-xs">
              {plan === "free" ? (
                <Link
                  href="/pricing"
                  className="text-violet underline underline-offset-2 hover:opacity-80"
                >
                  Upgrade →
                </Link>
              ) : hasStripeCustomer ? (
                <ManageSubscriptionButton />
              ) : null}
            </div>

            {/* Streak freeze (Pro+) */}
            {plan !== "free" && (
              <div className="mt-3 flex flex-col gap-1">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  streak freeze
                </span>
                <StreakFreezeButton
                  csrfToken={csrfToken}
                  streakFrozen={streakFrozen}
                  freezeUsedThisMonth={freezeUsedThisMonth}
                  streak={streak}
                />
                <span className="font-mono text-[10px] text-dim">
                  1 free per month · absorbs one missed day
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-5 divide-x divide-border border-t border-border">
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

      {/* ── Streak nudge ────────────────────────────────────────── */}
      {status === "at_risk" && (
        <div className="flex items-start gap-3 rounded border border-l-2 border-border border-l-amber bg-card px-4 py-3">
          <span className="mt-0.5 font-mono text-sm font-bold text-amber">
            !
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              Your {rawStreak}-day streak is at risk
            </p>
            <p className="text-xs text-muted-foreground">
              Solve a problem today to keep it going.{" "}
              <Link
                href="/display-problem"
                className="text-violet underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {status === "broken" && (
        <div className="flex items-start gap-3 rounded border border-l-2 border-border border-l-rose bg-card px-4 py-3">
          <span className="mt-0.5 font-mono text-sm font-bold text-rose">
            ×
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              Your {rawStreak}-day streak was broken
            </p>
            <p className="text-xs text-muted-foreground">
              You missed a day. Solve a problem today to start a new streak.{" "}
              <Link
                href="/display-problem"
                className="text-violet underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {status === "none" && (
        <div className="flex items-start gap-3 rounded border border-l-2 border-border border-l-border bg-card px-4 py-3">
          <span className="mt-0.5 font-mono text-sm font-bold text-dim">·</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">No streak yet</p>
            <p className="text-xs text-muted-foreground">
              Solve a problem today to start your streak.{" "}
              <Link
                href="/display-problem"
                className="text-violet underline underline-offset-2"
              >
                Practice now
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Recommended for You ────────────────────────────────── */}
      <section>
        <SectionLabel>Recommended for You</SectionLabel>
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
        <SectionLabel>What to Focus On Next</SectionLabel>
        <Suspense
          fallback={<div className="h-24 animate-pulse rounded bg-muted" />}
        >
          <TopicRecommendation />
        </Suspense>
      </section>

      {/* ── Codeforces Account ───────────────────────────────── */}
      <section>
        <SectionLabel>Codeforces Account</SectionLabel>
        <div className="rounded border border-border bg-card p-4">
          <CfLinkSection
            initialHandle={cfHandle}
            initialRating={cfRating}
            initialMaxRating={cfMaxRating}
            initialRank={cfRank}
          />
          {cfHandle && (
            <p className="mt-2 font-mono text-[11px] text-dim">
              View your contest history on the{" "}
              <Link href="/contests" className="text-violet hover:underline">
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
