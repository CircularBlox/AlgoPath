import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { buildHintPrompt } from "~/lib/hint-prompt";
import { routedCompletion } from "~/lib/model-router";
import { isAdmin } from "~/lib/security/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient, getUser } from "~/lib/supabase/server";

export const maxDuration = 60;

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
  gen: {
    apiKey?: string;
    provider: "openrouter" | "ollama";
    ollamaBaseUrl: string;
    ollamaModel: string;
    timeoutMs: number;
  },
): Promise<HintResult> {
  const prompt = buildHintPrompt({
    content: problem.content as string | null,
    difficulty: problem.difficulty as string | null,
    tags: problem.tags as string[] | null,
  });

  const result = await routedCompletion({
    messages: [{ role: "user", content: prompt }],
    taskType: "balanced",
    apiKey: gen.apiKey,
    provider: gen.provider,
    ollamaBaseUrl: gen.ollamaBaseUrl,
    ollamaModel: gen.ollamaModel,
    timeoutMs: gen.timeoutMs,
  });

  if (!result.ok) {
    Sentry.captureMessage(result.error, {
      level: "error",
      tags: { route: "generate-hints-bulk", step: "routed-completion" },
      extra: { problem_number: problem.problem_number },
    });
    return { ok: false, error: result.error };
  }

  try {
    const aiText = result.content;
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
  } catch {
    return { ok: false, error: "Failed to parse AI response as JSON" };
  }
}

export async function GET(_request: NextRequest) {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const useOllama = env.HINT_PROVIDER === "ollama";
  const apiKey = env.OPENROUTER_API_KEY as string | undefined;
  if (!useOllama && !apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set." },
      { status: 500 },
    );
  }
  const gen = {
    apiKey,
    provider: (useOllama ? "ollama" : "openrouter") as "ollama" | "openrouter",
    ollamaBaseUrl: env.OLLAMA_BASE_URL,
    ollamaModel: env.OLLAMA_MODEL,
    // Ollama on an 8GB Air is slow per-problem; give it room. (Local dev has no
    // Vercel 60s cap, so this only applies when running the batch locally.)
    timeoutMs: useOllama ? 120000 : 30000,
  };

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

        // Retry up to 2 times with backoff for transient failures
        let result: HintResult = { ok: false, error: "Not attempted" };
        for (let attempt = 0; attempt <= 2; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 4000 * attempt));
          }
          result = await generateHintsForProblem(problem, gen);
          if (result.ok) break;
        }

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
          await new Promise((r) => setTimeout(r, 2000));
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
