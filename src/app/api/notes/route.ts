import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { PLAN_LIMITS, todayUtc } from "~/lib/plan";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const problemNumberParam = new URL(request.url).searchParams.get(
    "problem_number",
  );
  const filterByProblem = problemNumberParam
    ? Number(problemNumberParam)
    : null;

  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select(
      "id, title, content, code, code_language, problem_number, updated_at, created_at",
    )
    .order("updated_at", { ascending: false });

  if (filterByProblem && !Number.isNaN(filterByProblem)) {
    query = query.eq("problem_number", filterByProblem);
  }

  const { data, error } = await query;

  if (error) {
    Sentry.captureException(error, { tags: { route: "notes", method: "GET" } });
    return NextResponse.json(
      { error: "Failed to fetch notes." },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: {
    title?: string;
    content?: string;
    code?: string;
    code_language?: string;
    problem_number?: number | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const supabase = await createClient();

  // Enforce daily note creation limit for free users
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();
  const plan = profile?.plan ?? "free";
  if (plan === "free") {
    const today = todayUtc();
    const { count } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`)
      .lt("created_at", `${today}T23:59:59Z`);
    if ((count ?? 0) >= PLAN_LIMITS.free.notes_per_day) {
      return NextResponse.json(
        {
          error: `Free plan limit: ${PLAN_LIMITS.free.notes_per_day} notes per day. Resets tomorrow.`,
          limit_type: "notes",
          daily_limit: PLAN_LIMITS.free.notes_per_day,
        },
        { status: 429 },
      );
    }
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: body.title ?? "Untitled",
      content: body.content ?? "",
      code: body.code ?? "",
      code_language: body.code_language ?? "C++",
      problem_number: body.problem_number ?? null,
    })
    .select(
      "id, title, content, code, code_language, problem_number, updated_at, created_at",
    )
    .single();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "notes", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to create note." },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
