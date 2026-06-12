import { createClient } from "~/lib/supabase/server";

export type Plan = "free" | "pro" | "elite";

export const PLAN_LIMITS = {
  free: { hint_sessions_per_day: 3, notes_per_day: 3 },
  pro: {
    hint_sessions_per_day: Number.POSITIVE_INFINITY,
    notes_per_day: Number.POSITIVE_INFINITY,
  },
  elite: {
    hint_sessions_per_day: Number.POSITIVE_INFINITY,
    notes_per_day: Number.POSITIVE_INFINITY,
  },
} as const;

export async function getUserPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single<{ plan: string }>();
  const p = data?.plan;
  if (p === "pro" || p === "elite") return p;
  return "free";
}

/** Returns today's date as YYYY-MM-DD in UTC. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
