import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

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

  const supabase = await createClient();

  // Resolve problem_number → uuid, validate problem exists and get title
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("id, title")
    .eq("problem_number", problemNumber)
    .single();

  if (problemError || !problem) {
    if (problemError)
      Sentry.captureException(problemError, {
        tags: { route: "hints", step: "resolve_problem" },
        extra: { problemNumber },
      });
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  // hints table has no uuid FK to problems (schema uses problem_number);
  // uuid is used above for resolution and validation only
  const { data, error } = await supabase
    .from("hints")
    .select("*")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, {
      tags: { route: "hints", step: "fetch" },
      extra: { problemNumber },
    });
    return NextResponse.json(
      { error: "Failed to fetch hints." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    data ?? {
      id: null,
      problem_name: problem.title,
      problem_number: problemNumber,
      hint_1: null,
      hint_2: null,
      hint_3: null,
    },
  );
}
