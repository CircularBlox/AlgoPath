"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

function InlineCode({ text }: { text: string }) {
  const html = text.replace(
    /\$([^$]+)\$/g,
    '<code class="rounded bg-[oklch(0.87_0_0)] dark:bg-[oklch(0.87_0_0)] px-1 font-mono text-xs">$1</code>',
  );
  // biome-ignore lint/security/noDangerouslySetInnerHtml: admin-authored DB content, $ segments replaced with safe <code> tags
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

type Problem = {
  id: string;
  problem_number: number | null;
  title: string;
  url: string;
  platform: string;
  difficulty: string | null;
  tags: string[];
  content: string | null;
};

type Solution = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  language: string;
  solution_code: string | null;
  explanation: string | null;
};

type Hints = {
  id: string | null;
  problem_name: string;
  problem_number: number;
  hint_1: string | null;
  hint_2: string | null;
  hint_3: string | null;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "results"; problems: Problem[] }
  | { status: "loaded"; problem: Problem; contentOpen: boolean };

type PanelState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "open"; data: T }
  | { status: "closed"; data: T };

export function ProblemViewer() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [solutionState, setSolutionState] = useState<PanelState<Solution>>({
    status: "idle",
  });
  const [hintsState, setHintsState] = useState<PanelState<Hints>>({
    status: "idle",
  });
  const [hintsRevealed, setHintsRevealed] = useState(1);
  const hintsPanelRef = useRef<HTMLDivElement>(null);
  const solutionPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hintsState.status === "open") {
      hintsPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [hintsState.status]);

  useEffect(() => {
    if (solutionState.status === "open") {
      solutionPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [solutionState.status]);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchRandom() {
    setState({ status: "loading" });
    resetPanels();
    try {
      const res = await fetch("/api/problems/random");
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
      } else {
        setState({ status: "loaded", problem: data, contentOpen: false });
      }
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    }
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setState({ status: "loading" });
    resetPanels();
    try {
      const res = await fetch(
        `/api/problems/search?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Unknown error." });
        return;
      }
      const problems: Problem[] = data;
      const exact = problems.find(
        (p) => p.title.toLowerCase() === q.toLowerCase(),
      );
      if (exact) {
        setState({ status: "loaded", problem: exact, contentOpen: false });
      } else {
        setState({ status: "results", problems });
      }
    } catch {
      setState({ status: "error", message: "Failed to reach the server." });
    }
  }

  function selectProblem(problem: Problem) {
    resetPanels();
    setState({ status: "loaded", problem, contentOpen: false });
  }

  function resetPanels() {
    setSolutionState({ status: "idle" });
    setHintsState({ status: "idle" });
    setHintsRevealed(1);
  }

  async function toggleSolution(problemId: string) {
    if (solutionState.status === "open") {
      setSolutionState({ ...solutionState, status: "closed" });
      return;
    }
    if (solutionState.status === "closed") {
      setSolutionState({ ...solutionState, status: "open" });
      return;
    }
    setSolutionState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/problems/${encodeURIComponent(problemId)}/solution`,
      );
      const data = await res.json();
      if (!res.ok) {
        setSolutionState({
          status: "error",
          message: data.error ?? "Unknown error.",
        });
      } else {
        setSolutionState({ status: "open", data });
      }
    } catch {
      setSolutionState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  async function toggleHints(problemId: string) {
    if (hintsState.status === "open") {
      setHintsState({ ...hintsState, status: "closed" });
      return;
    }
    if (hintsState.status === "closed") {
      setHintsState({ ...hintsState, status: "open" });
      return;
    }
    setHintsState({ status: "loading" });
    setHintsRevealed(1);
    try {
      const res = await fetch(
        `/api/problems/${encodeURIComponent(problemId)}/hints`,
      );
      const data = await res.json();
      if (!res.ok) {
        setHintsState({
          status: "error",
          message: data.error ?? "Unknown error.",
        });
      } else {
        setHintsState({ status: "open", data });
      }
    } catch {
      setHintsState({
        status: "error",
        message: "Failed to reach the server.",
      });
    }
  }

  const isLoading = state.status === "loading";

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by problem title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={isLoading}
            className="max-w-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            variant="outline"
          >
            Search
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button
          onClick={fetchRandom}
          disabled={isLoading}
          className="self-start"
        >
          {isLoading ? "Loading…" : "Find Random Problem"}
        </Button>
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      {/* Search results list */}
      {state.status === "results" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {state.problems.length} result
            {state.problems.length !== 1 ? "s" : ""} — click to open
          </p>
          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {state.problems.map((problem) => {
              const visibleTags = problem.tags?.slice(0, 3) ?? [];
              const extraTags =
                (problem.tags?.length ?? 0) - visibleTags.length;
              return (
                <button
                  key={problem.id}
                  type="button"
                  onClick={() => selectProblem(problem)}
                  className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {problem.problem_number != null && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          #{problem.problem_number}
                        </span>
                      )}
                      <span className="truncate text-sm font-medium">
                        {problem.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {problem.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {problem.difficulty}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {problem.platform === "codeforces" ? "CF" : "LC"}
                      </Badge>
                    </div>
                  </div>
                  {visibleTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {extraTags > 0 && (
                        <span className="text-xs text-muted-foreground">
                          +{extraTags} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loaded problem */}
      {state.status === "loaded" &&
        (() => {
          const { problem, contentOpen } = state;
          const platformLabel =
            problem.platform === "codeforces" ? "Codeforces" : "LeetCode";
          const solutionOpen = solutionState.status === "open";
          const solutionLoading = solutionState.status === "loading";
          const hintsOpen = hintsState.status === "open";
          const hintsLoading = hintsState.status === "loading";

          return (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-lg">{problem.title}</CardTitle>
                      {problem.problem_number != null && (
                        <span className="text-xs text-muted-foreground">
                          Problem #{problem.problem_number}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {platformLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {problem.difficulty && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Difficulty</span>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </div>
                  )}
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Tags
                      </span>
                      {problem.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm break-all text-muted-foreground">
                    {problem.url}
                  </div>
                </CardContent>

                <CardFooter className="flex-wrap gap-2">
                  {problem.content && (
                    <Button
                      onClick={() =>
                        setState({ ...state, contentOpen: !contentOpen })
                      }
                    >
                      {contentOpen ? "Hide Problem" : "Open Problem"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => toggleHints(problem.id)}
                    disabled={hintsLoading}
                  >
                    {hintsLoading
                      ? "Loading…"
                      : hintsOpen
                        ? "Hide Hints"
                        : "Show Hints"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toggleSolution(problem.id)}
                    disabled={solutionLoading}
                  >
                    {solutionLoading
                      ? "Loading…"
                      : solutionOpen
                        ? "Hide Solution"
                        : "Show Solution"}
                  </Button>
                  <Button
                    variant={problem.content ? "outline" : "default"}
                    asChild
                  >
                    <Link
                      href={problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Link
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={fetchRandom}
                    className="ml-auto"
                  >
                    Next Problem
                  </Button>
                </CardFooter>
              </Card>

              {contentOpen && problem.content && (
                <div className="cf-problem rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm">
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: content is authored by the site admin and stored in our own DB */}
                  <div dangerouslySetInnerHTML={{ __html: problem.content }} />
                </div>
              )}

              {/* Hints panel */}
              {hintsOpen &&
                hintsState.status === "open" &&
                (() => {
                  const { data: hints } = hintsState;
                  const allNull =
                    !hints.hint_1 && !hints.hint_2 && !hints.hint_3;
                  const hintValues = [hints.hint_1, hints.hint_2, hints.hint_3];
                  const maxRevealable = hintValues.filter(Boolean).length;
                  const canRevealMore =
                    hintsRevealed < 3 && hintsRevealed < maxRevealable;

                  return (
                    <div
                      ref={hintsPanelRef}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
                    >
                      <h3 className="font-semibold">Hints</h3>
                      {allNull ? (
                        <p className="text-sm text-muted-foreground">
                          No hints available yet.
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3">
                            {(
                              [
                                { n: 1, text: hints.hint_1 },
                                { n: 2, text: hints.hint_2 },
                                { n: 3, text: hints.hint_3 },
                              ] as const
                            ).map(({ n, text }) => {
                              if (!text || n > hintsRevealed) return null;
                              return (
                                <div
                                  key={`hint-${n}`}
                                  className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-4 py-3"
                                >
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Hint {n}
                                  </span>
                                  <p className="text-sm leading-relaxed">
                                    <InlineCode text={text} />
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                          {canRevealMore && (
                            <Button
                              variant="outline"
                              className="self-start"
                              onClick={() =>
                                setHintsRevealed((r) => Math.min(r + 1, 3))
                              }
                            >
                              Reveal Hint {hintsRevealed + 1}
                            </Button>
                          )}
                          {!canRevealMore && maxRevealable > 0 && (
                            <p className="text-xs text-muted-foreground">
                              All hints revealed.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

              {/* Solution panel */}
              {solutionState.status === "error" && (
                <p className="text-sm text-destructive">
                  {solutionState.message}
                </p>
              )}
              {hintsState.status === "error" && (
                <p className="text-sm text-destructive">{hintsState.message}</p>
              )}

              {solutionOpen &&
                solutionState.status === "open" &&
                (() => {
                  const { data: solution } = solutionState;
                  const hasContent =
                    solution.solution_code || solution.explanation;

                  return (
                    <div
                      ref={solutionPanelRef}
                      className="flex flex-col gap-4 rounded-xl border border-border bg-card px-6 py-5 text-card-foreground shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Solution</h3>
                        <Badge variant="secondary">{solution.language}</Badge>
                      </div>
                      {!hasContent && (
                        <p className="text-sm text-muted-foreground">
                          No solution available yet.
                        </p>
                      )}
                      {solution.solution_code && (
                        <pre className="overflow-x-auto rounded-md border border-[var(--color-code-border)] bg-[var(--color-code-background)] px-4 py-3 text-sm whitespace-pre-wrap">
                          {solution.solution_code}
                        </pre>
                      )}
                      {solution.explanation && (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">
                            Explanation
                          </span>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            <InlineCode text={solution.explanation} />
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
            </>
          );
        })()}
    </div>
  );
}
