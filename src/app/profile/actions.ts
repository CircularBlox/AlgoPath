"use server";

import { createClient, getUser } from "~/lib/supabase/server";

const VALID_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export async function updateSkillLevel(
  level: string,
): Promise<{ success: boolean; error?: string }> {
  if (!VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
    return { success: false, error: "Invalid skill level." };
  }

  const [user, supabase] = await Promise.all([getUser(), createClient()]);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ skill_level: level })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
