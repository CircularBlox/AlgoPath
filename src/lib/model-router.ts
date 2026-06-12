import * as Sentry from "@sentry/nextjs";

export type TaskType = "fast" | "balanced" | "reasoning";

type ModelDef = {
  id: string;
  label: string;
  taskTypes: TaskType[];
};

// OpenRouter model IDs in priority order per task type.
// Order within a task type = preference (first = most preferred).
// Free OpenAI (gpt-oss) models are preferred per project policy; the rest are
// live fallbacks. Verified available on OpenRouter 2026-06-10 — the prior list
// (qwq-32b, deepseek-r1, gemma-3-27b, mistral-small-3.1, llama-3.1-8b) was all
// deprecated and 404ing.
const MODELS: ModelDef[] = [
  {
    id: "openai/gpt-oss-120b:free",
    label: "GPT-OSS 120B",
    taskTypes: ["balanced", "reasoning"],
  },
  {
    id: "openai/gpt-oss-20b:free",
    label: "GPT-OSS 20B",
    taskTypes: ["fast", "balanced"],
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B",
    taskTypes: ["balanced", "reasoning"],
  },
  {
    id: "qwen/qwen3-coder:free",
    label: "Qwen3 Coder",
    taskTypes: ["fast", "balanced"],
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    taskTypes: ["balanced"],
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    label: "Llama 3.2 3B",
    taskTypes: ["fast"],
  },
];

// Status codes that mean "this model is unavailable right now"
const UNAVAILABLE_STATUSES = new Set([404, 429, 503, 529]);

export type RouterResult = {
  selected_model: string;
  reason: string;
  fallback_used: boolean;
};

export type CompletionRequest = {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  taskType?: TaskType;
  /** Required for the "openrouter" provider; ignored for "ollama". */
  apiKey?: string;
  timeoutMs?: number;
  /** Defaults to "openrouter". "ollama" hits a local server, no fallback chain. */
  provider?: "openrouter" | "ollama";
  /** Ollama-only. Defaults to http://localhost:11434. */
  ollamaBaseUrl?: string;
  /** Ollama-only. The single pinned model to use. */
  ollamaModel?: string;
};

export type CompletionResult =
  | { ok: true; content: string; routing: RouterResult }
  | { ok: false; error: string; routing: RouterResult | null };

/**
 * Calls a local Ollama server via its OpenAI-compatible endpoint. Uses a single
 * pinned model (no fallback chain) so hints stay consistent across problems.
 * Intended for local admin hint generation only — Ollama runs on the operator's
 * machine and is unreachable from Vercel production.
 */
async function ollamaCompletion(
  req: CompletionRequest,
): Promise<CompletionResult> {
  const baseUrl = (req.ollamaBaseUrl ?? "http://localhost:11434").replace(
    /\/$/,
    "",
  );
  const model = req.ollamaModel ?? "qwen2.5-coder:7b";
  const timeout = req.timeoutMs ?? 120000;

  const routing: RouterResult = {
    selected_model: `ollama/${model}`,
    reason: `Local Ollama model "${model}" (HINT_PROVIDER=ollama)`,
    fallback_used: false,
  };

  let rawText = "";
  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: req.messages, stream: false }),
      signal: AbortSignal.timeout(timeout),
    });

    rawText = await res.text();

    if (!res.ok) {
      const error =
        res.status === 404
          ? `Ollama model "${model}" not found — run \`ollama pull ${model}\` (status 404).`
          : `Ollama (${model}) returned ${res.status}: ${rawText.slice(0, 160)}`;
      Sentry.captureMessage(`[model-router] ${error}`, {
        level: "warning",
        tags: { provider: "ollama", model, status: String(res.status) },
      });
      return { ok: false, error, routing };
    }

    const body = JSON.parse(rawText) as {
      choices: { message: { content: string } }[];
    };
    const content = body.choices?.[0]?.message?.content ?? "";
    return { ok: true, content, routing };
  } catch (err) {
    const isConn =
      err instanceof Error &&
      /fetch failed|ECONNREFUSED|terminated/i.test(err.message);
    const error = isConn
      ? `Cannot reach Ollama at ${baseUrl}. Is it running? Start it in a second terminal (see scripts/ollama-hints.sh).`
      : err instanceof Error
        ? err.message
        : "Unknown Ollama error";
    Sentry.captureException(err, {
      tags: { lib: "model-router", provider: "ollama", model },
      extra: { rawText: rawText.slice(0, 200) },
    });
    return { ok: false, error, routing };
  }
}

/**
 * Calls OpenRouter, automatically routing to the best available model for the
 * given task type. Tries each candidate in order and falls back on rate-limit
 * or quota errors.
 */
export async function routedCompletion(
  req: CompletionRequest,
): Promise<CompletionResult> {
  if (req.provider === "ollama") {
    return ollamaCompletion(req);
  }

  if (!req.apiKey) {
    return {
      ok: false,
      error: "OPENROUTER_API_KEY is not set.",
      routing: null,
    };
  }
  const apiKey = req.apiKey;

  const taskType = req.taskType ?? "balanced";
  const timeout = req.timeoutMs ?? 45000;

  const candidates = MODELS.filter((m) => m.taskTypes.includes(taskType));
  if (candidates.length === 0) {
    return {
      ok: false,
      error: `No models registered for task type "${taskType}"`,
      routing: null,
    };
  }

  let lastError = "";
  let fallbackUsed = false;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    if (i > 0) fallbackUsed = true;

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
          model: model.id,
          messages: req.messages,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      rawText = await res.text();

      if (UNAVAILABLE_STATUSES.has(res.status)) {
        lastError = `${model.label} returned ${res.status}`;
        continue;
      }

      if (!res.ok) {
        lastError = `${model.label} returned ${res.status}: ${rawText.slice(0, 120)}`;
        Sentry.captureMessage(`[model-router] ${lastError}`, {
          level: "warning",
          tags: { model: model.id, status: String(res.status) },
        });
        continue;
      }

      const body = JSON.parse(rawText) as {
        choices: { message: { content: string } }[];
      };
      const content = body.choices?.[0]?.message?.content ?? "";

      const routing: RouterResult = {
        selected_model: model.label,
        reason: fallbackUsed
          ? `Previous models unavailable (${lastError}); fell back to ${model.label}`
          : `${model.label} selected as primary for task type "${taskType}"`,
        fallback_used: fallbackUsed,
      };

      return { ok: true, content, routing };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      Sentry.captureException(err, {
        tags: { lib: "model-router", model: model.id },
        extra: { rawText: rawText.slice(0, 200) },
      });
    }
  }

  return {
    ok: false,
    error: `All models exhausted. Last error: ${lastError}`,
    routing: {
      selected_model: "none",
      reason: `All candidates failed for task type "${taskType}": ${lastError}`,
      fallback_used: true,
    },
  };
}
