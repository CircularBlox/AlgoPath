import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

function difficultyPoints(difficulty: string | null | undefined): number {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return 5;
    case "medium":
      return 10;
    case "hard":
      return 20;
    default:
      return 10;
  }
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
    .select("rating, solved_problems, streak, last_solved_date")
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
      new_rating: profile.rating ?? 1200,
      streak: profile.streak ?? 0,
    });
  }

  const base = difficultyPoints(difficulty);
  const penalty = Math.max(0, hints_viewed) * 3;
  const rating_gain = Math.max(1, base - penalty);
  const new_rating = (profile.rating ?? 1200) + rating_gain;

  const { streak, last_solved_date } = computeStreak(
    profile.streak ?? 0,
    profile.last_solved_date ?? null,
  );

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      solved_problems: [...solved, problem_number],
      rating: new_rating,
      streak,
      last_solved_date,
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
    new_rating,
    streak,
  });
}
