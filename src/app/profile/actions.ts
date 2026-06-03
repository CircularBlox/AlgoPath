"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient, getUser } from "~/lib/supabase/server";

const VALID_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const LEVEL_RATINGS: Record<string, number> = {
  beginner: 1000,
  intermediate: 1200,
  advanced: 1600,
};

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
    .update({ skill_level: level, rating: LEVEL_RATINGS[level] })
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error, {
      tags: { action: "updateSkillLevel" },
      extra: { level },
    });
    return { success: false, error: error.message };
  }

  return { success: true };
}
