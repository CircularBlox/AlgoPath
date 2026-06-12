import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/security/csrf";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, streak_frozen, streak_freeze_used_at, streak")
    .eq("id", user.id)
    .single<{
      plan: string;
      streak_frozen: boolean;
      streak_freeze_used_at: string | null;
      streak: number;
    }>();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const plan = profile.plan ?? "free";
  if (plan === "free") {
    return NextResponse.json(
      { error: "Streak freeze requires a Pro or Elite plan." },
      { status: 403 },
    );
  }

  if (profile.streak_frozen) {
    return NextResponse.json(
      { error: "A streak freeze is already active." },
      { status: 409 },
    );
  }

  if ((profile.streak ?? 0) === 0) {
    return NextResponse.json(
      { error: "No active streak to freeze." },
      { status: 400 },
    );
  }

  // Enforce 1 freeze per calendar month
  if (profile.streak_freeze_used_at) {
    const lastUsed = new Date(profile.streak_freeze_used_at);
    const now = new Date();
    if (
      lastUsed.getUTCFullYear() === now.getUTCFullYear() &&
      lastUsed.getUTCMonth() === now.getUTCMonth()
    ) {
      return NextResponse.json(
        { error: "You already used your streak freeze this month." },
        { status: 429 },
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      streak_frozen: true,
      streak_freeze_used_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, { tags: { route: "streak-freeze" } });
    return NextResponse.json(
      { error: "Failed to activate streak freeze." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, streak_frozen: true });
}
