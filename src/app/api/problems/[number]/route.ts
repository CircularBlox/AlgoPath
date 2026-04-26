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

  // Resolve problem_number → uuid
  const { data: ref, error: refError } = await supabase
    .from("problems")
    .select("id")
    .eq("problem_number", problemNumber)
    .single();

  if (refError || !ref) {
    if (refError)
      Sentry.captureException(refError, {
        tags: { route: "problem", step: "resolve_number" },
        extra: { problemNumber },
      });
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  // Fetch full problem by uuid
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("id", ref.id)
    .single();

  if (error || !data) {
    if (error)
      Sentry.captureException(error, {
        tags: { route: "problem", step: "fetch" },
        extra: { problemNumber },
      });
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
