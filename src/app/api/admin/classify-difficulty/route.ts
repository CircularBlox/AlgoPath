import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/is-admin";
import { routedCompletion } from "~/lib/model-router";
import { createClient, getUser } from "~/lib/supabase/server";

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
): Promise<{
  problem_number: number;
  rating: number | null;
  analysis: string | null;
  apiError: string | null;
  usedFallback: boolean;
}> {
  // Heuristic: keep existing numeric rating, or default to 1200
  const existingRating =
    problem.difficulty && isNumericRating(problem.difficulty)
      ? snapRating(parseInt(problem.difficulty, 10))
      : 1200;
  const tags = (problem.tags ?? []).join(", ") || "none";

  const contentSnippet = problem.content
    ? problem.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500)
    : "";

  const solutionSnippet = problem.solution_code
    ? problem.solution_code.trim().slice(0, 800)
    : null;

  // Full sorted reference list — the AI sees every known problem in order
  const referenceList =
    anchors.length > 0
      ? `\nProblems already rated in this dataset (sorted easiest → hardest). Use these as your calibration scale:\n${anchors
          .map((a) => `  ${a.cf_rating}  ${a.title}  [${a.tags}]`)
          .join("\n")}\n`
      : "";

  const prompt = `You are an expert competitive programmer with 10+ years of experience on Codeforces, LeetCode, and ICPC-level competitions. You have solved thousands of problems and understand deeply what makes each one hard.

You must assign a Codeforces-style numeric difficulty rating (400–3500, multiples of 100 only) to the problem below.

RATING SCALE:
  400–700   Trivial — basic arithmetic, single loop, no algorithm needed
  800–1200  Easy — simple greedy, basic math, brute force with small N
  1300–1600 Medium-low — BFS/DFS, binary search on answer, prefix sums, basic DP
  1700–2000 Medium-high — non-obvious DP, graphs with a trick, segment tree, careful greedy
  2100–2400 Hard — advanced data structures, clever construction, combinatorics
  2500–2800 Very hard — flows, FFT, offline algorithms, complex trees
  2900–3500 Elite — requires multiple advanced techniques or deep original insight
${referenceList}
CRITICAL RULES:
- Rate the SOLUTION difficulty, not how the problem reads. A one-sentence problem (e.g. "find median after deletions") can require segment trees or order-statistics trees → 2000+.
- If the solution needs an advanced data structure (Fenwick tree, segment tree, treap) or non-trivial DP, rate at least 1700.
- Basic addition/arithmetic problems → 400–800. Array/string manipulation → 800–1200. Anything involving custom data structures or non-obvious algorithms → 1700+.
- Compare your answer to the reference list above and make sure it is consistent. A new problem should sit at the right place in that sorted order.

Problem to rate:
  Title: ${problem.title}
  Tags: ${tags}
  URL: ${problem.url}${contentSnippet ? `\n  Statement:\n  ${contentSnippet}` : ""}${solutionSnippet ? `\n  Solution code:\n${solutionSnippet}` : ""}

Reply in this exact format — no other text:
ANALYSIS: <2–3 sentences: what algorithm or data structure solves this optimally, the key non-obvious insight (if any), and why it belongs at its difficulty level>
RATING: <integer multiple of 100, 400–3500>`;

  const completion = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "reasoning",
    apiKey,
    timeoutMs: 60000,
  });

  if (!completion.ok) {
    Sentry.captureMessage(
      `classify-difficulty model error: ${completion.error}`,
      {
        level: "error",
        extra: { problemNumber: problem.problem_number },
      },
    );
    return {
      problem_number: problem.problem_number,
      rating: existingRating,
      analysis: null,
      apiError: completion.error,
      usedFallback: true,
    };
  }

  const raw = completion.content.trim();
  console.log(
    `classify #${problem.problem_number} "${problem.title}":\n${raw}`,
  );

  // Parse RATING: <number>
  const ratingMatch = raw.match(/RATING:\s*([1-9]\d{2,3})/i);
  // Parse ANALYSIS: <text up to the RATING line>
  const analysisMatch = raw.match(/ANALYSIS:\s*([\s\S]+?)(?=\nRATING:|$)/i);
  const analysis = analysisMatch ? analysisMatch[1].trim() : null;

  if (ratingMatch) {
    const parsed = parseInt(ratingMatch[1], 10);
    if (parsed >= 400 && parsed <= 3500) {
      return {
        problem_number: problem.problem_number,
        rating: snapRating(parsed),
        analysis,
        apiError: null,
        usedFallback: false,
      };
    }
  }

  // Secondary: find any valid number anywhere in the response
  const anyMatch = raw.match(/\b([1-9]\d{2,3})\b/);
  if (anyMatch) {
    const parsed = parseInt(anyMatch[1], 10);
    if (parsed >= 400 && parsed <= 3500) {
      return {
        problem_number: problem.problem_number,
        rating: snapRating(parsed),
        analysis,
        apiError: null,
        usedFallback: false,
      };
    }
  }

  console.warn(
    `classify #${problem.problem_number}: unparseable response "${raw}" — using fallback`,
  );
  return {
    problem_number: problem.problem_number,
    rating: existingRating,
    analysis,
    apiError: null,
    usedFallback: true,
  };
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
  // force=false (default): only classify problems with no difficulty set.
  // force=true: reclassify ALL non-LeetCode problems, including those with
  //   existing numeric ratings (e.g. placeholder 800/1200/2000 from the dropdown).
  const force = body.force === true;

  const supabase = await createClient();

  const { data: problems, error: fetchError } = await supabase
    .from("problems")
    .select("problem_number, title, difficulty, tags, content, url, platform")
    .order("problem_number");

  if (fetchError || !problems) {
    if (fetchError)
      Sentry.captureException(fetchError, {
        tags: { route: "classify-difficulty", step: "fetch_problems" },
      });
    return NextResponse.json(
      { error: "Failed to fetch problems." },
      { status: 500 },
    );
  }

  // Targets: all problems that need a numeric rating assigned.
  // force=false: only problems with no difficulty set (null).
  // force=true: all problems, including those with existing ratings such as
  //   placeholder 800/1200/2000 from the dropdown, or LeetCode Easy/Medium/Hard.
  const targets = problems.filter((p) => {
    if (!force && p.difficulty != null) return false;
    return true;
  });

  if (targets.length === 0) {
    return NextResponse.json({
      classified: 0,
      message: "No non-LeetCode problems found.",
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

  // LeetCode Easy/Medium/Hard mapped to approximate numeric equivalents so they
  // contribute to the AI's calibration scale alongside CF numeric ratings.
  const LC_DIFFICULTY_MAP: Record<string, number> = {
    easy: 1000,
    medium: 1600,
    hard: 2300,
  };

  // Build calibration anchors from:
  // 1. All non-LeetCode problems with existing numeric ratings (official CF/USACO)
  // 2. LeetCode problems with a numeric rating (can reach 3600 for elite problems)
  // 3. LeetCode problems with Easy/Medium/Hard converted to approximate numerics
  // Anchors are updated incrementally after each batch so later problems benefit
  // from newly-assigned ratings.
  const anchors: AnchorProblem[] = problems
    .flatMap((p) => {
      const diff = (p.difficulty as string | null)?.trim() ?? null;
      if (isNumericRating(diff)) {
        return [
          {
            title: p.title as string,
            cf_rating: parseInt(diff as string, 10),
            tags: ((p.tags as string[] | null) ?? []).join(", ") || "none",
          },
        ];
      }
      if (isLeetCode(p.platform as string | null) && diff) {
        const mapped = LC_DIFFICULTY_MAP[diff.toLowerCase()];
        if (mapped) {
          return [
            {
              title: p.title as string,
              cf_rating: mapped,
              tags: ((p.tags as string[] | null) ?? []).join(", ") || "none",
            },
          ];
        }
      }
      return [];
    })
    .sort((a, b) => a.cf_rating - b.cf_rating);

  const apiKey = env.OPENROUTER_API_KEY;
  const BATCH = 6;
  const results: {
    problem_number: number;
    title: string;
    old: string | null;
    new_rating: number;
    analysis: string | null;
    had_solution: boolean;
    fallback: boolean;
    api_error: string | null;
  }[] = [];
  let firstApiError: string | null = null;

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
          Sentry.captureException(err, {
            tags: { route: "classify-difficulty" },
            extra: { problemNumber: p.problem_number },
          });
          const fallback = isNumericRating(p.difficulty as string | null)
            ? snapRating(parseInt(p.difficulty as string, 10))
            : 1200;
          return {
            problem_number: p.problem_number as number,
            rating: fallback as number,
            analysis: null as string | null,
            apiError: String(err) as string | null,
            usedFallback: true,
          };
        }),
      ),
    );

    for (const result of batchResults) {
      if (result.apiError && !firstApiError) firstApiError = result.apiError;
      const target = targets.find(
        (t) => t.problem_number === result.problem_number,
      );
      results.push({
        problem_number: result.problem_number,
        title: target?.title as string,
        old: target?.difficulty as string | null,
        new_rating: result.rating ?? 1200,
        analysis: result.analysis,
        had_solution: solutionMap.has(result.problem_number),
        fallback: result.usedFallback,
        api_error: result.apiError ?? null,
      });

      // Update anchors with newly assigned ratings so subsequent batches
      // have better calibration (comparative rating).
      if (result.rating !== null && !result.usedFallback && target) {
        const newRating = result.rating;
        const idx = anchors.findIndex(
          (a) => a.title === (target.title as string),
        );
        if (idx >= 0) {
          anchors[idx].cf_rating = newRating;
        } else {
          anchors.push({
            title: target.title as string,
            cf_rating: newRating,
            tags: ((target.tags as string[] | null) ?? []).join(", ") || "none",
          });
        }
      }
    }
    anchors.sort((a, b) => a.cf_rating - b.cf_rating);

    if (!dryRun) {
      await Promise.all(
        batchResults
          .filter((r) => r.rating !== null)
          .map(({ problem_number, rating }) =>
            supabase
              .from("problems")
              .update({ difficulty: String(rating) })
              .eq("problem_number", problem_number),
          ),
      );
    }
  }

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
    fallbacks: results.filter((r) => r.fallback).length,
    ...(firstApiError ? { api_error: firstApiError } : {}),
    distribution,
    results,
  });
}
