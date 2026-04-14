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
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  // solution_codes has no uuid FK to problems (schema uses problem_number);
  // uuid is used above for resolution and validation only.
  // solution_id is a uuid FK to the solutions table — used internally below.
  const { data: rows, error } = await supabase
    .from("solution_codes")
    .select(
      "id, solution_id, language, code, solutions(explanation, problem_name)",
    )
    .eq("problem_number", problemNumber)
    .order("language");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch solutions." },
      { status: 500 },
    );
  }

  const parentRaw = (rows ?? [])[0]?.solutions;
  const parent = (Array.isArray(parentRaw) ? parentRaw[0] : parentRaw) as
    | { explanation: string | null; problem_name: string }
    | null
    | undefined;

  const explanation = parent?.explanation ?? null;
  const problem_name = parent?.problem_name ?? problem.title;

  const solution_codes = (rows ?? []).map(({ solutions: _s, ...rest }) => rest);

  return NextResponse.json({
    problem_number: problemNumber,
    problem_name,
    explanation,
    solution_codes,
  });
}
