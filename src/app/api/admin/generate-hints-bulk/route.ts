import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient, getUser } from "~/lib/supabase/server";

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

type HintResult =
  | { ok: true; hint_1: string; hint_2: string; hint_3: string }
  | { ok: false; error: string };

async function generateHintsForProblem(
  problem: {
    problem_number: number;
    title: string;
    difficulty: unknown;
    tags: unknown;
    content: unknown;
    url: unknown;
  },
  apiKey: string,
): Promise<HintResult> {
  const tags = (problem.tags as string[] | null) ?? [];
  const contentSnippet = problem.content
    ? `\n\nProblem statement (excerpt):\n${(problem.content as string).replace(/<[^>]+>/g, " ").slice(0, 800)}`
    : "";

  const prompt = `You are writing three short, progressive hints for a competitive programming problem. The hints should feel like a Socratic mentor — each one is a question or a tiny observation that plants a seed, not a nudge toward the answer. The solver should finish reading each hint and think "hm, interesting…" rather than "oh I should do X".

Problem: ${problem.title}
Difficulty: ${(problem.difficulty as string | null) ?? "unknown"}
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

  let rawText = "";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      signal: AbortSignal.timeout(30000),
    });

    rawText = await res.text();

    if (!res.ok) {
      const reason = `OpenRouter ${res.status}: ${rawText.slice(0, 120)}`;
      Sentry.captureMessage(reason, {
        level: "error",
        tags: { route: "generate-hints-bulk", step: "openrouter" },
        extra: { problem_number: problem.problem_number },
      });
      return { ok: false, error: reason };
    }

    const aiBody = JSON.parse(rawText) as {
      choices: { message: { content: string } }[];
    };
    const aiText = aiBody.choices?.[0]?.message?.content ?? "";
    const trimmed = aiText.slice(
      aiText.indexOf("{"),
      aiText.lastIndexOf("}") + 1,
    );
    const hints = JSON.parse(trimmed) as {
      hint_1?: string;
      hint_2?: string;
      hint_3?: string;
    };

    if (!hints.hint_1 || !hints.hint_2 || !hints.hint_3) {
      return { ok: false, error: "Incomplete hints in AI response" };
    }
    return {
      ok: true,
      hint_1: hints.hint_1,
      hint_2: hints.hint_2,
      hint_3: hints.hint_3,
    };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "generate-hints-bulk", step: "generate" },
      extra: {
        problem_number: problem.problem_number,
        rawText: rawText.slice(0, 200),
      },
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET(_request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: allProblems } = await supabase
    .from("problems")
    .select("problem_number, title, difficulty, tags, content, url")
    .order("problem_number");

  const { data: hintedRows } = await adminSupabase
    .from("hints")
    .select("problem_number");

  const hintedSet = new Set(
    (hintedRows ?? []).map((h) => h.problem_number as number),
  );
  const toProcess = (allProblems ?? []).filter(
    (p) => !hintedSet.has(p.problem_number),
  );

  let succeeded = 0;
  let failed = 0;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "start", total: toProcess.length }));

      for (let i = 0; i < toProcess.length; i++) {
        const problem = toProcess[i];

        const result = await generateHintsForProblem(problem, apiKey);

        if (result.ok) {
          const { error } = await adminSupabase.from("hints").insert({
            problem_number: problem.problem_number,
            problem_name: problem.title,
            hint_1: result.hint_1,
            hint_2: result.hint_2,
            hint_3: result.hint_3,
          });

          if (error) {
            Sentry.captureException(error, {
              tags: { route: "generate-hints-bulk", step: "insert" },
              extra: { problem_number: problem.problem_number },
            });
            failed++;
            controller.enqueue(
              sse({
                type: "progress",
                current: i + 1,
                total: toProcess.length,
                problem_number: problem.problem_number,
                title: problem.title,
                success: false,
                error: error.message,
              }),
            );
          } else {
            succeeded++;
            controller.enqueue(
              sse({
                type: "progress",
                current: i + 1,
                total: toProcess.length,
                problem_number: problem.problem_number,
                title: problem.title,
                success: true,
              }),
            );
          }
        } else {
          failed++;
          controller.enqueue(
            sse({
              type: "progress",
              current: i + 1,
              total: toProcess.length,
              problem_number: problem.problem_number,
              title: problem.title,
              success: false,
              error: result.error,
            }),
          );
        }

        if (i < toProcess.length - 1) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      controller.enqueue(sse({ type: "done", succeeded, failed }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
