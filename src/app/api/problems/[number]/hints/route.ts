import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { PLAN_LIMITS, todayUtc } from "~/lib/plan";
import { createClient } from "~/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const problemNumber = Number.parseInt(number, 10);
  if (Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Resolve problem_number → uuid, validate problem exists and get title
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id, title")
    .eq("problem_number", problemNumber)
    .single();

  if (problemError || !problem) {
    if (problemError)
      Sentry.captureException(problemError, {
        tags: { route: "hints", step: "resolve_problem" },
        extra: { problemNumber },
      });
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  // hints table has no uuid FK to problems (schema uses problem_number)
  const { data, error } = await supabase
    .from("hints")
    .select("*")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "hints", step: "fetch" },
      extra: { problemNumber },
    });
    return NextResponse.json(
      { error: "Failed to fetch hints." },
      { status: 500 },
    );
  }

  const hintsPayload = data ?? {
    id: null,
    problem_name: problem.title,
    problem_number: problemNumber,
    hint_1: null,
    hint_2: null,
    hint_3: null,
  };

  // Plan-based gating for authenticated free users
  let gated = false;
  let sessionsUsed = 0;
  const sessionsLimit = PLAN_LIMITS.free.hint_sessions_per_day;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single<{ plan: string }>();

    const plan = profile?.plan ?? "free";

    if (plan === "free") {
      const today = todayUtc();

      // Check if this problem was already opened today (idempotent)
      const { data: existing } = await supabase
        .from("hint_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("problem_number", problemNumber)
        .eq("session_date", today)
        .maybeSingle();

      if (!existing) {
        // Count sessions already used today
        const { count } = await supabase
          .from("hint_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("session_date", today);

        sessionsUsed = count ?? 0;

        if (sessionsUsed >= sessionsLimit) {
          gated = true;
        } else {
          await supabase.from("hint_sessions").insert({
            user_id: user.id,
            problem_number: problemNumber,
            session_date: today,
          });
          sessionsUsed += 1;
        }
      } else {
        // Re-opening same problem today — look up current count
        const { count } = await supabase
          .from("hint_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("session_date", today);
        sessionsUsed = count ?? 1;
      }
    }
  }

  return NextResponse.json({
    ...hintsPayload,
    gated,
    sessions_used: sessionsUsed,
    sessions_limit: sessionsLimit,
  });
}
