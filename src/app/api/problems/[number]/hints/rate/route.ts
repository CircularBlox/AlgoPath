import { type NextRequest, NextResponse } from "next/server";
import { CSRF_HEADER, validateCsrfToken } from "~/lib/csrf";
import { createClient, getUser } from "~/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;
  const problemNumber = Number.parseInt(number, 10);
  if (Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("hint_ratings")
    .select("hint_number, rating")
    .eq("user_id", user.id)
    .eq("problem_number", problemNumber);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch ratings." },
      { status: 500 },
    );
  }

  const ratings: Record<number, "up" | "down" | null> = {
    1: null,
    2: null,
    3: null,
  };
  for (const row of data ?? []) {
    ratings[row.hint_number] = row.rating as "up" | "down";
  }

  return NextResponse.json(ratings);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await validateCsrfToken(request.headers.get(CSRF_HEADER)))) {
    return NextResponse.json(
      { error: "Invalid or expired request token." },
      { status: 403 },
    );
  }

  const { number } = await params;
  const problemNumber = Number.parseInt(number, 10);
  if (Number.isNaN(problemNumber)) {
    return NextResponse.json(
      { error: "Invalid problem number." },
      { status: 400 },
    );
  }

  let body: { hint_number?: unknown; rating?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const hintNumber = Number(body.hint_number);
  const rating = body.rating as string;

  if (![1, 2, 3].includes(hintNumber)) {
    return NextResponse.json(
      { error: "hint_number must be 1, 2, or 3." },
      { status: 400 },
    );
  }
  if (rating !== "up" && rating !== "down") {
    return NextResponse.json(
      { error: "rating must be 'up' or 'down'." },
      { status: 400 },
    );
  }

  const [user, supabase] = await Promise.all([getUser(), createClient()]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase.from("hint_ratings").upsert(
    {
      user_id: user.id,
      problem_number: problemNumber,
      hint_number: hintNumber,
      rating,
    },
    { onConflict: "user_id,problem_number,hint_number" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to save rating." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
