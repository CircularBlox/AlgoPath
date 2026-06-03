"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";

const CF_RANK_COLORS: Record<string, string> = {
  newbie: "text-muted-foreground",
  pupil: "text-emerald-600",
  specialist: "text-cyan-600",
  expert: "text-blue-600",
  "candidate master": "text-violet-600",
  master: "text-amber-600",
  "international master": "text-amber-500",
  grandmaster: "text-red-600",
  "international grandmaster": "text-red-500",
  "legendary grandmaster": "text-red-500",
};

export function CfLinkSection({
  initialHandle,
  initialRating,
  initialMaxRating,
  initialRank,
}: {
  initialHandle: string | null;
  initialRating: number | null;
  initialMaxRating: number | null;
  initialRank: string | null;
}) {
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [cfHandle, setCfHandle] = useState(initialHandle);
  const [cfRating, setCfRating] = useState(initialRating);
  const [cfMaxRating, setCfMaxRating] = useState(initialMaxRating);
  const [cfRank, setCfRank] = useState(initialRank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!initialHandle);

  async function link() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles/cf-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim() }),
      });
      const data = (await res.json()) as {
        handle?: string;
        rating?: number | null;
        max_rating?: number | null;
        rank?: string | null;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to link account.");
      } else {
        setCfHandle(data.handle ?? null);
        setCfRating(data.rating ?? null);
        setCfMaxRating(data.max_rating ?? null);
        setCfRank(data.rank ?? null);
        setEditing(false);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/profiles/cf-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: null }),
      });
      setCfHandle(null);
      setCfRating(null);
      setCfMaxRating(null);
      setCfRank(null);
      setHandle("");
      setEditing(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const rankColor = cfRank
    ? (CF_RANK_COLORS[cfRank.toLowerCase()] ?? "text-foreground")
    : "text-foreground";

  return (
    <div className="flex flex-col gap-3">
      {cfHandle && !editing ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{cfHandle}</span>
            {cfRank && (
              <span className={`text-xs font-semibold capitalize ${rankColor}`}>
                {cfRank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {cfRating !== null && (
              <span>
                <span className="text-muted-foreground text-xs">Rating </span>
                <span className={`font-bold ${rankColor}`}>{cfRating}</span>
              </span>
            )}
            {cfMaxRating !== null && (
              <span>
                <span className="text-muted-foreground text-xs">Max </span>
                <span className="font-medium">{cfMaxRating}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setHandle(cfHandle);
                setEditing(true);
              }}
              className="text-xs text-primary hover:underline"
            >
              Update
            </button>
            <button
              type="button"
              onClick={unlink}
              disabled={loading}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handle.trim() && link()}
            placeholder="Your Codeforces handle"
            maxLength={24}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" disabled={loading || !handle.trim()} onClick={link}>
            {loading ? "Linking…" : "Link"}
          </Button>
          {cfHandle && (
            <button
              type="button"
              onClick={() => {
                setHandle(cfHandle);
                setEditing(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
