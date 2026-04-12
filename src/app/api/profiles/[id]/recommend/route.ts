import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/server";

type Problem = {
  problem_number: number;
  title: string;
  difficulty: string | null;
  tags: string[];
};

function fmt(p: Problem) {
  return `- #${p.problem_number} ${p.title} | difficulty: ${p.difficulty ?? "unknown"} | tags: ${p.tags.join(", ")}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const supabase = await createClient();

  // 1. Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("solved_problems, skill_level")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const solved: number[] = profile.solved_problems ?? [];

  // 2. Fetch metadata for solved problems
  let solvedDetails: Problem[] = [];
  if (solved.length > 0) {
    const { data } = await supabase
      .from("problems")
      .select("problem_number, title, difficulty, tags")
      .in("problem_number", solved);
    solvedDetails = (data as Problem[]) ?? [];
  }

  // 3. Fetch unsolved candidate problems
  const baseQuery = supabase
    .from("problems")
    .select("problem_number, title, difficulty, tags");
  const { data: candidates, error: candidatesError } = await (solved.length > 0
    ? baseQuery.not("problem_number", "in", `(${solved.join(",")})`)
    : baseQuery
  ).limit(20);

  if (candidatesError || !candidates || candidates.length === 0) {
    return NextResponse.json(
      { error: "No unsolved problems available." },
      { status: 404 },
    );
  }

  const candidateProblems = candidates as Problem[];

  // 4. Build prompt
  const solvedList =
    solvedDetails.length > 0 ? solvedDetails.map(fmt).join("\n") : "None yet";
  const candidateList = candidateProblems.map(fmt).join("\n");

  const prompt = `You are a competitive programming coach. A user has solved the following problems:\n${solvedList}\n\nTheir skill level is: ${profile.skill_level}\n\nFrom the list of available unsolved problems below, recommend exactly ONE problem that would be a good next challenge for them. Choose based on difficulty progression, tag variety, and skill level.\n\nAvailable problems:\n${candidateList}\n\nRespond with valid JSON only, in this exact shape:\n{"recommended_problem_number": <number>, "reasoning": "<one or two sentences>"}\n\nDo not include any text outside the JSON object.`;

  // 5. Call OpenRouter
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      signal: controller.signal,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach OpenRouter." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await aiRes.text();

  if (!aiRes.ok) {
    return NextResponse.json(
      { error: `OpenRouter responded with ${aiRes.status}: ${rawText}` },
      { status: 502 },
    );
  }

  const aiBody = JSON.parse(rawText) as {
    choices: { message: { content: string } }[];
  };
  const aiText = aiBody.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences in case the model wraps the JSON
  const trimmed = aiText.slice(
    aiText.indexOf("{"),
    aiText.lastIndexOf("}") + 1,
  );

  let aiJson: { recommended_problem_number: number; reasoning: string };
  try {
    aiJson = JSON.parse(trimmed) as typeof aiJson;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response." },
      { status: 500 },
    );
  }

  const match = candidateProblems.find(
    (c) => c.problem_number === aiJson.recommended_problem_number,
  );

  return NextResponse.json({
    recommended_problem_number: match?.problem_number ?? null,
    title: match?.title ?? null,
    difficulty: match?.difficulty ?? null,
    tags: match?.tags ?? [],
    reasoning: aiJson.reasoning ?? null,
  });
}
