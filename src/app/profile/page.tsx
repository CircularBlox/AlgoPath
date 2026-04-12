import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { createClient, getUser } from "~/lib/supabase/server";

type Profile = {
  username: string;
  rating: number;
  skill_level: string;
  solved_problems: number[];
  created_at: string;
};

type Problem = {
  id: string;
  problem_number: number;
  title: string;
  difficulty: string | null;
  tags: string[];
  platform: string;
};

/** Maps rating to the difficulty band we should target next. */
function targetDifficulty(rating: number): string {
  if (rating < 1250) return "Easy";
  if (rating < 1500) return "Medium";
  return "Hard";
}

/**
 * Picks one unsolved problem for the user.
 *
 * Strategy:
 * 1. Find candidates at the target difficulty that aren't yet solved.
 * 2. Score each by tag novelty — prefer problems whose tags appear
 *    least often in the user's recent solved history.
 * 3. Fall back to any unsolved problem if no candidates at target difficulty.
 */
async function getRecommendation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  solved: number[],
  rating: number,
): Promise<Problem | null> {
  const target = targetDifficulty(rating);

  const notSolvedFilter = solved.length > 0 ? `(${solved.join(",")})` : null;

  // Candidates at target difficulty
  let candidateQuery = supabase
    .from("problems")
    .select("id, problem_number, title, difficulty, tags, platform")
    .eq("difficulty", target)
    .limit(30);
  if (notSolvedFilter) {
    candidateQuery = candidateQuery.not(
      "problem_number",
      "in",
      notSolvedFilter,
    );
  }
  const { data: candidates } = await candidateQuery;

  // If nothing at that difficulty, fall back to any unsolved
  let pool: Problem[] = (candidates as Problem[]) ?? [];
  if (pool.length === 0) {
    let fallbackQuery = supabase
      .from("problems")
      .select("id, problem_number, title, difficulty, tags, platform")
      .limit(30);
    if (notSolvedFilter) {
      fallbackQuery = fallbackQuery.not(
        "problem_number",
        "in",
        notSolvedFilter,
      );
    }
    const { data: fallback } = await fallbackQuery;
    pool = (fallback as Problem[]) ?? [];
  }

  if (pool.length === 0) return null;

  // Build tag frequency map from recently solved problems (last 10)
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

  // Score: lower overlap with recent tags = better (more novel)
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

export default async function ProfilePage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, rating, skill_level, solved_problems, created_at")
    .eq("id", user.id)
    .single<Profile>();

  const username = profile?.username ?? user.email?.split("@")[0] ?? "User";
  const rating = profile?.rating ?? 1200;
  const skillLevel = profile?.skill_level ?? "intermediate";
  const solvedProblems: number[] = profile?.solved_problems ?? [];

  const joinedDate = profile?.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : null;

  const initial = username[0]?.toUpperCase() ?? "U";

  const stats = [
    { label: "Rating", value: String(rating) },
    { label: "Problems Solved", value: String(solvedProblems.length) },
    {
      label: "Skill Level",
      value: skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1),
    },
  ];

  const recommended = await getRecommendation(supabase, solvedProblems, rating);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
          {initial}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{username}</h1>
          {joinedDate && (
            <p className="text-sm text-muted-foreground">Joined {joinedDate}</p>
          )}
        </div>
        <Badge variant="outline" className="ml-auto self-start">
          Rating {rating}
        </Badge>
      </div>

      <Separator className="my-8" />

      {/* Stats grid */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-1 pt-4">
                <CardTitle className="text-2xl font-bold">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-8" />

      {/* Recommended problem */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Recommended for You</h2>
        {recommended ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">
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
                Based on your current rating ({rating}) and recent practice — a{" "}
                {targetDifficulty(rating).toLowerCase()} problem with fresh
                topics for you.
              </p>
              <Button asChild className="self-start" size="sm">
                <Link href={`/display-problem?id=${recommended.id}`}>
                  Practice this problem
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No recommendations available yet.
            </p>
          </div>
        )}
      </section>

      <Separator className="my-8" />

      {/* Solved problems */}
      <section>
        <h2 className="mb-4 text-base font-semibold">Solved Problems</h2>
        {solvedProblems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No problems solved yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Head to the Problems tab to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...solvedProblems].reverse().map((num) => (
              <Badge key={num} variant="secondary">
                #{num}
              </Badge>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
