import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { createClient } from "~/lib/supabase/server";

const ALLOWED_MODELS = [
  "qwen/qwq-32b:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
];
const ALLOWED_STYLES = ["structured", "socratic", "minimal"] as const;

export async function PATCH(request: NextRequest) {
  if (!(await validateCsrfToken(request.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    preferred_hint_model?: string | null;
    hint_style?: string;
    adaptive_difficulty?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();
  const plan = profile?.plan ?? "free";

  const updates: Record<string, unknown> = {};

  if ("preferred_hint_model" in body) {
    if (plan === "free") {
      return NextResponse.json(
        { error: "Model selection requires a Pro or Elite plan." },
        { status: 403 },
      );
    }
    if (
      body.preferred_hint_model !== null &&
      !ALLOWED_MODELS.includes(body.preferred_hint_model ?? "")
    ) {
      return NextResponse.json({ error: "Unknown model." }, { status: 400 });
    }
    updates.preferred_hint_model = body.preferred_hint_model ?? null;
  }

  if ("hint_style" in body) {
    if (plan !== "elite") {
      return NextResponse.json(
        { error: "Hint style requires an Elite plan." },
        { status: 403 },
      );
    }
    if (
      !ALLOWED_STYLES.includes(
        body.hint_style as (typeof ALLOWED_STYLES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid hint style." },
        { status: 400 },
      );
    }
    updates.hint_style = body.hint_style;
  }

  if ("adaptive_difficulty" in body) {
    if (plan !== "elite") {
      return NextResponse.json(
        { error: "Adaptive difficulty requires an Elite plan." },
        { status: 403 },
      );
    }
    updates.adaptive_difficulty = !!body.adaptive_difficulty;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, { tags: { route: "preferences" } });
    return NextResponse.json(
      { error: "Failed to update preferences." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
