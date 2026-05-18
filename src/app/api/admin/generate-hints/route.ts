import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/is-admin";
import { routedCompletion } from "~/lib/model-router";
import { createClient, getUser } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Defense-in-depth: verify admin even if middleware already checked
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { problem_number?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const problemNumber = Number(body.problem_number);
  if (!problemNumber || Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "problem_number is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Resolve problem_number → UUID, validate problem exists
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id, title, difficulty, tags, content, url")
    .eq("problem_number", problemNumber)
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const tags = (problem.tags as string[] | null) ?? [];
  const contentSnippet = problem.content
    ? `\n\nProblem statement (excerpt):\n${problem.content.replace(/<[^>]+>/g, " ").slice(0, 800)}`
    : "";

  const prompt = `You are writing three short, progressive hints for a competitive programming problem. The hints should feel like a Socratic mentor — each one is a question or a tiny observation that plants a seed, not a nudge toward the answer. The solver should finish reading each hint and think "hm, interesting…" rather than "oh I should do X".

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? "unknown"}
Tags (your reference only — do NOT name or hint at them): ${tags.join(", ") || "none"}
URL: ${problem.url}${contentSnippet}

Respond with only this JSON object:
{"hint_1": "...", "hint_2": "...", "hint_3": "..."}

Rules:
- Each hint is exactly 1–2 sentences. No exceptions.
- Phrase each hint as a question, or a small observation that raises a question in the reader's mind.
- Be specific to this problem — refer to its actual elements, constraints, or structure.
- Use $term$ to highlight key terms from the problem (e.g. $target$, $index$).
- Never name algorithms, data structures, or time complexities.
- Never state what to do — only ask what the solver might notice or wonder about.
- No labels, bullets, or headers inside the hint text.`;

  const result = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "balanced",
    apiKey,
    timeoutMs: 45000,
  });

  if (!result.ok) {
    Sentry.captureMessage(result.error, {
      level: "error",
      tags: { route: "generate-hints", step: "routed-completion" },
      extra: { problem_number: problemNumber },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const aiText = result.content;
  const trimmed = aiText.slice(
    aiText.indexOf("{"),
    aiText.lastIndexOf("}") + 1,
  );

  let hints: { hint_1?: string; hint_2?: string; hint_3?: string };
  try {
    hints = JSON.parse(trimmed) as typeof hints;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "generate-hints", step: "parse_hints" },
    });
    return NextResponse.json(
      { error: "Failed to parse AI response." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    hint_1: hints.hint_1 ?? null,
    hint_2: hints.hint_2 ?? null,
    hint_3: hints.hint_3 ?? null,
  });
}
