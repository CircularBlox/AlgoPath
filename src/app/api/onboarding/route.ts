import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
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
    focus?: string | null;
    skill_level?: string | null;
    cp_goal?: string | null;
    preferred_languages?: string[];
    daily_goal?: number | null;
    starting_rating?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    focus,
    skill_level,
    cp_goal,
    preferred_languages,
    daily_goal,
    starting_rating,
  } = body;

  const update: Record<string, unknown> = { onboarding_completed: true };

  const VALID_FOCUS = ["interviews", "comp_programming", "both"];
  if (focus && VALID_FOCUS.includes(focus)) {
    update.focus = focus;
  }

  const VALID_SKILLS = ["beginner", "intermediate", "advanced"];
  if (skill_level && VALID_SKILLS.includes(skill_level)) {
    update.skill_level = skill_level;
  }

  const VALID_GOALS = ["contests", "interviews", "learning", "fun"];
  if (cp_goal && VALID_GOALS.includes(cp_goal)) {
    update.cp_goal = cp_goal;
  }

  if (Array.isArray(preferred_languages) && preferred_languages.length > 0) {
    update.preferred_languages = preferred_languages.slice(0, 10);
  }

  if (typeof daily_goal === "number" && daily_goal >= 1) {
    update.daily_goal = daily_goal;
  }

  if (
    typeof starting_rating === "number" &&
    starting_rating >= 400 &&
    starting_rating <= 3000
  ) {
    update.rating = starting_rating;
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "onboarding" },
      extra: { userId: user.id },
    });
    return NextResponse.json(
      { error: "Failed to save onboarding data." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
