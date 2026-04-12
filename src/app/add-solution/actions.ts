"use server";

import { createAdminClient } from "~/lib/supabase/admin";

export type AddSolutionState = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function addSolution(
  _prev: AddSolutionState,
  formData: FormData,
): Promise<AddSolutionState> {
  const problemNumber = Number(formData.get("problem_number"));
  const language = (formData.get("language") as string)?.trim();
  const solutionCode = (formData.get("solution_code") as string)?.trim();

  if (!problemNumber || !language || !solutionCode) {
    return { success: false, error: "All fields are required." };
  }

  const supabase = createAdminClient();

  // Resolve problem
  const { data: problem } = await supabase
    .from("problems")
    .select("title, problem_number")
    .eq("problem_number", problemNumber)
    .single();

  if (!problem) {
    return { success: false, error: `Problem #${problemNumber} not found.` };
  }

  // Find or create the parent solutions row
  const { data: existing } = await supabase
    .from("solutions")
    .select("id")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  let solutionId: string;

  if (existing) {
    solutionId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("solutions")
      .insert({
        problem_name: problem.title,
        problem_number: problem.problem_number,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { success: false, error: "Failed to create solution entry." };
    }
    solutionId = created.id;
  }

  // Upsert the language/code pair
  const { error } = await supabase.from("solution_codes").upsert(
    {
      solution_id: solutionId,
      language,
      code: solutionCode,
      problem_number: problem.problem_number,
    },
    { onConflict: "solution_id,language" },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const langLabel: Record<string, string> = {
    cpp: "C++",
    python: "Python",
    java: "Java",
    javascript: "JavaScript",
  };

  return {
    success: true,
    message: `${langLabel[language] ?? language} solution saved for Problem #${problemNumber} — ${problem.title}.`,
  };
}
