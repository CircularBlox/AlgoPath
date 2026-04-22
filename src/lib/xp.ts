/** XP earned for solving a problem, scaled by difficulty and hints used. */
export function calcXpGain(
  difficulty: string | null | undefined,
  hintsViewed: number,
): number {
  const base =
    difficulty?.toLowerCase() === "easy"
      ? 50
      : difficulty?.toLowerCase() === "hard"
        ? 200
        : 100;
  // Each hint costs 20% of base, floored at 10%
  const multiplier = Math.max(0.1, 1 - Math.max(0, hintsViewed) * 0.2);
  return Math.round(base * multiplier);
}

/** Total XP required to *reach* level n (n >= 1). */
export function xpForLevel(n: number): number {
  return 50 * (n - 1) ** 2;
}

/** Derive current level from total XP. */
export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
}

/** Human-readable title for a given level. */
export function levelTitle(level: number): string {
  if (level <= 1) return "Newcomer";
  if (level <= 4) return "Apprentice";
  if (level <= 8) return "Solver";
  if (level <= 12) return "Coder";
  if (level <= 17) return "Expert";
  if (level <= 22) return "Master";
  if (level <= 27) return "Grandmaster";
  return "Legendary";
}

/** XP progress within the current level. */
export function xpProgress(
  xp: number,
  level: number,
): { current: number; needed: number; percent: number } {
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  const current = xp - start;
  const needed = end - start;
  return {
    current,
    needed,
    percent: Math.min(100, Math.round((current / needed) * 100)),
  };
}
