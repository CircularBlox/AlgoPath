import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { difficultyBuckets } from "~/lib/difficulty";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  const platformOverride =
    request.nextUrl.searchParams.get("platform")?.trim().toLowerCase() ?? null;
  const tagFilter = request.nextUrl.searchParams.get("tag")?.trim() || null;
  const difficultyFilter =
    request.nextUrl.searchParams.get("difficulty")?.trim() || null;

  const supabase = await createClient();

  let buckets: string[] | null = null;
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
        buckets = difficultyBuckets(r);
        excluded = (profile.solved_problems as number[] | null) ?? [];
        focus = (profile.focus as string | null) ?? null;
      }
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "random", step: "auth" } });
  }

  const solvedFilter = excluded.length > 0 ? `(${excluded.join(",")})` : null;

  let q = supabase.from("problems").select("*").limit(100);
  if (buckets) q = q.in("difficulty", buckets);
  if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);
  // Explicit platform override from filter bar takes priority over focus bias
  if (platformOverride) q = q.eq("platform", platformOverride);
  if (tagFilter) q = q.contains("tags", [tagFilter]);
  if (difficultyFilter) q = q.eq("difficulty", difficultyFilter);

  const { data, error } = await q;

  if (!error && data && data.length > 0) {
    type Row = (typeof data)[number];
    let pool: Row[];

    if (platformOverride) {
      // Already filtered — no bias needed
      pool = data;
    } else {
      const isLC = (p: Row) =>
        String(p.platform ?? "").toLowerCase() === "leetcode";
      const isComp = (p: Row) => {
        const pl = String(p.platform ?? "").toLowerCase();
        return pl === "codeforces" || pl === "usaco";
      };
      if (focus === "comp_programming") {
        const comp = data.filter(isComp);
        const lc = data.filter(isLC);
        pool = comp.length > 0 ? [...comp, ...comp, ...comp, ...lc] : data;
      } else if (focus === "interviews") {
        const lc = data.filter(isLC);
        const others = data.filter((p) => !isLC(p));
        pool = lc.length > 0 ? [...lc, ...lc, ...lc, ...others] : data;
      } else {
        pool = data;
      }
    }

    return NextResponse.json(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Fallback: any unsolved problem, ignore difficulty but keep tag/platform
  let fb = supabase.from("problems").select("*").limit(50);
  if (solvedFilter) fb = fb.not("problem_number", "in", solvedFilter);
  if (platformOverride) fb = fb.eq("platform", platformOverride);
  if (tagFilter) fb = fb.contains("tags", [tagFilter]);
  const { data: fallback } = await fb;

  if (fallback && fallback.length > 0) {
    return NextResponse.json(
      fallback[Math.floor(Math.random() * fallback.length)],
    );
  }

  // Final fallback: truly random from all (or platform-filtered) problems
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
