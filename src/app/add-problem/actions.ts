"use server";

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
  const { error } = await supabase.from("problems").insert({
    title,
    url,
    platform,
    difficulty: difficulty || null,
    tags,
    content: content || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/add-problem");
  return { success: true };
}
