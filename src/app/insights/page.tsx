import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "~/lib/supabase/server";
import { displayTag } from "~/lib/tags";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Terminal section eyebrow — `// label`, full-foreground at rest. */
function SectionLabel({
  children,
  className = "mb-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`flex items-baseline gap-2 font-mono text-xs ${className}`}>
      <span className="text-dim">{"//"}</span>
      <span className="font-semibold tracking-wide text-foreground">
        {children}
      </span>
    </h2>
  );
}

export default async function InsightsPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) redirect("/auth/login?next=/insights");

  const [{ data: profile }, { data: solves }, { data: solvesFull }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "plan, rating, xp, level, streak, last_solved_date, cf_handle, cf_rating",
        )
        .eq("id", user.id)
        .single<{
          plan: string;
          rating: number;
          xp: number;
          level: number;
          streak: number;
          last_solved_date: string | null;
          cf_handle: string | null;
          cf_rating: number | null;
        }>(),
      supabase
        .from("solves")
        .select("problem_number, xp_gained, hints_used, solved_at")
        .eq("user_id", user.id)
        .order("solved_at", { ascending: false }),
      supabase
        .from("solves")
        .select("problem_number, solved_at")
        .eq("user_id", user.id),
    ]);

  const plan = profile?.plan ?? "free";

  if (plan === "free") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 flex flex-col items-center gap-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10">
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
            The Insights dashboard is available on Pro and Elite plans. Track
            your weak topics, solve rate by difficulty, XP trends, and more.
          </p>
        </div>
        <Link
          href="/pricing"
          className="rounded bg-primary px-5 py-2 font-mono text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Upgrade to Pro →
        </Link>
      </main>
    );
  }

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
        <div className="rounded border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No data yet.{" "}
            <Link
              href="/display-problem"
              className="text-primary underline underline-offset-2"
            >
              Solve a problem
            </Link>{" "}
            to start seeing insights.
          </p>
        </div>
      </main>
    );
  }

  // ── Core solve metrics ──────────────────────────────────────────
  const totalXp = solveList.reduce((s, r) => s + (r.xp_gained ?? 0), 0);
  const avgHints =
    solveList.reduce((s, r) => s + (r.hints_used ?? 0), 0) / totalSolves;
  const zeroHintSolves = solveList.filter(
    (s) => (s.hints_used ?? 0) === 0,
  ).length;

  // ── Date-based metrics ──────────────────────────────────────────
  const now = Date.now();
  const MS_7D = 7 * 86400000;
  const MS_30D = 30 * 86400000;
  const last7 = solveList.filter(
    (s) => now - new Date(s.solved_at as string).getTime() < MS_7D,
  ).length;
  const last30 = solveList.filter(
    (s) => now - new Date(s.solved_at as string).getTime() < MS_30D,
  ).length;

  const uniqueDays = new Set(
    (solvesFull ?? []).map((s) => (s.solved_at as string).slice(0, 10)),
  ).size;

  // Day of week distribution
  const dayOfWeek = Array(7).fill(0) as number[];
  for (const s of solveList) {
    const d = new Date(s.solved_at as string).getUTCDay();
    dayOfWeek[d]++;
  }
  const maxDayCount = Math.max(...dayOfWeek, 1);

  // ── Problem data ─────────────────────────────────────────────────
  const solvedNumbers = [...new Set(solveList.map((s) => s.problem_number))];
  const { data: problems } = await supabase
    .from("problems")
    .select("problem_number, difficulty, tags, platform")
    .in("problem_number", solvedNumbers);

  const problemMap: Record<
    number,
    { difficulty: string | null; tags: string[]; platform: string }
  > = {};
  for (const p of problems ?? []) {
    problemMap[p.problem_number] = {
      difficulty: p.difficulty ?? null,
      tags: (p.tags as string[]) ?? [],
      platform: (p.platform as string) ?? "unknown",
    };
  }

  // ── Platform breakdown ───────────────────────────────────────────
  const platformCount: Record<string, number> = {};
  for (const solve of solveList) {
    const pl = problemMap[solve.problem_number]?.platform ?? "unknown";
    const label =
      pl === "codeforces"
        ? "Codeforces"
        : pl === "leetcode"
          ? "LeetCode"
          : pl === "usaco"
            ? "USACO"
            : "Other";
    platformCount[label] = (platformCount[label] ?? 0) + 1;
  }
  const platformEntries = Object.entries(platformCount).sort(
    (a, b) => b[1] - a[1],
  );
  const maxPlatformCount = Math.max(...platformEntries.map(([, c]) => c), 1);

  // ── Difficulty & tag analysis ────────────────────────────────────
  function bucketDifficulty(diff: string | null): string {
    if (!diff) return "Unknown";
    if (diff === "Easy" || diff === "Medium" || diff === "Hard") return diff;
    const n = Number(diff);
    if (Number.isNaN(n)) return diff;
    if (n < 1200) return "< 1200";
    if (n < 1600) return "1200–1599";
    if (n < 2000) return "1600–1999";
    if (n < 2400) return "2000–2399";
    return "2400+";
  }

  const diffBuckets: Record<string, { solved: number; total_hints: number }> =
    {};
  const tagHints: Record<string, { hints: number; count: number }> = {};
  const tagSolves: Record<string, number> = {};

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
      tagSolves[tag] = (tagSolves[tag] ?? 0) + 1;
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

  const topSolvedTags = Object.entries(tagSolves)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // ── XP trend ────────────────────────────────────────────────────
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
    "< 1200",
    "1200–1599",
    "1600–1999",
    "2000–2399",
    "2400+",
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

      {/* ── Summary stats ── cyan owns figures; the streak takes its amber role */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Problems Solved",
            value: String(totalSolves),
            tone: "text-cyan",
          },
          {
            label: "Total XP Earned",
            value: totalXp.toLocaleString(),
            tone: "text-cyan",
          },
          {
            label: "Avg Hints / Solve",
            value: (Math.round(avgHints * 10) / 10).toFixed(1),
            tone: "text-cyan",
          },
          {
            label: "No-hint Solves",
            value: `${zeroHintSolves} (${Math.round((zeroHintSolves / totalSolves) * 100)}%)`,
            tone: "text-cyan",
          },
          {
            label: "Active Days",
            value: String(uniqueDays),
            tone: "text-cyan",
          },
          {
            label: "Current Streak",
            value: `${profile?.streak ?? 0}d`,
            tone: profile?.streak ? "text-amber" : "text-dim",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded border border-border bg-card px-5 py-4"
          >
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${stat.tone}`}
            >
              {stat.value}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Solve velocity ── */}
      <section>
        <SectionLabel>Solve Velocity</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Last 7 days", value: last7 },
            { label: "Last 30 days", value: last30 },
            { label: "All time", value: totalSolves },
          ].map((v) => (
            <div
              key={v.label}
              className="flex flex-col gap-1 rounded border border-border bg-card px-5 py-4"
            >
              <span className="font-mono text-2xl font-bold tabular-nums text-cyan">
                {v.value}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {v.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── XP trend bar chart ── */}
      {xpTrend.length > 1 && (
        <section>
          <SectionLabel>XP Earned (last 14 days)</SectionLabel>
          <div className="flex h-24 items-end gap-1 rounded border border-border bg-card px-5 py-4">
            {xpTrend.map(([date, xp]) => (
              <div
                key={date}
                className="group relative flex flex-1 flex-col items-center gap-1"
                title={`${date}: ${xp} XP`}
              >
                <div
                  className="w-full rounded-t bg-green/70 transition-all group-hover:bg-green"
                  style={{ height: `${Math.max(4, (xp / maxXp) * 56)}px` }}
                />
                <span className="hidden origin-left rotate-45 font-mono text-[8px] text-dim sm:block">
                  {date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Day of week activity ── */}
      <section>
        <SectionLabel>Most Active Day</SectionLabel>
        <div className="flex h-28 items-end gap-2 rounded border border-border bg-card px-5 py-4">
          {dayOfWeek.map((count, i) => (
            <div
              key={DAY_LABELS[i]}
              className="group flex flex-1 flex-col items-center gap-1.5"
              title={`${DAY_LABELS[i]}: ${count} solve${count !== 1 ? "s" : ""}`}
            >
              <span className="font-mono text-[10px] font-semibold tabular-nums text-cyan">
                {count > 0 ? count : ""}
              </span>
              <div
                className="w-full rounded-t bg-primary/60 transition-all group-hover:bg-primary"
                style={{
                  height: `${Math.max(count > 0 ? 6 : 2, (count / maxDayCount) * 56)}px`,
                }}
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {DAY_LABELS[i]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform breakdown ── */}
      {platformEntries.length > 0 && (
        <section>
          <SectionLabel>Platform Breakdown</SectionLabel>
          <div className="flex flex-col gap-2 rounded border border-border bg-card px-5 py-4">
            {platformEntries.map(([platform, count]) => (
              <div key={platform} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-medium">
                  {platform}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/70 transition-all"
                    style={{ width: `${(count / maxPlatformCount) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="text-cyan">{count}</span> (
                  {Math.round((count / totalSolves) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Solves by difficulty ── */}
      {sortedDiffs.length > 0 && (
        <section>
          <SectionLabel>Solves by Difficulty</SectionLabel>
          <div className="divide-y divide-border overflow-hidden rounded border border-border">
            {sortedDiffs.map(([diff, { solved, total_hints }]) => (
              <div key={diff} className="flex items-center gap-4 px-5 py-3">
                <span className="w-36 shrink-0 font-mono text-sm text-foreground/80">
                  {diff}
                </span>
                <span className="w-10 shrink-0 font-mono text-sm font-semibold tabular-nums text-cyan">
                  {solved}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/50"
                    style={{ width: `${(solved / totalSolves) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {solved > 0
                    ? (Math.round((total_hints / solved) * 10) / 10).toFixed(1)
                    : "0"}{" "}
                  hints avg
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Most solved topics ── */}
      {topSolvedTags.length > 0 && (
        <section>
          <SectionLabel>Most Practiced Topics</SectionLabel>
          <div className="divide-y divide-border overflow-hidden rounded border border-border">
            {topSolvedTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-sm">{displayTag(tag)}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/60"
                    style={{
                      width: `${(count / (topSolvedTags[0]?.[1] ?? 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="text-cyan">{count}</span> solve
                  {count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Weak topics ── */}
      {topWeakTags.length > 0 && (
        <section>
          <SectionLabel className="mb-1">Weak Topics</SectionLabel>
          <p className="mb-4 text-xs text-muted-foreground">
            Topics where you use the most hints on average.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded border border-border">
            {topWeakTags.map(({ tag, avgHints: ah, count }) => (
              <div key={tag} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-sm">{displayTag(tag)}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {count} solves
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-amber">
                  {ah.toFixed(1)} hints avg
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Strong topics ── */}
      {topStrongTags.length > 0 && (
        <section>
          <SectionLabel className="mb-1">Strengths</SectionLabel>
          <p className="mb-4 text-xs text-muted-foreground">
            Topics where you solve with the fewest hints.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded border border-border">
            {topStrongTags.map(({ tag, avgHints: ah, count }) => (
              <div key={tag} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-sm">{displayTag(tag)}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {count} solves
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-xs font-medium tabular-nums text-green">
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
