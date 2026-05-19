import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { difficultyBuckets } from "~/lib/difficulty";
import { getPostHogClient } from "~/lib/posthog-server";
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
  let diffMult: number;
  const d = (difficulty ?? "").toLowerCase();
  if (d === "easy") {
    diffMult = 0.4;
  } else if (d === "hard") {
    diffMult = 1.6;
  } else {
    const numRating = Number(difficulty);
    if (!Number.isNaN(numRating) && numRating > 0) {
      // Scale: 800→0.4, 1600→0.8, 2400→1.2, 3000→1.5 — clamped 0.2–2.0
      diffMult = Math.max(0.2, Math.min(2.0, numRating / 2000));
    } else {
      diffMult = 0.8; // "Medium" or unknown
    }
  }
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
  streakFrozen: boolean,
): { streak: number; last_solved_date: string; clearFreeze: boolean } {
  const today = todayUtc();

  if (!lastDate)
    return { streak: 1, last_solved_date: today, clearFreeze: false };

  if (lastDate === today) {
    return { streak: current, last_solved_date: today, clearFreeze: false };
  }

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (lastDate === yesterdayStr) {
    return { streak: current + 1, last_solved_date: today, clearFreeze: false };
  }

  // Gap — streak freeze absorbs one missed day
  if (streakFrozen) {
    return { streak: current, last_solved_date: today, clearFreeze: true };
  }

  return { streak: 1, last_solved_date: today, clearFreeze: false };
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
    logged_as_reference?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    problem_number,
    difficulty,
    hints_viewed = 0,
    logged_as_reference = false,
  } = body;
  // If logged for reference (user needed to look it up), treat as max hints for XP calc
  const effectiveHintsViewed = logged_as_reference
    ? Math.max(hints_viewed, 3)
    : hints_viewed;

  if (!Number.isInteger(problem_number)) {
    return NextResponse.json(
      { error: "problem_number is required." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "rating, xp, level, solved_problems, streak, last_solved_date, focus, streak_frozen",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    if (profileError)
      Sentry.captureException(profileError, {
        tags: { route: "solve", step: "fetch_profile" },
        extra: { userId: user.id },
      });
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

  const rating_gain = calcRatingGain(
    difficulty,
    effectiveHintsViewed,
    solved.length,
  );
  const new_rating = (profile.rating ?? 1200) + rating_gain;

  const xp_gain = calcXpGain(difficulty, effectiveHintsViewed);
  const old_level = profile.level ?? levelFromXp(profile.xp ?? 0);
  const new_xp = (profile.xp ?? 0) + xp_gain;
  const new_level = levelFromXp(new_xp);

  const { streak, last_solved_date, clearFreeze } = computeStreak(
    profile.streak ?? 0,
    profile.last_solved_date ?? null,
    profile.streak_frozen ?? false,
  );

  const newSolved = [...solved, problem_number];

  // Pick a new recommendation (stored so the profile page doesn't re-query on every load)
  const buckets = difficultyBuckets(new_rating);
  const solvedFilter = newSolved.length > 0 ? `(${newSolved.join(",")})` : null;
  const focus = (profile.focus as string | null) ?? null;

  let recommended_problem_number: number | null = null;
  {
    let q = supabase
      .from("problems")
      .select("problem_number")
      .in("difficulty", buckets)
      .limit(30);
    if (solvedFilter) q = q.not("problem_number", "in", solvedFilter);
    if (focus === "interviews") q = q.eq("platform", "LeetCode");
    else if (focus === "comp_programming") q = q.neq("platform", "LeetCode");
    const { data: candidates } = await q;

    const pool = candidates ?? [];
    if (pool.length > 0) {
      recommended_problem_number =
        pool[Math.floor(Math.random() * pool.length)]?.problem_number ?? null;
    } else {
      // Fallback: any unsolved problem at any difficulty
      let fb = supabase.from("problems").select("problem_number").limit(30);
      if (solvedFilter) fb = fb.not("problem_number", "in", solvedFilter);
      if (focus === "interviews") fb = fb.eq("platform", "LeetCode");
      else if (focus === "comp_programming")
        fb = fb.neq("platform", "LeetCode");
      const { data: fallback } = await fb;
      const fbPool = fallback ?? [];
      if (fbPool.length > 0) {
        recommended_problem_number =
          fbPool[Math.floor(Math.random() * fbPool.length)]?.problem_number ??
          null;
      }
    }
  }

  const profileUpdate: Record<string, unknown> = {
    solved_problems: newSolved,
    rating: new_rating,
    xp: new_xp,
    level: new_level,
    streak,
    last_solved_date,
    recommended_problem_number,
  };
  if (clearFreeze) profileUpdate.streak_frozen = false;

  const { error: updateError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (updateError) {
    Sentry.captureException(updateError, {
      tags: { route: "solve", step: "update_profile" },
      extra: { userId: user.id, problem_number },
    });
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }

  // Record solve event with timestamp
  const { error: solveLogError } = await supabase.from("solves").insert({
    user_id: user.id,
    problem_number,
    xp_gained: xp_gain,
    hints_used: effectiveHintsViewed,
  });
  if (solveLogError) {
    Sentry.captureException(solveLogError, {
      tags: { route: "solve", step: "log_solve" },
      extra: { userId: user.id, problem_number },
    });
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "problem_solved_server",
    properties: {
      problem_number,
      difficulty: difficulty ?? null,
      hints_viewed: effectiveHintsViewed,
      logged_as_reference,
      xp_gain,
      rating_gain,
      new_rating,
      new_level,
      streak,
    },
  });
  await posthog.shutdown();

  return NextResponse.json({
    already_solved: false,
    rating_gain,
    xp_gain,
    old_level,
    new_rating,
    new_level,
    streak,
  });
}
