import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // Resolve UUID → problem_number + title
  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("problem_number, title")
    .eq("id", id)
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  // Fetch all language variants directly from solution_codes,
  // pulling explanation from the parent solutions row via the FK.
  const { data: rows, error } = await supabase
    .from("solution_codes")
    .select(
      "id, solution_id, language, code, solutions(explanation, problem_name)",
    )
    .eq("problem_number", problem.problem_number)
    .order("language");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch solutions." },
      { status: 500 },
    );
  }

  // Extract shared explanation and problem_name from the first row's parent.
  // Supabase types the nested join as an array; normalize to a single object.
  const parentRaw = (rows ?? [])[0]?.solutions;
  const parent = (Array.isArray(parentRaw) ? parentRaw[0] : parentRaw) as
    | { explanation: string | null; problem_name: string }
    | null
    | undefined;

  const explanation = parent?.explanation ?? null;
  const problem_name = parent?.problem_name ?? problem.title;

  // Strip the nested solutions object — callers don't need it
  const solution_codes = (rows ?? []).map(({ solutions: _s, ...rest }) => rest);

  return NextResponse.json({
    problem_number: problem.problem_number,
    problem_name,
    explanation,
    solution_codes,
  });
}
