import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { createClient } from "~/lib/supabase/server";
import { calcXpGain, levelFromXp } from "~/lib/xp";

/** K-factor: high at the start, decays toward 10 as the user accumulates solves. */
function kFactor(solvedCount: number): number {
  return Math.max(10, Math.round(50 / (1 + solvedCount / 20)));
}

function calcRatingGain(
  difficulty: string | null | undefined,
  hintsViewed: number,
  solvedCount: number,
): number {
  const diffMult =
    difficulty?.toLowerCase() === "easy"
      ? 0.4
      : difficulty?.toLowerCase() === "hard"
        ? 1.6
        : 0.8;
  const K = kFactor(solvedCount);
  // Each hint costs 15% of the gain, floored at 20%
  const mult = Math.max(0.2, 1 - Math.max(0, hintsViewed) * 0.15);
  return Math.max(1, Math.round(K * diffMult * mult));
}

/** Returns today's date as a YYYY-MM-DD string in UTC. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compute the new streak given the previous last_solved_date (YYYY-MM-DD or null). */
function computeStreak(
  current: number,
  lastDate: string | null,
): { streak: number; last_solved_date: string } {
  const today = todayUtc();

  if (!lastDate) return { streak: 1, last_solved_date: today };

  if (lastDate === today) {
    // Already solved something today — preserve streak
    return { streak: current, last_solved_date: today };
  }

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (lastDate === yesterdayStr) {
    // Solved yesterday — extend streak
    return { streak: current + 1, last_solved_date: today };
  }

  // Gap — reset streak
  return { streak: 1, last_solved_date: today };
}

export async function POST(request: NextRequest) {
  if (!(await validateCsrfToken(request.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    problem_number: number;
    difficulty?: string | null;
    hints_viewed?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { problem_number, difficulty, hints_viewed = 0 } = body;

  if (!Number.isInteger(problem_number)) {
    return NextResponse.json(
      { error: "problem_number is required." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("rating, xp, level, solved_problems, streak, last_solved_date")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const solved: number[] = profile.solved_problems ?? [];

  if (solved.includes(problem_number)) {
    return NextResponse.json({
      already_solved: true,
      rating_gain: 0,
      xp_gain: 0,
      new_rating: profile.rating ?? 1200,
      new_level: profile.level ?? 1,
      streak: profile.streak ?? 0,
    });
  }

  const rating_gain = calcRatingGain(difficulty, hints_viewed, solved.length);
  const new_rating = (profile.rating ?? 1200) + rating_gain;

  const xp_gain = calcXpGain(difficulty, hints_viewed);
  const new_xp = (profile.xp ?? 0) + xp_gain;
  const new_level = levelFromXp(new_xp);

  const { streak, last_solved_date } = computeStreak(
    profile.streak ?? 0,
    profile.last_solved_date ?? null,
  );

  const newSolved = [...solved, problem_number];

  // Pick a new recommendation (stored so the profile page doesn't re-query on every load)
  const target =
    new_rating < 1250 ? "Easy" : new_rating < 1500 ? "Medium" : "Hard";
  const solvedFilter = newSolved.length > 0 ? `(${newSolved.join(",")})` : null;

  let recommended_problem_number: number | null = null;
  {
    let q = supabase
      .from("problems")
      .select("problem_number")
      .eq("difficulty", target)
      .limit(30);
    if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);
    const { data: candidates } = await q;

    const pool = candidates ?? [];
    if (pool.length > 0) {
      recommended_problem_number =
        pool[Math.floor(Math.random() * pool.length)]?.problem_number ?? null;
    } else {
      // Fallback: any unsolved problem regardless of difficulty
      let fb = supabase.from("problems").select("problem_number").limit(30);
      if (solvedFilter) fb = fb.not("problem_number", "in", solvedFilter);
      const { data: fallback } = await fb;
      const fbPool = fallback ?? [];
      if (fbPool.length > 0) {
        recommended_problem_number =
          fbPool[Math.floor(Math.random() * fbPool.length)]?.problem_number ??
          null;
      }
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      solved_problems: newSolved,
      rating: new_rating,
      xp: new_xp,
      level: new_level,
      streak,
      last_solved_date,
      ...(recommended_problem_number !== null && {
        recommended_problem_number,
      }),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    already_solved: false,
    rating_gain,
    xp_gain,
    new_rating,
    new_level,
    streak,
  });
}
