import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "~/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: true }); // silently ignore for guests

  const { number: raw } = await params;
  const problemNumber = Number(raw);
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Upsert: first view inserts, subsequent views increment count + update last_viewed_at
  const { error } = await supabase.rpc("upsert_problem_view", {
    p_user_id: user.id,
    p_problem_number: problemNumber,
  });

  if (error) {
    // Fallback: manual upsert in two steps if the RPC doesn't exist yet
    const { data: existing } = await supabase
      .from("problem_views")
      .select("view_count")
      .eq("user_id", user.id)
      .eq("problem_number", problemNumber)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("problem_views")
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: existing.view_count + 1,
        })
        .eq("user_id", user.id)
        .eq("problem_number", problemNumber);
    } else {
      await supabase.from("problem_views").insert({
        user_id: user.id,
        problem_number: problemNumber,
      });
    }
  }

  // Return current view record
  const { data: row, error: fetchError } = await supabase
    .from("problem_views")
    .select("first_viewed_at, last_viewed_at, view_count")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber)
    .maybeSingle();

  if (fetchError) {
    Sentry.captureException(fetchError, { tags: { route: "problem_view" } });
  }

  return NextResponse.json(row ?? { ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json(null);

  const { number: raw } = await params;
  const problemNumber = Number(raw);
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) {
    return NextResponse.json(null);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("problem_views")
    .select("first_viewed_at, last_viewed_at, view_count")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber)
    .maybeSingle();

  const { data: solve } = await supabase
    .from("solves")
    .select("solved_at, xp_gained, hints_used")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber)
    .order("solved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ view: data ?? null, solve: solve ?? null });
}
