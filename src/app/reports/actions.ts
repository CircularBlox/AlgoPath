"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

export async function resolveReport(formData: FormData) {
  const user = await getUser();
  if (!isAdmin(user?.email)) return;

  const reportId = formData.get("report_id") as string;
  const status = formData.get("status") as string;
  const recommendedDifficulty =
    ((formData.get("recommended_difficulty") as string) ?? "").trim() || null;
  const problemNumber = Number(formData.get("problem_number"));

  const supabase = createAdminClient();

  await supabase
    .from("problem_reports")
    .update({ status, recommended_difficulty: recommendedDifficulty })
    .eq("id", reportId);

  // If marking done with a difficulty, update the problem's difficulty too
  if (status === "done" && recommendedDifficulty && problemNumber) {
    await supabase
      .from("problems")
      .update({ difficulty: recommendedDifficulty })
      .eq("problem_number", problemNumber);
  }

  revalidatePath("/reports");
}
