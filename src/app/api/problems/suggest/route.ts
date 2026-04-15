import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const supabase = await createClient();

  // Get solved problems for logged-in users so we can exclude them
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let solvedNumbers: number[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("solved_problems")
      .eq("id", user.id)
      .single();
    solvedNumbers = (profile?.solved_problems as number[] | null) ?? [];
  }

  let problemQuery = supabase
    .from("problems")
    .select("id, problem_number, title, difficulty, tags, platform")
    .limit(100);

  // Exclude already-solved problems from the candidate pool
  if (solvedNumbers.length > 0) {
    problemQuery = problemQuery.not(
      "problem_number",
      "in",
      `(${solvedNumbers.join(",")})`,
    );
  }

  const { data: allProblems, error: fetchError } = await problemQuery;

  if (fetchError || !allProblems || allProblems.length === 0) {
    return NextResponse.json(
      { error: "Failed to fetch problems." },
      { status: 500 },
    );
  }

  const problemList = allProblems
    .map(
      (p) =>
        `- #${p.problem_number} ${p.title} | difficulty: ${p.difficulty ?? "unknown"} | tags: ${(p.tags as string[]).join(", ")} | platform: ${p.platform}`,
    )
    .join("\n");

  const prompt = `You are a competitive programming assistant. A user is looking for a problem matching this description:\n"${query}"\n\nFrom the following list of problems, pick the 1 to 3 that best match. Consider title, difficulty, tags, and platform.\n\nProblems:\n${problemList}\n\nRespond with a JSON object containing exactly these two keys:\n- "problem_numbers": array of matched problem numbers\n- "reasoning": a short conversational message (2-3 sentences) addressed to the user explaining what you found. Mention why it matches their description (e.g. difficulty, topic area, platform) but do NOT reveal any algorithmic approaches, data structures, or hints about how to solve the problem.\n\nExample: {"problem_numbers": [2], "reasoning": "This one looks like a great match for what you described! It's a well-known array problem on LeetCode, rated Easy."}\n\nDo not include any text outside the JSON object.`;

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
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
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
      { error: `OpenRouter responded with ${aiRes.status}: ${rawText}` },
      { status: 502 },
    );
  }

  let aiBody: { choices: { message: { content: string } }[] };
  try {
    aiBody = JSON.parse(rawText) as typeof aiBody;
  } catch {
    return NextResponse.json(
      { error: `OpenRouter returned non-JSON: ${rawText.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const aiText = aiBody.choices?.[0]?.message?.content ?? "";

  const trimmed = aiText.slice(
    aiText.indexOf("{"),
    aiText.lastIndexOf("}") + 1,
  );

  let aiJson: { problem_numbers: number[]; reasoning?: string };
  try {
    aiJson = JSON.parse(trimmed) as typeof aiJson;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response." },
      { status: 500 },
    );
  }

  const numbers = aiJson.problem_numbers ?? [];
  const reasoning = aiJson.reasoning?.trim() || null;

  if (numbers.length > 0) {
    const { data: matched, error: matchError } = await supabase
      .from("problems")
      .select("*")
      .in("problem_number", numbers);

    const ordered = (matched ?? [])
      .filter(Boolean)
      .sort(
        (a, b) =>
          numbers.indexOf(a.problem_number) - numbers.indexOf(b.problem_number),
      );

    if (!matchError && ordered.length > 0) {
      return NextResponse.json({
        reasoning: reasoning ?? "Here are some problems I found for you!",
        problems: ordered,
      });
    }
  }

  // Fallback: pick a random unsolved problem
  const { count } = await supabase
    .from("problems")
    .select("*", { count: "exact", head: true });
  const offset = Math.floor(Math.random() * (count ?? allProblems.length));
  const { data: fallback } = await supabase
    .from("problems")
    .select("*")
    .range(offset, offset)
    .single();

  return NextResponse.json({
    reasoning:
      "I couldn't find an exact match, but here's one to try — give it a shot!",
    problems: fallback ? [fallback] : [],
  });
}
