import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();

  const plan = profile?.plan ?? "free";
  if (plan === "free") {
    return NextResponse.json(
      { error: "Hint history requires a Pro or Elite plan." },
      { status: 403 },
    );
  }

  // Pro gets last session only; Elite gets full history
  let q = supabase
    .from("hint_sessions")
    .select("session_date")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber)
    .order("session_date", { ascending: false });
  if (plan === "pro") q = q.limit(1);

  const { data, error } = await q;

  if (error) {
    Sentry.captureException(error, { tags: { route: "hint-history" } });
    return NextResponse.json(
      { error: "Failed to fetch hint history." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sessions: (data ?? []).map((r) => r.session_date),
  });
}
