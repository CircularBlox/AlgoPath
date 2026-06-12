import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { buildHintPrompt } from "~/lib/hint-prompt";
import { routedCompletion } from "~/lib/model-router";
import { isAdmin } from "~/lib/security/is-admin";
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

  const useOllama = env.HINT_PROVIDER === "ollama";
  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!useOllama && !apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const prompt = buildHintPrompt({
    content: problem.content as string | null,
    difficulty: problem.difficulty as string | null,
    tags: problem.tags as string[] | null,
  });

  const result = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "balanced",
    apiKey,
    provider: useOllama ? "ollama" : "openrouter",
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
    ollamaModel: env.OLLAMA_MODEL,
    timeoutMs: useOllama ? 120000 : 45000,
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
