"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { getUser } from "~/lib/supabase/server";

export type AddProblemState = {
  success: boolean;
  error?: string;
};

export async function addProblem(
  _prev: AddProblemState,
  formData: FormData,
): Promise<AddProblemState> {
  const user = await getUser();
  if (!isAdmin(user?.email)) {
    return { success: false, error: "Forbidden." };
  }

  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const platform = formData.get("platform") as string;
  const difficulty = formData.get("difficulty") as string;
  const tagsRaw = formData.get("tags") as string;
  const content = formData.get("content") as string;

  if (!title || !url || !platform || !content) {
    return {
      success: false,
      error: "Title, URL, platform, and content are required.",
    };
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const supabase = createAdminClient();

  const { data: problemNumber, error: rpcError } = await supabase.rpc(
    "next_problem_number",
  );

  if (rpcError) {
    Sentry.captureException(rpcError, {
      tags: { action: "addProblem", step: "next_problem_number" },
    });
    return { success: false, error: rpcError.message };
  }

  const { error } = await supabase.from("problems").insert({
    title,
    url,
    platform,
    difficulty: difficulty || null,
    tags,
    content: content || null,
    problem_number: problemNumber,
  });

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "addProblem", step: "insert" },
      extra: { title, url },
    });
    return { success: false, error: error.message };
  }

  revalidatePath("/add-problem");
  return { success: true };
}
