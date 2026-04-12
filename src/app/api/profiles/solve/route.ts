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
    .select("rating, solved_problems")
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
    });
  }

  const base = difficultyPoints(difficulty);
  const penalty = Math.max(0, hints_viewed) * 3;
  const rating_gain = Math.max(1, base - penalty);
  const new_rating = (profile.rating ?? 1200) + rating_gain;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      solved_problems: [...solved, problem_number],
      rating: new_rating,
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ already_solved: false, rating_gain, new_rating });
}
