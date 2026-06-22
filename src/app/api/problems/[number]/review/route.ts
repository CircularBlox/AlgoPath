import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  CODE_MAX_LENGTH,
  REVIEW_COOLDOWN_MS,
  REVIEW_DAILY_LIMIT,
} from "~/lib/constants";
import { routedCompletion } from "~/lib/model-router";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/security/csrf";
import { getAuthContext } from "~/lib/security/is-admin";
import { isSameOrigin } from "~/lib/security/security";
import { createClient } from "~/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!(await validateCsrfToken(request.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const { user, admin } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { number } = await params;
  const problemNumber = Number.parseInt(number, 10);
  if (Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  let body: { code?: unknown; language?: unknown; userPrompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const language =
    typeof body.language === "string" ? body.language.trim() : "C++";
  const userPrompt =
    typeof body.userPrompt === "string" ? body.userPrompt.trim() : "";

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (code.length > CODE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Code is too long (max ${CODE_MAX_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  let recentReviews: { created_at: string }[] = [];

  if (!admin) {
    // Rate limit: check recent requests
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const { data, error: reviewsError } = await supabase
      .from("code_reviews")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(REVIEW_DAILY_LIMIT + 1);

    if (reviewsError) {
      Sentry.captureException(reviewsError, {
        tags: { route: "review", step: "rate_limit_check" },
      });
      return NextResponse.json(
        { error: "Failed to check rate limits." },
        { status: 500 },
      );
    }

    recentReviews = data ?? [];

    if (recentReviews.length >= REVIEW_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `You've used all ${REVIEW_DAILY_LIMIT} reviews for today. Come back tomorrow!`,
        },
        { status: 429 },
      );
    }

    const lastReview = recentReviews[0];
    if (lastReview) {
      const remaining = Math.ceil(
        (new Date(lastReview.created_at).getTime() +
          REVIEW_COOLDOWN_MS -
          Date.now()) /
          1000,
      );
      if (remaining > 0) {
        return NextResponse.json(
          {
            error: `Please wait ${remaining}s before requesting another review.`,
          },
          { status: 429 },
        );
      }
    }
  }

  // Fetch problem context
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id, title, difficulty, tags, content")
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

  // Record the review before calling AI to prevent concurrent abuse (skip for admins)
  if (!admin) {
    await supabase.from("code_reviews").insert({
      user_id: user.id,
      problem_number: problemNumber,
    });
  }

  const tags = (problem.tags as string[] | null) ?? [];
  const contentSnippet = problem.content
    ? problem.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 600)
    : "";

  const focusInstruction = userPrompt
    ? `The user has a specific question or focus area: "${userPrompt}". Address this directly while still following all feedback rules.`
    : "Guide the user by identifying the most important thing they should think about next.";

  const prompt = `You are a mentor helping a competitive programmer improve. Review their code for the given problem and provide guiding feedback — do NOT give the solution or rewrite their code.

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? "unknown"}
Tags (for your context only — do NOT name algorithms or data structures): ${tags.join(", ") || "none"}
${contentSnippet ? `Problem context: ${contentSnippet}\n` : ""}
User's ${language} code:
\`\`\`
${code.slice(0, 5000)}
\`\`\`

${focusInstruction}

Feedback rules — follow these strictly:
- 3–5 sentences maximum, no bullet points
- You MAY mention time or space complexity (e.g. "This runs in O(n²) — think about whether O(n log n) is achievable")
- You MAY point out a logical error or edge case without giving the fix
- Do NOT provide working code, rewrites, or pseudocode
- Do NOT name specific algorithms or data structures
- If the approach looks correct, confirm it and note any efficiency concern
- Be encouraging and direct
- Close with one open question that nudges their thinking`;

  const completion = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "balanced",
    apiKey,
    timeoutMs: 30000,
  });

  if (!completion.ok) {
    Sentry.captureMessage(
      `Code review generation failed: ${completion.error}`,
      {
        level: "error",
        extra: { routing: completion.routing },
      },
    );
    return NextResponse.json(
      { error: "The AI reviewer is busy right now. Please try again." },
      { status: 502 },
    );
  }

  const feedback = completion.content.trim();
  if (!feedback) {
    Sentry.captureMessage("AI returned empty feedback in review", {
      level: "warning",
    });
    return NextResponse.json(
      { error: "AI returned empty feedback." },
      { status: 500 },
    );
  }

  const reviewsLeft = admin
    ? null
    : REVIEW_DAILY_LIMIT - (recentReviews.length + 1);

  return NextResponse.json({ feedback, reviews_left: reviewsLeft });
}
