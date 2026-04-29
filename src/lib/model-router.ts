import * as Sentry from "@sentry/nextjs";

export type TaskType = "fast" | "balanced" | "reasoning";

type ModelDef = {
  id: string;
  label: string;
  taskTypes: TaskType[];
};

// OpenRouter model IDs in priority order per task type.
// Order within a task type = preference (first = most preferred).
const MODELS: ModelDef[] = [
  {
    id: "microsoft/mai-ds-r1:free",
    label: "gpt-oss-20b",
    taskTypes: ["fast", "balanced"],
  },
  {
    id: "nvidia/nemotron-nano-3-4b-instruct:free",
    label: "Nemotron 3 Nano 30B A3B",
    taskTypes: ["balanced", "reasoning"],
  },
  {
    id: "microsoft/mai-ds-r1:free",
    label: "gpt-oss-120b",
    taskTypes: ["reasoning"],
  },
  {
    id: "liquid/lfm-2.5:free",
    label: "LFM2.5-1.2B-Instruct",
    taskTypes: ["fast"],
  },
];

// Status codes that mean "this model is unavailable right now"
const UNAVAILABLE_STATUSES = new Set([429, 503, 529]);

export type RouterResult = {
  selected_model: string;
  reason: string;
  fallback_used: boolean;
};

export type CompletionRequest = {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  taskType?: TaskType;
  apiKey: string;
  timeoutMs?: number;
};

export type CompletionResult =
  | { ok: true; content: string; routing: RouterResult }
  | { ok: false; error: string; routing: RouterResult | null };

/**
 * Calls OpenRouter, automatically routing to the best available model for the
 * given task type. Tries each candidate in order and falls back on rate-limit
 * or quota errors.
 */
export async function routedCompletion(
  req: CompletionRequest,
): Promise<CompletionResult> {
  const taskType = req.taskType ?? "balanced";
  const timeout = req.timeoutMs ?? 30000;

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
          Authorization: `Bearer ${req.apiKey}`,
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
