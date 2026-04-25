import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/is-admin";
import { createClient, getUser } from "~/lib/supabase/server";

const VALID_RATINGS = new Set(
  Array.from({ length: 32 }, (_, i) => (i + 4) * 100), // 400, 500, … 3500
);

type AnchorProblem = {
  title: string;
  cf_rating: number;
  tags: string;
};

function isNumericRating(d: string | null | undefined): boolean {
  if (!d) return false;
  return /^\d+$/.test(d.trim());
}

function isLeetCode(platform: string | null | undefined): boolean {
  return (platform ?? "").toLowerCase() === "leetcode";
}

/** Snap an arbitrary number to the nearest valid CF rating (multiple of 100, 400–3500). */
function snapRating(n: number): number {
  const clamped = Math.max(400, Math.min(3500, n));
  return Math.round(clamped / 100) * 100;
}

async function classifyOne(
  problem: {
    problem_number: number;
    title: string;
    difficulty: string | null;
    tags: string[] | null;
    content: string | null;
    url: string;
    solution_code: string | null;
  },
  apiKey: string,
  anchors: AnchorProblem[],
): Promise<{ problem_number: number; rating: number }> {
  const tags = (problem.tags ?? []).join(", ") || "none";

  const contentSnippet = problem.content
    ? problem.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200)
    : "";

  const solutionSnippet = problem.solution_code
    ? problem.solution_code.trim().slice(0, 600)
    : null;

  const anchorBlock =
    anchors.length > 0
      ? `\nKnown problems from this dataset for calibration — use these as your scale:\n${anchors
          .map((a) => `  • CF ${a.cf_rating}: "${a.title}" (tags: ${a.tags})`)
          .join("\n")}\n`
      : "";

  const prompt = `You are assigning a Codeforces-style numeric difficulty rating to a competitive programming problem.

The rating scale runs from 400 (trivial) to 3500 (world-class). Use multiples of 100 only.

Guidelines:
- 400–800: trivial one-liners, basic arithmetic, pure simulation
- 900–1200: easy implementation, simple math, basic greedy
- 1300–1600: standard DP, BFS/DFS, binary search, two-pointer
- 1700–2000: non-trivial DP, graphs with tricks, segment trees, careful greedy
- 2100–2400: advanced algorithms, clever observations, hard constructives
- 2500–2800: very hard — flows, FFT, advanced string structures, original ideas
- 2900–3500: elite problems requiring deep insight or multiple advanced techniques combined

Key signals:
- Complexity of the problem statement and constraints
- How many algorithmic steps are needed
- Solution code complexity (a trivial loop vs. layered data structures)
- Tags (e.g. "brute force" → low; "flows", "fft", "centroid decomposition" → high)
${anchorBlock}
Problem to rate:
  Title: ${problem.title}
  Tags: ${tags}
  URL: ${problem.url}${contentSnippet ? `\n  Statement: ${contentSnippet}` : ""}${solutionSnippet ? `\n  Solution code excerpt:\n${solutionSnippet}` : ""}

Reply with a single integer that is a multiple of 100 between 400 and 3500 — nothing else.`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5-8b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8,
        temperature: 0,
      }),
    },
  );

  // On API failure fall back to a mid-range default
  if (!response.ok) {
    return { problem_number: problem.problem_number, rating: 1200 };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = parseInt(raw.replace(/[^\d]/g, ""), 10);

  if (!Number.isNaN(parsed) && parsed >= 400 && parsed <= 3500) {
    return {
      problem_number: problem.problem_number,
      rating: snapRating(parsed),
    };
  }

  // If AI returned garbage, fall back to heuristic or mid-range
  return { problem_number: problem.problem_number, rating: 1200 };
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { dry_run?: boolean; force?: boolean } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dryRun = body.dry_run === true;
  // force=true re-classifies even problems that already have a valid numeric rating
  const force = body.force === true;

  const supabase = await createClient();

  const { data: problems, error: fetchError } = await supabase
    .from("problems")
    .select("problem_number, title, difficulty, tags, content, url, platform")
    .order("problem_number");

  if (fetchError || !problems) {
    return NextResponse.json(
      { error: "Failed to fetch problems." },
      { status: 500 },
    );
  }

  // Target: non-LeetCode problems that lack a valid numeric CF rating (unless force=true)
  const targets = problems.filter((p) => {
    if (isLeetCode(p.platform as string | null)) return false;
    if (!force && isNumericRating(p.difficulty as string | null)) return false;
    return true;
  });

  if (targets.length === 0) {
    return NextResponse.json({
      classified: 0,
      message: force
        ? "No non-LeetCode problems found."
        : "All non-LeetCode problems already have numeric ratings. Pass force=true to re-classify.",
      results: [],
    });
  }

  // Fetch solution codes for all targets
  const targetNums = targets.map((t) => t.problem_number as number);
  const { data: solutionRows } = await supabase
    .from("solution_codes")
    .select("problem_number, language, code")
    .in("problem_number", targetNums);

  const solutionMap = new Map<number, string>();
  if (solutionRows) {
    const PREF = ["c++", "cpp", "python", "java", "javascript"];
    for (const num of targetNums) {
      const rows = solutionRows.filter(
        (r) => r.problem_number === num && r.code,
      );
      if (rows.length === 0) continue;
      const preferred = PREF.map((lang) =>
        rows.find((r) => r.language?.toLowerCase() === lang),
      ).find(Boolean);
      const pick = preferred ?? rows[0];
      if (pick?.code) solutionMap.set(num, pick.code as string);
    }
  }

  // Build calibration anchors from non-LeetCode problems that already have valid numeric ratings
  // and are NOT in the target set (i.e. not being re-classified right now)
  const targetSet = new Set(targetNums);
  const numericNonTargets = problems.filter(
    (p) =>
      !isLeetCode(p.platform as string | null) &&
      isNumericRating(p.difficulty as string | null) &&
      !targetSet.has(p.problem_number as number),
  );

  // Sample anchors spread evenly across the rating scale
  const ANCHOR_RANGES = [
    { min: 400, max: 700 },
    { min: 800, max: 1000 },
    { min: 1100, max: 1300 },
    { min: 1400, max: 1600 },
    { min: 1700, max: 2000 },
    { min: 2100, max: 2400 },
    { min: 2500, max: 2800 },
    { min: 2900, max: 3500 },
  ];

  const anchors: AnchorProblem[] = [];
  for (const range of ANCHOR_RANGES) {
    const match = numericNonTargets.find((p) => {
      const r = parseInt(p.difficulty as string, 10);
      return r >= range.min && r <= range.max;
    });
    if (match) {
      anchors.push({
        title: match.title as string,
        cf_rating: parseInt(match.difficulty as string, 10),
        tags: ((match.tags as string[] | null) ?? []).join(", ") || "none",
      });
    }
  }

  const apiKey = env.OPENROUTER_API_KEY;
  const BATCH = 8;
  const results: {
    problem_number: number;
    title: string;
    old: string | null;
    new_rating: number;
    had_solution: boolean;
  }[] = [];

  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);

    const batchResults = await Promise.all(
      batch.map((p) =>
        classifyOne(
          {
            problem_number: p.problem_number as number,
            title: p.title as string,
            difficulty: p.difficulty as string | null,
            tags: p.tags as string[] | null,
            content: p.content as string | null,
            url: p.url as string,
            solution_code: solutionMap.get(p.problem_number as number) ?? null,
          },
          apiKey,
          anchors,
        ).catch((err) => {
          console.error(
            `classify-difficulty: problem ${p.problem_number} failed:`,
            err,
          );
          return { problem_number: p.problem_number as number, rating: 1200 };
        }),
      ),
    );

    for (const result of batchResults) {
      const target = targets.find(
        (t) => t.problem_number === result.problem_number,
      );
      results.push({
        problem_number: result.problem_number,
        title: target?.title as string,
        old: target?.difficulty as string | null,
        new_rating: result.rating,
        had_solution: solutionMap.has(result.problem_number),
      });
    }

    if (!dryRun) {
      await Promise.all(
        batchResults.map(({ problem_number, rating }) =>
          supabase
            .from("problems")
            .update({ difficulty: String(rating) })
            .eq("problem_number", problem_number),
        ),
      );
    }
  }

  // Distribution breakdown
  const distribution: Record<string, number> = {};
  for (const r of results) {
    const bucket =
      r.new_rating <= 1200
        ? "Easy (≤1200)"
        : r.new_rating <= 2000
          ? "Medium (1300–2000)"
          : "Hard (≥2100)";
    distribution[bucket] = (distribution[bucket] ?? 0) + 1;
  }

  return NextResponse.json({
    dry_run: dryRun,
    classified: results.length,
    distribution,
    results,
  });
}

export { VALID_RATINGS };
