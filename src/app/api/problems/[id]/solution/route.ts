import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .select("problem_number, title")
    .eq("id", id)
    .single();

  if (problemError || !problem) {
    return NextResponse.json({ error: "Problem not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("solutions")
    .select("*")
    .eq("problem_number", problem.problem_number)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch solution." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    data ?? {
      id: null,
      problem_name: problem.title,
      problem_number: problem.problem_number,
      language: "cpp",
      solution_code: null,
      explanation: null,
    },
  );
}
