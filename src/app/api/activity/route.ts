import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = await createClient();

  const [solvesRes, viewsRes, notesRes, reviewsRes] = await Promise.all([
    supabase
      .from("solves")
      .select("problem_number, xp_gained, hints_used, solved_at")
      .eq("user_id", user.id)
      .order("solved_at", { ascending: false })
      .limit(50),

    supabase
      .from("problem_views")
      .select("problem_number, first_viewed_at, last_viewed_at, view_count")
      .eq("user_id", user.id)
      .order("last_viewed_at", { ascending: false })
      .limit(30),

    supabase
      .from("notes")
      .select("id, title, problem_number, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),

    supabase
      .from("code_reviews")
      .select("problem_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  for (const { error, data: _ } of [
    solvesRes,
    viewsRes,
    notesRes,
    reviewsRes,
  ]) {
    if (error) {
      Sentry.captureException(error, { tags: { route: "activity" } });
    }
  }

  // Attach problem titles via a single query for all referenced problem numbers
  const allNumbers = Array.from(
    new Set([
      ...(solvesRes.data ?? []).map((r) => r.problem_number),
      ...(viewsRes.data ?? []).map((r) => r.problem_number),
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
    views: (viewsRes.data ?? []).map((r) => ({
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
