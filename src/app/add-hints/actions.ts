"use server";

import * as Sentry from "@sentry/nextjs";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

export type SaveHintsState = {
  success: boolean;
  error?: string;
  message?: string;
};

export async function saveHints(
  _prev: SaveHintsState,
  formData: FormData,
): Promise<SaveHintsState> {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return { success: false, error: "Forbidden." };
  }

  const problemNumber = Number(formData.get("problem_number"));
  const hint1 = (formData.get("hint_1") as string)?.trim() || null;
  const hint2 = (formData.get("hint_2") as string)?.trim() || null;
  const hint3 = (formData.get("hint_3") as string)?.trim() || null;

  if (!problemNumber || Number.isNaN(problemNumber)) {
    return { success: false, error: "A valid problem number is required." };
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

  // Check for existing hints row
  const { data: existing } = await supabase
    .from("hints")
    .select("id")
    .eq("problem_number", problemNumber)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("hints")
      .update({ hint_1: hint1, hint_2: hint2, hint_3: hint3 })
      .eq("id", existing.id);

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "saveHints", step: "update" },
        extra: { problemNumber },
      });
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("hints").insert({
      problem_number: problem.problem_number,
      problem_name: problem.title,
      hint_1: hint1,
      hint_2: hint2,
      hint_3: hint3,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "saveHints", step: "insert" },
        extra: { problemNumber },
      });
      return { success: false, error: error.message };
    }
  }

  return {
    success: true,
    message: `Hints saved for Problem #${problemNumber} — ${problem.title}.`,
  };
}
