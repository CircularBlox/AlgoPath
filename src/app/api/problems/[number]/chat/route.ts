import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import {
  CHAT_MAX_MESSAGES,
  CODE_MAX_LENGTH,
  PROMPT_MAX_LENGTH,
  REVIEW_COOLDOWN_MS,
  REVIEW_DAILY_LIMIT,
} from "~/lib/constants";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { getAuthContext } from "~/lib/is-admin";
import { isSameOrigin } from "~/lib/security";
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

  let body: {
    prompt?: unknown;
    code?: unknown;
    language?: unknown;
    messages?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const language =
    typeof body.language === "string" ? body.language.trim() : "C++";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }
  if (prompt.length > PROMPT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Prompt is too long (max ${PROMPT_MAX_LENGTH} characters).` },
      { status: 400 },
    );
  }
  if (code.length > CODE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Code is too long (max ${CODE_MAX_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Per-session message cap (applies to everyone, including admins)
  if (messages.length >= CHAT_MAX_MESSAGES) {
    return NextResponse.json(
      {
        error: `Chat limit reached (${CHAT_MAX_MESSAGES} messages per session). Start a new review.`,
      },
      { status: 429 },
    );
  }

  let recentReviews: { created_at: string }[] = [];

  if (!admin) {
    // Rate limit — shared with /review
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
      return NextResponse.json(
        { error: "Failed to check rate limits." },
        { status: 500 },
      );
    }

    recentReviews = data ?? [];

    if (recentReviews.length >= REVIEW_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `You've used all ${REVIEW_DAILY_LIMIT} AI requests for today. Come back tomorrow!`,
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
            error: `Please wait ${remaining}s before sending another message.`,
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

  // Record before calling AI to prevent concurrent abuse (skip for admins)
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

  const systemPrompt = `You are a mentor helping a competitive programmer improve. You are reviewing their ${language} code for the problem below and answering their follow-up questions. Guide them without giving the full solution or rewriting their code.

Problem: ${problem.title}
Difficulty: ${problem.difficulty ?? "unknown"}
Tags (for your context only — do NOT name algorithms or data structures): ${
    tags.join(", ") || "none"
  }
${contentSnippet ? `Problem context: ${contentSnippet}\n` : ""}
${code ? `User's ${language} code:\n\`\`\`\n${code.slice(0, 5000)}\n\`\`\`` : "No code provided."}

Rules — follow these strictly:
- Keep responses concise (3–6 sentences max unless more depth is genuinely needed)
- You MAY mention time or space complexity (e.g. "This runs in O(n²) — think about whether O(n log n) is achievable")
- You MAY point out a logical error or edge case without giving the fix
- Do NOT provide working code, rewrites, or pseudocode
- Do NOT name specific algorithms or data structures
- Be encouraging and direct`;

  // Build conversation for the model — cap history to last 10 turns
  const aiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000),
    })),
    { role: "user", content: prompt },
  ];

  let aiRes: Response;
  try {
    aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost:3000",
        "X-Title": "CompetitiveProgrammingApp",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: aiMessages,
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach OpenRouter." },
      { status: 502 },
    );
  }

  const rawText = await aiRes.text();

  if (!aiRes.ok) {
    return NextResponse.json(
      { error: `OpenRouter responded with ${aiRes.status}.` },
      { status: 502 },
    );
  }

  let aiBody: { choices: { message: { content: string } }[] };
  try {
    aiBody = JSON.parse(rawText) as typeof aiBody;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response." },
      { status: 502 },
    );
  }

  const reply = aiBody.choices?.[0]?.message?.content?.trim() ?? "";
  if (!reply) {
    return NextResponse.json(
      { error: "AI returned empty response." },
      { status: 500 },
    );
  }

  const reviewsLeft = admin
    ? null
    : REVIEW_DAILY_LIMIT - (recentReviews.length + 1);
  const messagesLeft = CHAT_MAX_MESSAGES - (messages.length + 1);

  return NextResponse.json({
    reply,
    reviews_left: reviewsLeft,
    messages_left: messagesLeft,
  });
}
