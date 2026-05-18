"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";

export function StreakFreezeButton({
  csrfToken,
  streakFrozen,
  freezeUsedThisMonth,
  streak,
}: {
  csrfToken: string;
  streakFrozen: boolean;
  freezeUsedThisMonth: boolean;
  streak: number;
}) {
  const [frozen, setFrozen] = useState(streakFrozen);
  const [usedThisMonth, setUsedThisMonth] = useState(freezeUsedThisMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles/streak-freeze", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to activate.");
      } else {
        setFrozen(true);
        setUsedThisMonth(true);
      }
    } catch {
      setError("Failed to reach the server.");
    } finally {
      setLoading(false);
    }
  }

  if (frozen) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
          </svg>
          Streak frozen
        </span>
        <span className="text-xs text-muted-foreground">
          Active — absorbs your next missed day
        </span>
      </div>
    );
  }

  const disabled = loading || usedThisMonth || streak === 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => void activate()}
        >
          {loading ? "Activating…" : "Freeze Streak"}
        </Button>
        {usedThisMonth && !frozen && (
          <span className="text-xs text-muted-foreground">Used this month</span>
        )}
        {streak === 0 && !usedThisMonth && (
          <span className="text-xs text-muted-foreground">
            No active streak
          </span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
