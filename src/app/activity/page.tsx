"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "~/lib/time";

type Solve = {
  problem_number: number;
  problem_title: string | null;
  xp_gained: number;
  hints_used: number;
  solved_at: string;
};

type NoteActivity = {
  id: string;
  title: string;
  problem_number: number | null;
  created_at: string;
  updated_at: string;
};

type Review = {
  problem_number: number;
  problem_title: string | null;
  created_at: string;
};

type ActivityData = {
  solves: Solve[];
  notes: NoteActivity[];
  reviews: Review[];
};

type Event =
  | { kind: "solve"; ts: string; data: Solve }
  | { kind: "note"; ts: string; data: NoteActivity }
  | { kind: "review"; ts: string; data: Review };

// Each activity kind maps to one §1 role: solved → green (success),
// note → violet (brand/selected), AI review → teal (secondary accent).
function kindLabel(kind: Event["kind"]) {
  if (kind === "solve")
    return { label: "Solved", color: "text-green", bg: "bg-green/10" };
  if (kind === "note")
    return { label: "Note", color: "text-violet", bg: "bg-violet/10" };
  return {
    label: "AI Review",
    color: "text-teal",
    bg: "bg-teal/10",
  };
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Event["kind"]>("all");

  useEffect(() => {
    fetch("/api/activity")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json();
          throw new Error(
            (j as { error?: string }).error ?? "Failed to load activity.",
          );
        }
        return r.json() as Promise<ActivityData>;
      })
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unknown error."),
      )
      .finally(() => setLoading(false));
  }, []);

  const events: Event[] = data
    ? [
        ...data.solves.map(
          (s): Event => ({ kind: "solve", ts: s.solved_at, data: s }),
        ),
        ...data.notes.map(
          (n): Event => ({ kind: "note", ts: n.updated_at, data: n }),
        ),
        ...data.reviews.map(
          (r): Event => ({ kind: "review", ts: r.created_at, data: r }),
        ),
      ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    : [];

  const filtered =
    filter === "all" ? events : events.filter((e) => e.kind === filter);

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "solve", label: "Solves" },
    { id: "note", label: "Notes" },
    { id: "review", label: "AI Reviews" },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          A timestamped log of everything you&apos;ve done.
        </p>
      </div>

      {/* Stats strip */}
      {data && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            {
              label: "Solves",
              value: data.solves.length,
              color: "text-green",
            },
            { label: "Notes", value: data.notes.length, color: "text-violet" },
            {
              label: "AI Reviews",
              value: data.reviews.length,
              color: "text-teal",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 rounded border border-border bg-card px-4 py-3"
            >
              <span
                className={`font-mono text-2xl font-bold tabular-nums ${color}`}
              >
                {value}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded px-3 py-1 font-mono text-xs font-medium transition-colors ${
              filter === id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No activity yet — solve a problem to get started.
        </p>
      )}

      <div className="flex flex-col gap-0">
        {filtered.map((event) => {
          const { label, color, bg } = kindLabel(event.kind);
          let title = "";
          let detail = "";
          let href: string | undefined;

          if (event.kind === "solve") {
            title =
              event.data.problem_title ??
              `Problem #${event.data.problem_number}`;
            detail = `+${event.data.xp_gained} XP${event.data.hints_used > 0 ? ` · ${event.data.hints_used} hint${event.data.hints_used !== 1 ? "s" : ""} used` : ""}`;
            href = `/display-problem?p=${event.data.problem_number}`;
          } else if (event.kind === "note") {
            title = event.data.title || "Untitled note";
            detail = event.data.problem_number
              ? `Problem #${event.data.problem_number} · created ${timeAgo(event.data.created_at)}`
              : `created ${timeAgo(event.data.created_at)}`;
            href = "/notes";
          } else {
            title =
              event.data.problem_title ??
              `Problem #${event.data.problem_number}`;
            detail = "AI code review";
            href = `/display-problem?p=${event.data.problem_number}`;
          }

          return (
            <div
              key={`${event.kind}-${event.ts}`}
              className="flex items-start gap-3 border-b border-border py-3 last:border-b-0"
            >
              <div className="mt-0.5 shrink-0">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${bg} ${color}`}
                >
                  {label}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                {href ? (
                  <a
                    href={href}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {title}
                  </a>
                ) : (
                  <span className="truncate text-sm font-medium">{title}</span>
                )}
                {detail && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {detail}
                  </span>
                )}
              </div>
              <span
                className="shrink-0 font-mono text-xs text-dim"
                title={new Date(event.ts).toLocaleString()}
              >
                {timeAgo(event.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
