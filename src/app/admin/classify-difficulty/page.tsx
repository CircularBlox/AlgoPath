"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface ClassificationResult {
  problem_number: number;
  title: string;
  old: string | null;
  new: string;
  cf_rating: number | null;
  had_solution: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Medium:
    "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  Hard: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

function DifficultyBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        DIFFICULTY_COLORS[label] ??
          "text-muted-foreground bg-muted border-border",
      )}
    >
      {label}
    </span>
  );
}

export default function ClassifyDifficultyPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [classified, setClassified] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [cfRatingFilter, setCfRatingFilter] = useState("");
  const [wasApplied, setWasApplied] = useState(false);

  async function handleClassify() {
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary({});
    setClassified(null);
    setWasApplied(false);

    const body: Record<string, unknown> = { dry_run: dryRun };
    const parsed = parseInt(cfRatingFilter, 10);
    if (cfRatingFilter && !Number.isNaN(parsed)) body.cf_rating = parsed;

    try {
      const response = await fetch("/api/admin/classify-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError((data as { error?: string }).error ?? "Request failed");
        return;
      }

      const typed = data as {
        results: ClassificationResult[];
        summary: Record<string, number>;
        classified: number;
        dry_run: boolean;
      };
      setResults(typed.results ?? []);
      setSummary(typed.summary ?? {});
      setClassified(typed.classified);
      setWasApplied(!typed.dry_run);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const TIERS = ["Easy", "Medium", "Hard"] as const;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-1.5 text-2xl font-bold tracking-tight">
          Classify Problem Difficulty
        </h1>
        <p className="text-sm text-muted-foreground">
          Use AI to classify problems with numeric CF ratings into Easy, Medium,
          or Hard. The AI uses the problem statement, solution code (if
          present), tags, and calibration anchors from your existing problems.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf-filter">
              Filter by CF Rating{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="cf-filter"
              placeholder="e.g. 800"
              value={cfRatingFilter}
              onChange={(e) => setCfRatingFilter(e.target.value)}
              className="w-40"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 pb-0.5">
            <span
              className={cn(
                "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors",
                dryRun ? "border-primary bg-primary" : "border-border bg-muted",
              )}
            >
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="sr-only"
              />
              <span
                className={cn(
                  "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                  dryRun ? "translate-x-3.5" : "translate-x-0.5",
                )}
              />
            </span>
            <span className="text-sm">
              Dry run{" "}
              <span className="text-muted-foreground">
                — preview only, don't save
              </span>
            </span>
          </label>

          <Button
            onClick={handleClassify}
            disabled={loading}
            className="sm:ml-auto"
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
            Live mode — results will be written to the database.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {classified !== null && (
        <div className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier}
                className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <div
                  className={cn(
                    "mb-1 text-3xl font-bold tabular-nums",
                    tier === "Easy"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : tier === "Medium"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400",
                  )}
                >
                  {summary[tier] ?? 0}
                </div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tier}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {classified} problem{classified !== 1 ? "s" : ""} classified
            </span>
            {wasApplied ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Saved to database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Dry run — not saved
              </span>
            )}
          </div>

          {/* Results table */}
          {results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        CF Rating
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Was
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Now
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Solution
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((r) => (
                      <tr
                        key={r.problem_number}
                        className="transition-colors hover:bg-muted/20"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {r.problem_number}
                        </td>
                        <td className="max-w-64 truncate px-4 py-3 font-medium">
                          {r.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {r.cf_rating ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.old ? (
                            <DifficultyBadge label={r.old} />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              none
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DifficultyBadge label={r.new} />
                        </td>
                        <td className="px-4 py-3">
                          {r.had_solution ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              used
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
