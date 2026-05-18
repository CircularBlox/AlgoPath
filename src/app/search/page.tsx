"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Problem = {
  id: string;
  problem_number: number;
  title: string;
  difficulty: string | null;
  platform: string;
  tags: string[];
};

const PLATFORMS = [
  { value: "", label: "All platforms" },
  { value: "LeetCode", label: "LeetCode" },
  { value: "codeforces", label: "Codeforces" },
];

const DIFFICULTIES = [
  { value: "", label: "Any difficulty" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

function difficultyColor(d: string | null) {
  if (!d) return "text-muted-foreground border-border";
  const lower = d.toLowerCase();
  if (lower === "easy")
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/8";
  if (lower === "hard") return "text-red-400 border-red-500/30 bg-red-500/8";
  const num = Number(d);
  if (!Number.isNaN(num)) {
    if (num < 1400)
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/8";
    if (num >= 2000) return "text-red-400 border-red-500/30 bg-red-500/8";
    return "text-amber-400 border-amber-500/30 bg-amber-500/8";
  }
  return "text-amber-400 border-amber-500/30 bg-amber-500/8";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [results, setResults] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query && !platform && !difficulty) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (platform) params.set("platform", platform);
      if (difficulty) params.set("difficulty", difficulty);

      try {
        const res = await fetch(`/api/problems/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else if (res.status === 404) {
          setResults([]);
        } else {
          setError("Search failed. Try again.");
          setResults([]);
        }
      } catch {
        setError("Search failed. Try again.");
        setResults([]);
      }

      setLoading(false);
      setHasSearched(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, platform, difficulty]);

  const hasFilters = query || platform || difficulty;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Search Problems</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find LeetCode and Codeforces problems by title, platform, or
          difficulty.
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPlatform(platform === p.value ? "" : p.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              platform === p.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="h-5 w-px self-center bg-border" />
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDifficulty(difficulty === d.value ? "" : d.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              difficulty === d.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hasFilters && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground/40"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Type a title or pick a filter to start searching.
          </p>
        </div>
      )}

      {hasFilters &&
        !loading &&
        hasSearched &&
        results.length === 0 &&
        !error && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No problems matched your search.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different title or filter.
            </p>
          </div>
        )}

      {results.length > 0 && (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {results.map((problem) => (
            <Link
              key={problem.id}
              href={`/display-problem?p=${problem.problem_number}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
            >
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                #{problem.problem_number}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {problem.title}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                {problem.difficulty && (
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-xs ${difficultyColor(problem.difficulty)}`}
                  >
                    {problem.difficulty}
                  </span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  {problem.platform === "codeforces" ? "CF" : "LC"}
                </span>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Showing {results.length} result{results.length !== 1 ? "s" : ""}
        </p>
      )}
    </main>
  );
}
