"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";

interface ClassificationResult {
  problem_number: number;
  old: string | null;
  new: string;
  cf_rating: number | null;
}

export default function ClassifyDifficultyPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const handleClassify = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary({});

    try {
      const response = await fetch("/api/admin/classify-difficulty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to classify");
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Classify Problem Difficulty</h1>
        <p className="text-muted-foreground">
          Use AI to automatically classify problems with numeric CF ratings into
          Easy, Medium, or Hard.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-md">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">
            Dry run (preview only, don't save changes)
          </span>
        </label>

        <Button
          onClick={handleClassify}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? "Classifying..." : "Start Classification"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-red-600">
          Error: {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(summary).map(([tier, count]) => (
                <div key={tier} className="text-center">
                  <div className="text-2xl font-bold text-primary">{count}</div>
                  <div className="text-xs text-muted-foreground">{tier}</div>
                </div>
              ))}
            </div>
            {dryRun && (
              <p className="text-xs text-muted-foreground mt-4">
                🔒 Dry run mode — no changes were saved
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Problem #
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Old</th>
                    <th className="px-4 py-3 text-left font-semibold">New</th>
                    <th className="px-4 py-3 text-left font-semibold">
                      CF Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.problem_number}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono">
                        {r.problem_number}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.old || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {r.new}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.cf_rating || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
