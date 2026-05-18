import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: string }>();
  const plan = profileData?.plan ?? "free";
  const cutoff =
    plan === "free"
      ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const [solvesRes, notesRes, reviewsRes] = await Promise.all([
    (() => {
      let q = supabase
        .from("solves")
        .select("problem_number, xp_gained, hints_used, solved_at")
        .eq("user_id", user.id)
        .order("solved_at", { ascending: false })
        .limit(50);
      if (cutoff) q = q.gte("solved_at", cutoff);
      return q;
    })(),

    (() => {
      let q = supabase
        .from("notes")
        .select("id, title, problem_number, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (cutoff) q = q.gte("updated_at", cutoff);
      return q;
    })(),

    (() => {
      let q = supabase
        .from("code_reviews")
        .select("problem_number, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (cutoff) q = q.gte("created_at", cutoff);
      return q;
    })(),
  ]);

  for (const { error } of [solvesRes, notesRes, reviewsRes]) {
    if (error) {
      Sentry.captureException(error, { tags: { route: "activity" } });
    }
  }

  const allNumbers = Array.from(
    new Set([
      ...(solvesRes.data ?? []).map((r) => r.problem_number),
      ...(notesRes.data ?? [])
        .filter((r) => r.problem_number != null)
        .map((r) => r.problem_number as number),
      ...(reviewsRes.data ?? []).map((r) => r.problem_number),
    ]),
  );

  const titleMap: Record<number, string> = {};
  if (allNumbers.length > 0) {
    const { data: problems } = await supabase
      .from("problems")
      .select("problem_number, title")
      .in("problem_number", allNumbers);
    for (const p of problems ?? []) {
      titleMap[p.problem_number] = p.title;
    }
  }

  return NextResponse.json({
    solves: (solvesRes.data ?? []).map((r) => ({
      ...r,
      problem_title: titleMap[r.problem_number] ?? null,
    })),
    notes: notesRes.data ?? [],
    reviews: (reviewsRes.data ?? []).map((r) => ({
      ...r,
      problem_title: titleMap[r.problem_number] ?? null,
    })),
  });
}
