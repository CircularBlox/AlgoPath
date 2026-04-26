"use server";

import * as Sentry from "@sentry/nextjs";
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

  const { error: reportError } = await supabase
    .from("problem_reports")
    .update({ status, recommended_difficulty: recommendedDifficulty })
    .eq("id", reportId);

  if (reportError)
    Sentry.captureException(reportError, {
      tags: { action: "resolveReport", step: "update_report" },
      extra: { reportId },
    });

  if (status === "done" && recommendedDifficulty && problemNumber) {
    const { error: diffError } = await supabase
      .from("problems")
      .update({ difficulty: recommendedDifficulty })
      .eq("problem_number", problemNumber);

    if (diffError)
      Sentry.captureException(diffError, {
        tags: { action: "resolveReport", step: "update_difficulty" },
        extra: { problemNumber },
      });
  }

  revalidatePath("/reports");
}
