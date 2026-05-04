import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  let difficulty: string | null = null;
  let excluded: number[] = [];
  let focus: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("rating, solved_problems, focus")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const r = (profile.rating as number | null) ?? 1200;
        difficulty = r < 1250 ? "Easy" : r < 1500 ? "Medium" : "Hard";
        excluded = (profile.solved_problems as number[] | null) ?? [];
        focus = (profile.focus as string | null) ?? null;
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "random", step: "auth" } });
  }

  const solvedFilter = excluded.length > 0 ? `(${excluded.join(",")})` : null;

  // Try to find a problem matching the user's difficulty, excluding already-solved
  let q = supabase.from("problems").select("*").limit(100);
  if (difficulty) q = q.eq("difficulty", difficulty);
  if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);

  const { data, error } = await q;

  if (!error && data && data.length > 0) {
    // Apply soft platform bias: 3:1 weighting toward preferred platform
    type Row = (typeof data)[number];
    const isLC = (p: Row) =>
      String(p.platform ?? "").toLowerCase() === "leetcode";
    let pool: Row[];
    if (focus === "comp_programming") {
      const cf = data.filter((p) => !isLC(p));
      const lc = data.filter(isLC);
      pool = cf.length > 0 ? [...cf, ...cf, ...cf, ...lc] : data;
    } else if (focus === "interviews") {
      const lc = data.filter(isLC);
      const others = data.filter((p) => !isLC(p));
      pool = lc.length > 0 ? [...lc, ...lc, ...lc, ...others] : data;
    } else {
      pool = data;
    }
    return NextResponse.json(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Fallback: any unsolved problem, ignore difficulty
  let fb = supabase.from("problems").select("*").limit(50);
  if (solvedFilter) fb = fb.not("problem_number", "in", solvedFilter);
  const { data: fallback } = await fb;

  if (fallback && fallback.length > 0) {
    return NextResponse.json(
      fallback[Math.floor(Math.random() * fallback.length)],
    );
  }

  // Final fallback: truly random from all problems
  const { count, error: cErr } = await supabase
    .from("problems")
    .select("*", { count: "exact", head: true });

  if (cErr || !count) {
    if (cErr)
      Sentry.captureException(cErr, {
        tags: { route: "random", step: "count" },
      });
    return NextResponse.json({ error: "No problems found." }, { status: 404 });
  }

  const offset = Math.floor(Math.random() * count);
  const { data: picked, error: pErr } = await supabase
    .from("problems")
    .select("*")
    .range(offset, offset)
    .single();

  if (pErr || !picked) {
    if (pErr)
      Sentry.captureException(pErr, {
        tags: { route: "random", step: "fetch" },
      });
    return NextResponse.json(
      { error: "Failed to fetch problem." },
      { status: 500 },
    );
  }

  return NextResponse.json(picked);
}
