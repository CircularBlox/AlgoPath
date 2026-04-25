import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/is-admin";
import { createClient, getUser } from "~/lib/supabase/server";

const VALID_LABELS = ["Easy", "Medium", "Hard"] as const;
type DifficultyLabel = (typeof VALID_LABELS)[number];

type ReferenceExample = {
  title: string;
  difficulty: DifficultyLabel;
  cf_rating: number | null;
  tags: string;
  approximate?: boolean; // true = heuristic label, not human-confirmed
};

/** Returns true if the difficulty string is a raw numeric CF rating, not Easy/Medium/Hard. */
function isNumericRating(d: string | null | undefined): boolean {
  if (!d) return false;
  return /^\d+$/.test(d.trim());
}

/**
 * Rough fallback: CF numeric → Easy/Medium/Hard.
 * Scale: 400–1200 ≈ Easy, 1300–2000 ≈ Medium, 2100–3500 ≈ Hard.
 */
function cfRatingToLabel(rating: number): DifficultyLabel {
  if (rating <= 1200) return "Easy";
  if (rating <= 2000) return "Medium";
  return "Hard";
}

async function classifyOne(
  problem: {
    problem_number: number;
    title: string;
    difficulty: string | null;
    tags: string[] | null;
    content: string | null;
    url: string;
  },
  apiKey: string,
  examples: ReferenceExample[],
): Promise<{
  problem_number: number;
  label: DifficultyLabel;
  cf_rating: number | null;
}> {
  const cfRating = problem.difficulty ? parseInt(problem.difficulty, 10) : null;
  const heuristicLabel =
    cfRating !== null ? cfRatingToLabel(cfRating) : "Medium";

  const tags = (problem.tags ?? []).join(", ") || "none";
  const contentSnippet = problem.content
    ? problem.content.replace(/<[^>]+>/g, " ").slice(0, 600)
    : "";

  // Build few-shot reference block from already-classified problems
  const referenceBlock =
    examples.length > 0
      ? `\nReference problems from this dataset for calibration:\n${examples
          .map(
            (e) =>
              `  • ${e.title} — ${e.approximate ? `~${e.difficulty}` : e.difficulty}${e.cf_rating ? ` (CF ${e.cf_rating})` : ""}, tags: ${e.tags}${e.approximate ? " [heuristic]" : ""}`,
          )
          .join("\n")}\n`
      : "";

  const prompt = `You are classifying competitive programming problems into three difficulty tiers for a learning app. The numeric ratings are on a 400–3500 scale (similar to Codeforces).

Tiers:
- Easy: accessible to beginners, standard patterns (two-sum, sliding window, simple greedy). Roughly CF ≤ 1200.
- Medium: requires solid algorithmic knowledge, moderate complexity. Roughly CF 1300–2000.
- Hard: advanced techniques, clever observations, intricate implementation. Roughly CF ≥ 2100.
${referenceBlock}
Problem to classify:
  Title: ${problem.title}
  CF numeric rating: ${cfRating ?? "unknown"} (use as one signal — verify with content and tags)
  Tags: ${tags}
  URL: ${problem.url}${contentSnippet ? `\n  Statement excerpt: ${contentSnippet}` : ""}

Reply with exactly one word — Easy, Medium, or Hard — and nothing else.`;

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
        max_tokens: 5,
        temperature: 0,
      }),
    },
  );

  if (!response.ok) {
    return {
      problem_number: problem.problem_number,
      label: heuristicLabel,
      cf_rating: cfRating,
    };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  const candidate = (raw.charAt(0).toUpperCase() +
    raw.slice(1).toLowerCase()) as DifficultyLabel;
  const label = VALID_LABELS.includes(candidate) ? candidate : heuristicLabel;

  return { problem_number: problem.problem_number, label, cf_rating: cfRating };
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { dry_run?: boolean; cf_rating?: number } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dryRun = body.dry_run === true;
  const filterRating =
    typeof body.cf_rating === "number" ? body.cf_rating : null;

  const supabase = await createClient();

  // Fetch all problems in one query
  const { data: problems, error: fetchError } = await supabase
    .from("problems")
    .select("problem_number, title, difficulty, tags, content, url")
    .order("problem_number");

  if (fetchError || !problems) {
    return NextResponse.json(
      { error: "Failed to fetch problems." },
      { status: 500 },
    );
  }

  // Problems to classify: numeric difficulty (raw CF rating)
  const targets = problems.filter((p) => {
    if (!isNumericRating(p.difficulty as string | null)) return false;
    if (filterRating !== null) {
      return parseInt(p.difficulty as string, 10) === filterRating;
    }
    return true;
  });

  if (targets.length === 0) {
    return NextResponse.json({
      classified: 0,
      message: "No problems with numeric CF ratings found.",
      results: [],
    });
  }

  // Build reference examples: confirmed Easy/Medium/Hard + numeric anchors at other ratings
  const targetNumbers = new Set(targets.map((t) => t.problem_number as number));

  // 1. Confirmed classifications (up to 2 per tier)
  const confirmed = problems.filter((p) =>
    VALID_LABELS.includes(p.difficulty as DifficultyLabel),
  );
  const examples: ReferenceExample[] = (
    ["Easy", "Medium", "Hard"] as const
  ).flatMap((tier) =>
    confirmed
      .filter((p) => p.difficulty === tier)
      .slice(0, 2)
      .map((p) => ({
        title: p.title as string,
        difficulty: tier,
        cf_rating: null,
        tags: ((p.tags as string[] | null) ?? []).join(", ") || "none",
      })),
  );

  // 2. Numeric-rated problems at ratings other than 800 — spread across the scale
  //    so the AI has anchors to compare against when classifying 800-rated problems
  const ANCHOR_RANGES: { min: number; max: number; label: DifficultyLabel }[] =
    [
      { min: 400, max: 700, label: "Easy" },
      { min: 900, max: 1200, label: "Easy" },
      { min: 1300, max: 1700, label: "Medium" },
      { min: 1800, max: 2200, label: "Medium" },
      { min: 2300, max: 2800, label: "Hard" },
      { min: 2900, max: 3500, label: "Hard" },
    ];

  const numericOthers = problems.filter(
    (p) =>
      isNumericRating(p.difficulty as string | null) &&
      !targetNumbers.has(p.problem_number as number),
  );

  for (const range of ANCHOR_RANGES) {
    const match = numericOthers.find((p) => {
      const r = parseInt(p.difficulty as string, 10);
      return r >= range.min && r <= range.max;
    });
    if (match) {
      examples.push({
        title: match.title as string,
        difficulty: range.label,
        cf_rating: parseInt(match.difficulty as string, 10),
        tags: ((match.tags as string[] | null) ?? []).join(", ") || "none",
        approximate: true,
      });
    }
  }

  const apiKey = env.OPENROUTER_API_KEY;
  const BATCH = 8;
  const results: {
    problem_number: number;
    old: string | null;
    new: DifficultyLabel;
    cf_rating: number | null;
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
          },
          apiKey,
          examples,
        ).catch((err) => {
          console.error(
            `classify-difficulty: problem ${p.problem_number} failed:`,
            err,
          );
          const cfRating = p.difficulty
            ? parseInt(p.difficulty as string, 10)
            : null;
          return {
            problem_number: p.problem_number as number,
            label:
              cfRating !== null
                ? cfRatingToLabel(cfRating)
                : ("Medium" as DifficultyLabel),
            cf_rating: cfRating,
          };
        }),
      ),
    );

    for (const result of batchResults) {
      results.push({
        problem_number: result.problem_number,
        old: targets.find((t) => t.problem_number === result.problem_number)
          ?.difficulty as string | null,
        new: result.label,
        cf_rating: result.cf_rating,
      });
    }

    if (!dryRun) {
      await Promise.all(
        batchResults.map(({ problem_number, label }) =>
          supabase
            .from("problems")
            .update({ difficulty: label })
            .eq("problem_number", problem_number),
        ),
      );
    }
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.new] = (acc[r.new] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    dry_run: dryRun,
    classified: results.length,
    summary,
    results,
  });
}
