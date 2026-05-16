import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

type Params = { params: Promise<{ number: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { number: raw } = await params;
  const problemNumber = Number(raw);
  if (!Number.isInteger(problemNumber) || problemNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: current, error: currentErr } = await supabase
    .from("problems")
    .select("tags, difficulty, platform")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  if (currentErr || !current) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  let solved: number[] = [];
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("solved_problems")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        solved = (profile.solved_problems as number[] | null) ?? [];
      }
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "problems/next", step: "auth" },
    });
  }

  const solvedFilter = solved.length > 0 ? `(${solved.join(",")})` : null;

  // Build target difficulty range (one step harder)
  const targetDifficulties: string[] = [];
  const diff = current.difficulty ?? "";
  if (/^\d+$/.test(diff)) {
    const n = Number(diff);
    for (let d = n + 100; d <= n + 300; d += 100) {
      targetDifficulties.push(String(Math.min(d, 3500)));
    }
  } else if (diff.toLowerCase() === "easy") {
    targetDifficulties.push("Medium");
  } else if (diff.toLowerCase() === "medium") {
    targetDifficulties.push("Hard");
  } else {
    targetDifficulties.push("Hard");
  }

  const tags: string[] = (current.tags as string[]) ?? [];

  // Attempt 1: same tag(s), one step harder, not already solved
  if (tags.length > 0 && targetDifficulties.length > 0) {
    let q = supabase
      .from("problems")
      .select("*")
      .in("difficulty", targetDifficulties)
      .overlaps("tags", tags)
      .neq("problem_number", problemNumber)
      .limit(20);
    if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);

    const { data } = await q;
    if (data && data.length > 0) {
      return NextResponse.json(data[Math.floor(Math.random() * data.length)]);
    }
  }

  // Attempt 2: any problem at target difficulty, not already solved
  if (targetDifficulties.length > 0) {
    let q = supabase
      .from("problems")
      .select("*")
      .in("difficulty", targetDifficulties)
      .neq("problem_number", problemNumber)
      .limit(30);
    if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);

    const { data } = await q;
    if (data && data.length > 0) {
      return NextResponse.json(data[Math.floor(Math.random() * data.length)]);
    }
  }

  // Attempt 3: any unsolved problem
  let q = supabase
    .from("problems")
    .select("*")
    .neq("problem_number", problemNumber)
    .limit(30);
  if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);

  const { data: fallback, error: fallbackErr } = await q;
  if (fallbackErr) {
    Sentry.captureException(fallbackErr, { tags: { route: "problems/next" } });
    return NextResponse.json(
      { error: "Failed to find next problem." },
      { status: 500 },
    );
  }
  if (fallback && fallback.length > 0) {
    return NextResponse.json(
      fallback[Math.floor(Math.random() * fallback.length)],
    );
  }

  return NextResponse.json({ error: "No problems found." }, { status: 404 });
}
