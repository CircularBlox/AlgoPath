import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "~/lib/supabase/server";
import { displayTag } from "~/lib/tags";

export default async function InsightsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) redirect("/auth/login?next=/insights");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();

  const plan = profile?.plan ?? "free";

  if (plan !== "elite") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 flex flex-col items-center gap-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Insights Dashboard</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            The Insights dashboard is available on the Elite plan. Track your
            weak topics, solve rate by difficulty, and XP trends.
          </p>
        </div>
        <Link
          href="/pricing"
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80"
        >
          Upgrade to Elite →
        </Link>
      </main>
    );
  }

  const { data: solves } = await supabase
    .from("solves")
    .select("problem_number, xp_gained, hints_used, solved_at")
    .eq("user_id", user.id)
    .order("solved_at", { ascending: false });

  const solveList = solves ?? [];
  const totalSolves = solveList.length;

  if (totalSolves === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solve some problems to see your stats.
          </p>
        </div>
      </main>
    );
  }

  const avgHints =
    solveList.reduce((sum, s) => sum + (s.hints_used ?? 0), 0) / totalSolves;
  const zeroHintSolves = solveList.filter(
    (s) => (s.hints_used ?? 0) === 0,
  ).length;

  const solvedNumbers = [...new Set(solveList.map((s) => s.problem_number))];
  const { data: problems } = await supabase
    .from("problems")
    .select("problem_number, difficulty, tags")
    .in("problem_number", solvedNumbers);

  const problemMap: Record<
    number,
    { difficulty: string | null; tags: string[] }
  > = {};
  for (const p of problems ?? []) {
    problemMap[p.problem_number] = {
      difficulty: p.difficulty ?? null,
      tags: (p.tags as string[]) ?? [],
    };
  }

  function bucketDifficulty(diff: string | null): string {
    if (!diff) return "Unknown";
    if (diff === "Easy" || diff === "Medium" || diff === "Hard") return diff;
    const n = Number(diff);
    if (Number.isNaN(n)) return diff;
    if (n < 1200) return "Div. 3 / Beginner (<1200)";
    if (n < 1600) return "Div. 2 (1200–1599)";
    if (n < 2000) return "Div. 1 (1600–1999)";
    return "Expert (2000+)";
  }

  const diffBuckets: Record<string, { solved: number; total_hints: number }> =
    {};
  const tagHints: Record<string, { hints: number; count: number }> = {};

  for (const solve of solveList) {
    const pInfo = problemMap[solve.problem_number];
    const bucket = bucketDifficulty(pInfo?.difficulty ?? null);
    if (!diffBuckets[bucket])
      diffBuckets[bucket] = { solved: 0, total_hints: 0 };
    diffBuckets[bucket].solved++;
    diffBuckets[bucket].total_hints += solve.hints_used ?? 0;
    for (const tag of pInfo?.tags ?? []) {
      if (!tagHints[tag]) tagHints[tag] = { hints: 0, count: 0 };
      tagHints[tag].hints += solve.hints_used ?? 0;
      tagHints[tag].count++;
    }
  }

  const topWeakTags = Object.entries(tagHints)
    .filter(([, { count }]) => count >= 2)
    .map(([tag, { hints, count }]) => ({ tag, avgHints: hints / count, count }))
    .sort((a, b) => b.avgHints - a.avgHints)
    .slice(0, 8);

  const topStrongTags = Object.entries(tagHints)
    .filter(([, { count }]) => count >= 2)
    .map(([tag, { hints, count }]) => ({ tag, avgHints: hints / count, count }))
    .sort((a, b) => a.avgHints - b.avgHints)
    .slice(0, 5);

  const xpByDate: Record<string, number> = {};
  for (const solve of solveList) {
    const date = (solve.solved_at as string).slice(0, 10);
    xpByDate[date] = (xpByDate[date] ?? 0) + (solve.xp_gained ?? 0);
  }
  const xpTrend = Object.entries(xpByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);
  const maxXp = Math.max(...xpTrend.map(([, xp]) => xp), 1);

  const diffOrder = [
    "Easy",
    "Medium",
    "Hard",
    "Div. 3 / Beginner (<1200)",
    "Div. 2 (1200–1599)",
    "Div. 1 (1600–1999)",
    "Expert (2000+)",
    "Unknown",
  ];
  const sortedDiffs = Object.entries(diffBuckets).sort(
    ([a], [b]) =>
      diffOrder.indexOf(a) - diffOrder.indexOf(b) || a.localeCompare(b),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your performance across {totalSolves} solved problem
          {totalSolves !== 1 ? "s" : ""}.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Problems Solved", value: String(totalSolves) },
          {
            label: "Avg Hints / Solve",
            value: (Math.round(avgHints * 10) / 10).toFixed(1),
          },
          {
            label: "No-hint Solves",
            value: `${zeroHintSolves} (${totalSolves > 0 ? Math.round((zeroHintSolves / totalSolves) * 100) : 0}%)`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4"
          >
            <span className="text-2xl font-bold tabular-nums">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* XP trend bar chart */}
      {xpTrend.length > 1 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            XP Earned (last 14 days)
          </h2>
          <div className="flex items-end gap-1 h-24 rounded-xl border border-border bg-card px-5 py-4">
            {xpTrend.map(([date, xp]) => (
              <div
                key={date}
                className="flex flex-1 flex-col items-center gap-1 group relative"
                title={`${date}: ${xp} XP`}
              >
                <div
                  className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ height: `${Math.max(4, (xp / maxXp) * 56)}px` }}
                />
                <span className="text-[8px] text-muted-foreground rotate-45 origin-left hidden sm:block">
                  {date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Solve rate by difficulty */}
      {sortedDiffs.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Solves by Difficulty
          </h2>
          <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
            {sortedDiffs.map(([diff, { solved, total_hints }]) => (
              <div key={diff} className="flex items-center gap-4 px-5 py-3">
                <span className="w-48 shrink-0 text-sm text-foreground/80">
                  {diff}
                </span>
                <span className="text-sm font-semibold tabular-nums w-10 shrink-0">
                  {solved}
                </span>
                <span className="text-xs text-muted-foreground">
                  avg{" "}
                  {solved > 0
                    ? (Math.round((total_hints / solved) * 10) / 10).toFixed(1)
                    : "0"}{" "}
                  hints
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weak topics */}
      {topWeakTags.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Weak Topics
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Topics where you use the most hints on average.
          </p>
          <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
            {topWeakTags.map(({ tag, avgHints: ah, count }) => (
              <div key={tag} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-sm">{displayTag(tag)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} solves
                </span>
                <span className="text-xs font-medium text-amber-400 tabular-nums w-20 text-right shrink-0">
                  {ah.toFixed(1)} hints avg
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strong topics */}
      {topStrongTags.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Strengths
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Topics where you solve with the fewest hints.
          </p>
          <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
            {topStrongTags.map(({ tag, avgHints: ah, count }) => (
              <div key={tag} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-sm">{displayTag(tag)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} solves
                </span>
                <span className="text-xs font-medium text-primary tabular-nums w-20 text-right shrink-0">
                  {ah.toFixed(1)} hints avg
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Data updates after each solved problem.{" "}
        <Link
          href="/activity"
          className="underline underline-offset-2 hover:text-foreground"
        >
          View activity log →
        </Link>
      </p>
    </main>
  );
}
