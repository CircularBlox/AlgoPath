export type StreakStatus = "active" | "at_risk" | "broken" | "none";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Compute the current streak status from stored DB values. */
export function streakStatus(
  streak: number,
  lastSolvedDate: string | null,
): StreakStatus {
  if (!lastSolvedDate || streak === 0) return "none";

  const today = todayUtc();
  if (lastSolvedDate === today) return "active";

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (lastSolvedDate === yesterday.toISOString().slice(0, 10)) return "at_risk";

  return "broken";
}

/** Effective streak to display — 0 when broken so the UI reflects reality. */
export function effectiveStreak(
  streak: number,
  lastSolvedDate: string | null,
): number {
  const s = streakStatus(streak, lastSolvedDate);
  return s === "broken" || s === "none" ? 0 : streak;
}
