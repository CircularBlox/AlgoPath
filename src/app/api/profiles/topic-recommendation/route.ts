import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { createClient, getUser } from "~/lib/supabase/server";

type Problem = { tags: string[]; difficulty: string | null };

/** GET /api/profiles/topic-recommendation
 *  Returns { tag: string, reason: string } — the AI-chosen next topic for the user.
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("solved_problems, rating, focus")
    .eq("id", user.id)
    .single();

  const solved: number[] = (profile?.solved_problems as number[] | null) ?? [];
  const rating: number = (profile?.rating as number | null) ?? 1200;
  const focus: string | null = (profile?.focus as string | null) ?? null;

  // Fetch tags for solved problems
  const tagFreq: Record<string, number> = {};
  if (solved.length > 0) {
    const { data: problems } = await supabase
      .from("problems")
      .select("tags, difficulty")
      .in("problem_number", solved.slice(-50));

    for (const p of (problems as Problem[] | null) ?? []) {
      for (const tag of p.tags ?? []) {
        tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
      }
    }
  }

  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => `${tag} (${count} solved)`);

  const focusLabel =
    focus === "interviews"
      ? "interview prep (LeetCode style)"
      : focus === "comp_programming"
        ? "competitive programming (Codeforces/USACO style)"
        : "both interview prep and competitive programming";

  const prompt =
    solved.length < 5
      ? `A new competitive programmer (rating ~${rating}) is just getting started with ${focusLabel}. Recommend ONE beginner-friendly topic for them to drill next.`
      : `A competitive programmer with rating ${rating} focusing on ${focusLabel} has solved ${solved.length} problems. Their most-practiced topics: ${topTags.join(", ") || "none yet"}. Recommend ONE topic for them to work on next to grow the most.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a competitive programming coach. Respond ONLY with valid JSON: {"tag":"<topic name>","reason":"<1-2 sentences explaining why this topic will help them most right now>"}',
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 120,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { tag?: string; reason?: string };

    if (!parsed.tag || !parsed.reason) {
      throw new Error("Malformed AI response");
    }

    return NextResponse.json({ tag: parsed.tag, reason: parsed.reason });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "profiles/topic-recommendation" },
    });
    // Graceful fallback — return a sensible default rather than an error
    const fallback =
      solved.length === 0
        ? {
            tag: "arrays",
            reason:
              "Arrays are the foundation of almost every algorithm. Mastering them first makes everything else easier.",
          }
        : {
            tag: "dynamic programming",
            reason:
              "Dynamic programming unlocks a huge class of problems across both interviews and contests.",
          };
    return NextResponse.json(fallback);
  }
}
