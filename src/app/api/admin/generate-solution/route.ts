import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { routedCompletion } from "~/lib/model-router";
import { getAuthContext } from "~/lib/security/is-admin";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { admin } = await getAuthContext();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: {
    problem_number?: unknown;
    language?: unknown;
    type?: unknown;
    codes?: unknown;
  };
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

  const isExplanation = body.type === "explanation";
  const language = typeof body.language === "string" ? body.language : null;

  if (!isExplanation && !language) {
    return NextResponse.json(
      { error: "Either language or type=explanation is required." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("title, difficulty, tags, content")
    .eq("problem_number", problemNumber)
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const tags = (problem.tags as string[] | null) ?? [];
  const tagsStr = tags.join(", ") || "none";

  let prompt: string;

  if (isExplanation) {
    prompt = `Write a concise explanation for this competitive programming solution. Cover: key insight, algorithm and approach, time/space complexity. Format: 2-3 paragraphs. Use **bold** for key concepts and \`backticks\` for variable names. No headers.

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? "unknown"}
Tags: ${tagsStr}`;
  } else {
    const contentSnippet = problem.content
      ? `\n\n${problem.content.replace(/<[^>]+>/g, " ").slice(0, 1200)}`
      : "";
    prompt = `You are an expert competitive programmer. Write a correct, clean, idiomatic ${language} solution for this problem. Return ONLY the code — no markdown fences, no explanation, no comments. Just the raw code.

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? "unknown"}
Tags: ${tagsStr}${contentSnippet}`;
  }

  const result = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "reasoning",
    apiKey: env.OPENROUTER_API_KEY,
    timeoutMs: 60000,
  });

  if (!result.ok) {
    Sentry.captureMessage(result.error, {
      level: "error",
      tags: { route: "admin/generate-solution" },
      extra: { problemNumber, language, isExplanation },
    });
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  let content = result.content.trim();

  if (!isExplanation) {
    // Strip markdown code fences if the model wrapped the response
    content = content
      .replace(/^```[\w+#-]*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    return NextResponse.json({ code: content });
  }

  return NextResponse.json({ explanation: content });
}
