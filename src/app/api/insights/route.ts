import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();

  if ((profile?.plan ?? "free") !== "elite") {
    return NextResponse.json(
      { error: "Insights dashboard requires an Elite plan." },
      { status: 403 },
    );
  }

  const { data: solves, error: solvesError } = await supabase
    .from("solves")
    .select("problem_number, xp_gained, hints_used, solved_at")
    .eq("user_id", user.id)
    .order("solved_at", { ascending: false });

  if (solvesError) {
    Sentry.captureException(solvesError, { tags: { route: "insights" } });
    return NextResponse.json(
      { error: "Failed to fetch solve data." },
      { status: 500 },
    );
  }

  const solveList = solves ?? [];
  const totalSolves = solveList.length;

  if (totalSolves === 0) {
    return NextResponse.json({
      total_solves: 0,
      avg_hints_per_solve: 0,
      solve_rate_by_difficulty: {},
      top_tags: [],
      zero_hint_solves: 0,
      xp_trend: [],
    });
  }

  const avgHints =
    solveList.reduce((sum, s) => sum + (s.hints_used ?? 0), 0) / totalSolves;
  const zeroHintSolves = solveList.filter(
    (s) => (s.hints_used ?? 0) === 0,
  ).length;

  // Fetch problem difficulty + tags for all solved problems
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

  // Solve rate by difficulty bucket
  const diffBuckets: Record<string, { solved: number; total_hints: number }> =
    {};
  const tagHints: Record<string, { hints: number; count: number }> = {};

  for (const solve of solveList) {
    const pInfo = problemMap[solve.problem_number];
    const diff = pInfo?.difficulty ?? "Unknown";
    const bucket =
      diff === "Easy" || diff === "Medium" || diff === "Hard"
        ? diff
        : Number.isNaN(Number(diff))
          ? diff
          : Number(diff) < 1200
            ? "Easy (<1200)"
            : Number(diff) < 1600
              ? "Medium (1200-1599)"
              : Number(diff) < 2000
                ? "Hard (1600-1999)"
                : "Expert (2000+)";

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

  // Tags where avg hints is highest = weak spots
  const topTags = Object.entries(tagHints)
    .map(([tag, { hints, count }]) => ({
      tag,
      avg_hints: count > 0 ? hints / count : 0,
      solve_count: count,
    }))
    .filter((t) => t.solve_count >= 2)
    .sort((a, b) => b.avg_hints - a.avg_hints)
    .slice(0, 8);

  // XP trend: last 30 solves grouped by date
  const xpByDate: Record<string, number> = {};
  for (const solve of solveList.slice(0, 60)) {
    const date = (solve.solved_at as string).slice(0, 10);
    xpByDate[date] = (xpByDate[date] ?? 0) + (solve.xp_gained ?? 0);
  }
  const xpTrend = Object.entries(xpByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, xp]) => ({ date, xp }));

  return NextResponse.json({
    total_solves: totalSolves,
    avg_hints_per_solve: Math.round(avgHints * 10) / 10,
    zero_hint_solves: zeroHintSolves,
    solve_rate_by_difficulty: diffBuckets,
    top_tags: topTags,
    xp_trend: xpTrend,
  });
}
