import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/security/csrf";
import { isAdmin } from "~/lib/security/is-admin";
import { createClient, getUser } from "~/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await validateCsrfToken(req.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { number } = await params;
  const problemNumber = Number.parseInt(number, 10);
  if (Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  let body: {
    description?: string;
    type?: string;
    suggested_difficulty?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const type = body.type === "difficulty" ? "difficulty" : "general";
  const suggestedDifficulty = (body.suggested_difficulty ?? "").trim() || null;

  if (type === "difficulty") {
    if (!suggestedDifficulty) {
      return NextResponse.json(
        { error: "Suggested difficulty is required." },
        { status: 400 },
      );
    }
    const num = Number(suggestedDifficulty);
    if (Number.isNaN(num) || num < 100 || num > 4000) {
      return NextResponse.json(
        {
          error: "Suggested difficulty must be a number between 100 and 4000.",
        },
        { status: 400 },
      );
    }
  }

  const description = (body.description ?? "").trim();
  if (type === "general" && !description) {
    return NextResponse.json(
      { error: "Description is required." },
      { status: 400 },
    );
  }
  if (description.length > 1000) {
    return NextResponse.json(
      { error: "Description must be 1000 characters or fewer." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const admin = isAdmin(user.email);

  if (!admin) {
    // Anti-spam: max 3 reports per user per day (across all types)
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const { count: dailyCount } = await supabase
      .from("problem_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayUtc.toISOString());

    if ((dailyCount ?? 0) >= 3) {
      return NextResponse.json(
        { error: "You've reached the daily report limit (3 per day)." },
        { status: 429 },
      );
    }

    // Anti-spam: one report of each type per problem per user
    const { data: existing } = await supabase
      .from("problem_reports")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_number", problemNumber)
      .eq("type", type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            type === "difficulty"
              ? "You've already suggested a difficulty for this problem."
              : "You've already reported this problem.",
        },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase.from("problem_reports").insert({
    problem_number: problemNumber,
    user_id: user.id,
    description: description || null,
    type,
    suggested_difficulty: suggestedDifficulty,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "report" },
      extra: { problemNumber, userId: user.id, type },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
