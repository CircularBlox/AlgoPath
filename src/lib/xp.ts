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

export type RankConfig = {
  color: string;
  bg: string;
  gradient: string;
  icon: string;
};

export const RANK_CONFIGS: Record<string, RankConfig> = {
  Newcomer: {
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    gradient: "linear-gradient(90deg,#9ca3af,#6b7280)",
    icon: "🌱",
  },
  Apprentice: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    gradient: "linear-gradient(90deg,#f59e0b,#fbbf24)",
    icon: "⚡",
  },
  Solver: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    gradient: "linear-gradient(90deg,#10b981,#34d399)",
    icon: "🔥",
  },
  Coder: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    gradient: "linear-gradient(90deg,#3b82f6,#60a5fa)",
    icon: "💡",
  },
  Expert: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    gradient: "linear-gradient(90deg,#8b5cf6,#a78bfa)",
    icon: "🎯",
  },
  Master: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    gradient: "linear-gradient(90deg,#f97316,#fb923c)",
    icon: "⭐",
  },
  Grandmaster: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    gradient: "linear-gradient(90deg,#ef4444,#f87171)",
    icon: "👑",
  },
  Legendary: {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    gradient: "linear-gradient(90deg,#a855f7,#ec4899,#f59e0b)",
    icon: "🏆",
  },
};

/** Visual config (color, gradient, icon) for a given level. */
export function rankConfig(level: number): RankConfig {
  return RANK_CONFIGS[levelTitle(level)] ?? RANK_CONFIGS.Newcomer;
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
