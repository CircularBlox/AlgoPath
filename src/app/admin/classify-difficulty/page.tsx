"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface ClassificationResult {
  problem_number: number;
  title: string;
  old: string | null;
  new_rating: number;
  analysis: string | null;
  had_solution: boolean;
  fallback: boolean;
  api_error: string | null;
}

function ratingLabel(r: number): { label: string; cls: string } {
  if (r <= 1200)
    return {
      label: "Easy",
      cls: "text-emerald-600 dark:text-emerald-400",
    };
  if (r <= 2000)
    return {
      label: "Medium",
      cls: "text-amber-600 dark:text-amber-400",
    };
  return {
    label: "Hard",
    cls: "text-red-600 dark:text-red-400",
  };
}

function RatingBadge({ rating }: { rating: number }) {
  const { label, cls } = ratingLabel(rating);
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className={cn("font-bold", cls)}>{rating}</span>
      <span className="text-xs text-muted-foreground">({label})</span>
    </span>
  );
}

function ResultsTable({ results }: { results: ClassificationResult[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(n: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Was
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                New Rating
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sol.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map((r) => {
              const isOpen = expanded.has(r.problem_number);
              return (
                <>
                  <tr
                    key={r.problem_number}
                    className={cn(
                      "transition-colors",
                      r.analysis
                        ? "cursor-pointer hover:bg-muted/30"
                        : "hover:bg-muted/20",
                      isOpen && "bg-muted/20",
                    )}
                    onClick={() => r.analysis && toggle(r.problem_number)}
                  >
                    <td className="px-3 py-3 text-center text-muted-foreground">
                      {r.analysis ? (
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                          className={cn(
                            "mx-auto h-3 w-3 transition-transform",
                            isOpen && "rotate-90",
                          )}
                        >
                          <path
                            d="M4 2l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.problem_number}
                    </td>
                    <td className="max-w-64 truncate px-4 py-3 font-medium">
                      {r.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.old ?? <span className="text-xs italic">none</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <RatingBadge rating={r.new_rating} />
                        {r.api_error ? (
                          <span
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium text-red-700 bg-red-500/10 border border-red-500/20 dark:text-red-400 cursor-default max-w-48 truncate"
                            title={r.api_error}
                          >
                            error: {r.api_error}
                          </span>
                        ) : r.fallback ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title="Response unparseable — kept existing rating"
                          >
                            ↩ unparseable
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.had_solution ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && r.analysis && (
                    <tr key={`${r.problem_number}-analysis`}>
                      <td
                        colSpan={6}
                        className="border-t border-border/50 bg-muted/10 px-12 py-3"
                      >
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {r.analysis}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
      <span
        className={cn(
          "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors",
          checked ? "border-primary bg-primary" : "border-border bg-muted",
        )}
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}

export default function ClassifyDifficultyPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [classified, setClassified] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [force, setForce] = useState(true);
  const [fallbacks, setFallbacks] = useState(0);
  const [wasApplied, setWasApplied] = useState(false);

  async function handleClassify() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setResults([]);
    setDistribution({});
    setClassified(null);
    setFallbacks(0);
    setWasApplied(false);

    try {
      const response = await fetch("/api/admin/classify-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun, force }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError((data as { error?: string }).error ?? "Request failed");
        return;
      }

      const typed = data as {
        results: ClassificationResult[];
        distribution: Record<string, number>;
        classified: number;
        fallbacks: number;
        dry_run: boolean;
        message?: string;
      };

      setResults(typed.results ?? []);
      setDistribution(typed.distribution ?? {});
      setClassified(typed.classified);
      setFallbacks(typed.fallbacks ?? 0);
      setMessage(typed.message ?? null);
      setWasApplied(!typed.dry_run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const BUCKETS = [
    "Easy (≤1200)",
    "Medium (1300–2000)",
    "Hard (≥2100)",
  ] as const;
  const BUCKET_COLORS = {
    "Easy (≤1200)": "text-emerald-600 dark:text-emerald-400",
    "Medium (1300–2000)": "text-amber-600 dark:text-amber-400",
    "Hard (≥2100)": "text-red-600 dark:text-red-400",
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
          Classify Problem Difficulty
        </h1>
        <p className="text-sm text-muted-foreground">
          AI assigns a numeric Codeforces-style rating (400–3500, multiples of
          100) to every non-LeetCode problem without one. Existing numeric-rated
          problems are used as calibration anchors. Solutions are included when
          available.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-6">
          {/* Dry run toggle */}
          <div className="flex items-center gap-3">
            <Toggle id="dry-run" checked={dryRun} onChange={setDryRun} />
            <div>
              <Label htmlFor="dry-run" className="cursor-pointer">
                Dry run
              </Label>
              <p className="text-xs text-muted-foreground">
                Preview only — don't write to DB
              </p>
            </div>
          </div>

          {/* Force toggle */}
          <div className="flex items-center gap-3">
            <Toggle id="force" checked={force} onChange={setForce} />
            <div>
              <Label htmlFor="force" className="cursor-pointer">
                Re-classify all
              </Label>
              <p className="text-xs text-muted-foreground">
                Include problems that already have a numeric rating
              </p>
            </div>
          </div>

          <Button
            onClick={handleClassify}
            disabled={loading}
            className="ml-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Classifying…
              </span>
            ) : (
              "Run Classification"
            )}
          </Button>
        </div>

        {!dryRun && (
          <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Live mode — numeric ratings will be written to the database.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty message */}
      {message && classified === 0 && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}

      {/* Results */}
      {classified !== null && classified > 0 && (
        <div className="flex flex-col gap-6">
          {/* Distribution cards */}
          <div className="grid grid-cols-3 gap-4">
            {BUCKETS.map((bucket) => (
              <div
                key={bucket}
                className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <div
                  className={cn(
                    "mb-1 text-3xl font-bold tabular-nums",
                    BUCKET_COLORS[bucket],
                  )}
                >
                  {distribution[bucket] ?? 0}
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {bucket}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {classified} problem{classified !== 1 ? "s" : ""} classified
              {fallbacks > 0 && (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  · {fallbacks} used fallback rating
                </span>
              )}
            </span>
            {wasApplied ? (
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Saved to database
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Dry run — not saved
              </span>
            )}
          </div>

          {/* Results table */}
          <ResultsTable results={results} />
        </div>
      )}
    </main>
  );
}
